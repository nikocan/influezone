-- Shopfluence — Phase 1: Foundation
-- Profiles, platform roles, organizations (scoped membership), preferences, consents, audit log.
-- All tables have RLS enabled. Privileged changes go through SECURITY DEFINER functions or the service role.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Platform roles (admin / moderator / support). Never self-assignable.
-- ---------------------------------------------------------------------------
create type public.platform_role as enum ('admin', 'moderator', 'support');

create table public.user_roles (
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.platform_role not null,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_role public.platform_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = _role);
$$;

create or replace function public.is_service_role() returns boolean
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  ) = 'service_role';
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'moderator', 'support'));
$$;

create policy "read own roles" on public.user_roles for select using (user_id = auth.uid() or public.has_role('admin'));
-- No insert/update/delete policies: only service role or admin RPC can grant roles.

-- ---------------------------------------------------------------------------
-- Organizations (brands / merchants / agencies) with scoped membership
-- ---------------------------------------------------------------------------
create type public.org_kind as enum ('brand', 'merchant', 'agency');
create type public.org_role as enum ('owner', 'admin', 'manager', 'analyst', 'member');
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');

create table public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  kind                public.org_kind not null default 'brand',
  name                text not null check (char_length(name) between 2 and 120),
  slug                citext not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  website             text,
  country             char(2) not null,
  legal_name          text,
  tax_id_last4        text,
  verification_status public.verification_status not null default 'unverified',
  created_by          uuid not null references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create trigger organizations_updated before update on public.organizations for each row execute function public.set_updated_at();
alter table public.organizations enable row level security;

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            public.org_role not null default 'member',
  invited_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members(user_id);
alter table public.organization_members enable row level security;

create or replace function public.org_role_of(_org uuid) returns public.org_role
language sql stable security definer set search_path = public as $$
  select role from public.organization_members where organization_id = _org and user_id = auth.uid();
$$;

create or replace function public.is_org_member(_org uuid, _min public.org_role default 'member') returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = _org and m.user_id = auth.uid()
      and array_position(array['member','analyst','manager','admin','owner']::public.org_role[], m.role)
          >= array_position(array['member','analyst','manager','admin','owner']::public.org_role[], _min)
  );
$$;

create policy "members read their orgs" on public.organizations for select
  using (deleted_at is null and (public.is_org_member(id) or public.is_staff()));
create policy "verified orgs are public" on public.organizations for select
  using (deleted_at is null and verification_status = 'verified');
create policy "users create orgs" on public.organizations for insert
  with check (created_by = auth.uid() and verification_status = 'unverified');
create policy "org admins update" on public.organizations for update
  using (public.is_org_member(id, 'admin'))
  with check (public.is_org_member(id, 'admin'));
-- verification_status can only be changed by staff (enforced by trigger below)

create or replace function public.guard_org_verification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.verification_status is distinct from old.verification_status and not public.is_staff()
     and not public.is_service_role() then
    raise exception 'verification_status can only be changed by staff' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger organizations_guard_verification before update on public.organizations
  for each row execute function public.guard_org_verification();

-- creator becomes owner of an org they create
create or replace function public.add_org_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.organization_members(organization_id, user_id, role) values (new.id, new.created_by, 'owner');
  return new;
end $$;
create trigger organizations_owner after insert on public.organizations for each row execute function public.add_org_owner();

create policy "members see co-members" on public.organization_members for select
  using (public.is_org_member(organization_id) or public.is_staff());
create policy "org admins manage members" on public.organization_members for insert
  with check (public.is_org_member(organization_id, 'admin') and role <> 'owner');
create policy "org admins change members" on public.organization_members for update
  using (public.is_org_member(organization_id, 'admin'))
  with check (public.is_org_member(organization_id, 'admin') and role <> 'owner');
create policy "org admins remove members or self-leave" on public.organization_members for delete
  using ((public.is_org_member(organization_id, 'admin') and role <> 'owner') or (user_id = auth.uid() and role <> 'owner'));

-- ---------------------------------------------------------------------------
-- Profiles (people and brand pages share one public identity space)
-- ---------------------------------------------------------------------------
create type public.profile_kind as enum ('person', 'brand');

create table public.profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid unique references auth.users(id) on delete cascade,
  organization_id      uuid references public.organizations(id) on delete cascade,
  kind                 public.profile_kind not null default 'person',
  username             citext not null unique check (username ~ '^[a-z0-9_.]{3,30}$'),
  display_name         text not null check (char_length(display_name) between 1 and 60),
  avatar_url           text,
  bio                  text not null default '' check (char_length(bio) <= 300),
  website              text check (website is null or website ~ '^https://'),
  country              char(2) not null default 'TR',
  locale               text not null default 'tr',
  interests            text[] not null default '{}',
  is_creator           boolean not null default false,
  verified             boolean not null default false,
  is_private           boolean not null default false,
  onboarding_completed boolean not null default false,
  follower_count       integer not null default 0 check (follower_count >= 0),
  following_count      integer not null default 0 check (following_count >= 0),
  post_count           integer not null default 0 check (post_count >= 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  constraint profile_owner check (
    (kind = 'person' and user_id is not null and organization_id is null and id = user_id)
    or (kind = 'brand' and organization_id is not null and user_id is null)
  )
);
create index profiles_country_idx on public.profiles(country) where deleted_at is null;
create index profiles_creator_idx on public.profiles(follower_count desc) where is_creator and deleted_at is null;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
alter table public.profiles enable row level security;

-- Can the current user act as (post/comment/message as) this profile?
create or replace function public.can_act_as(_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = _profile and p.deleted_at is null
      and (p.user_id = auth.uid() or (p.organization_id is not null and public.is_org_member(p.organization_id, 'manager')))
  );
$$;

create policy "profiles are public" on public.profiles for select using (deleted_at is null or public.is_staff());
create policy "owner updates profile" on public.profiles for update
  using (public.can_act_as(id)) with check (public.can_act_as(id));
create policy "org admins create brand profile" on public.profiles for insert
  with check (kind = 'brand' and public.is_org_member(organization_id, 'admin'));

-- protect server-managed columns
create or replace function public.guard_profile_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() or public.is_staff() then
    return new;
  end if;
  if new.verified is distinct from old.verified
     or new.follower_count is distinct from old.follower_count and pg_trigger_depth() <= 1
     or new.following_count is distinct from old.following_count and pg_trigger_depth() <= 1
     or new.post_count is distinct from old.post_count and pg_trigger_depth() <= 1
     or new.user_id is distinct from old.user_id
     or new.organization_id is distinct from old.organization_id
     or new.kind is distinct from old.kind then
    raise exception 'protected profile column' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile_columns();

-- ---------------------------------------------------------------------------
-- Role-specific extensions
-- ---------------------------------------------------------------------------
create table public.creator_profiles (
  profile_id          uuid primary key references public.profiles(id) on delete cascade,
  niches              text[] not null default '{}',
  platforms           jsonb not null default '[]'::jsonb,  -- [{platform, handle, verified:false}]
  audience_countries  char(2)[] not null default '{}',
  verification_status public.verification_status not null default 'unverified',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create trigger creator_profiles_updated before update on public.creator_profiles for each row execute function public.set_updated_at();
alter table public.creator_profiles enable row level security;
create policy "creator profiles public" on public.creator_profiles for select using (true);
create policy "creator edits own" on public.creator_profiles for insert with check (public.can_act_as(profile_id) and verification_status = 'unverified');
create policy "creator updates own" on public.creator_profiles for update using (public.can_act_as(profile_id))
  with check (public.can_act_as(profile_id));

create or replace function public.guard_creator_verification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.verification_status is distinct from old.verification_status and not public.is_staff()
     and not (old.verification_status in ('unverified','rejected') and new.verification_status = 'pending') then
    raise exception 'verification_status is staff-managed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger creator_profiles_guard before update on public.creator_profiles for each row execute function public.guard_creator_verification();

create table public.brand_profiles (
  profile_id      uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  categories      text[] not null default '{}',
  ships_to        char(2)[] not null default '{}',
  created_at      timestamptz not null default now()
);
alter table public.brand_profiles enable row level security;
create policy "brand profiles public" on public.brand_profiles for select using (true);
create policy "org admins manage brand profile" on public.brand_profiles for all
  using (public.is_org_member(organization_id, 'admin')) with check (public.is_org_member(organization_id, 'admin'));

-- ---------------------------------------------------------------------------
-- Preferences & consent
-- ---------------------------------------------------------------------------
create table public.user_preferences (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  theme                text not null default 'system' check (theme in ('light','dark','system')),
  locale               text not null default 'tr',
  country              char(2) not null default 'TR',
  currency             char(3) not null default 'TRY',
  autoplay             text not null default 'wifi' check (autoplay in ('always','wifi','never')),
  reduce_motion        boolean not null default false,
  captions_default     boolean not null default true,
  dm_policy            text not null default 'followers' check (dm_policy in ('everyone','followers','nobody')),
  notification_prefs   jsonb not null default '{}'::jsonb,
  updated_at           timestamptz not null default now()
);
create trigger user_preferences_updated before update on public.user_preferences for each row execute function public.set_updated_at();
alter table public.user_preferences enable row level security;
create policy "own preferences" on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.consents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('terms','privacy','marketing','creator_terms','brand_terms','analytics')),
  version     text not null,
  granted     boolean not null,
  created_at  timestamptz not null default now()
);
create index consents_user_idx on public.consents(user_id, kind, created_at desc);
alter table public.consents enable row level security;
create policy "own consents read" on public.consents for select using (user_id = auth.uid());
create policy "own consents append" on public.consents for insert with check (user_id = auth.uid());
-- append-only: no update/delete policies

-- ---------------------------------------------------------------------------
-- Audit log (append-only, staff-readable)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users(id),
  action      text not null,
  entity_type text not null,
  entity_id   text,
  org_id      uuid references public.organizations(id),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
alter table public.audit_logs enable row level security;
create policy "staff read audit" on public.audit_logs for select using (public.has_role('admin') or public.has_role('moderator'));
create policy "org admins read org audit" on public.audit_logs for select using (org_id is not null and public.is_org_member(org_id, 'admin'));

create or replace function public.audit(_action text, _entity_type text, _entity_id text, _org uuid default null, _meta jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, org_id, metadata)
  values (auth.uid(), _action, _entity_type, _entity_id, _org, _meta);
$$;

-- ---------------------------------------------------------------------------
-- New user bootstrap: profile + preferences + consent from sign-up metadata
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  uname text := lower(coalesce(meta->>'username', ''));
begin
  if uname !~ '^[a-z0-9_.]{3,30}$' or exists (select 1 from public.profiles where username = uname) then
    uname := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;
  insert into public.profiles(id, user_id, kind, username, display_name, country, locale)
  values (new.id, new.id, 'person', uname,
          left(coalesce(nullif(meta->>'display_name', ''), meta->>'full_name', uname), 60),
          upper(coalesce(nullif(meta->>'country', ''), 'TR')),
          coalesce(nullif(meta->>'locale', ''), 'tr'));
  insert into public.user_preferences(user_id, locale, country)
  values (new.id, coalesce(nullif(meta->>'locale', ''), 'tr'), upper(coalesce(nullif(meta->>'country', ''), 'TR')));
  if meta ? 'terms_version' then
    insert into public.consents(user_id, kind, version, granted) values
      (new.id, 'terms', meta->>'terms_version', true),
      (new.id, 'privacy', meta->>'terms_version', true),
      (new.id, 'marketing', meta->>'terms_version', coalesce((meta->>'marketing_opt_in')::boolean, false));
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Admin RPC: grant / revoke platform roles (audited)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_role(_user uuid, _role public.platform_role, _grant boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('admin') then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if _grant then
    insert into public.user_roles(user_id, role, granted_by) values (_user, _role, auth.uid()) on conflict do nothing;
  else
    delete from public.user_roles where user_id = _user and role = _role;
  end if;
  perform public.audit(case when _grant then 'role.grant' else 'role.revoke' end, 'user', _user::text, null, jsonb_build_object('role', _role));
end $$;
