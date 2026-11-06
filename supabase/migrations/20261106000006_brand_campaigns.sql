-- Shopfluence — Phase 5: Brand portal
-- Campaigns (platform-approved), applications, invitations, participants, deliverables.
-- Organisation isolation: every brand-side read/write is scoped by organization membership role.

create type public.campaign_status as enum ('draft', 'pending_approval', 'open', 'in_progress', 'completed', 'paused', 'cancelled');

create table public.campaigns (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  brand_profile_id      uuid references public.profiles(id) on delete set null,
  title                 text not null check (char_length(title) between 3 and 120),
  objective             text not null check (objective in ('awareness','traffic','sales','launch')),
  brief                 text not null default '' check (char_length(brief) <= 5000),
  type                  text not null check (type in ('affiliate','fixed_fee','hybrid')),
  currency              char(3) not null,
  budget                numeric(14,2) check (budget is null or budget > 0),
  fixed_fee             numeric(14,2) check (fixed_fee is null or fixed_fee > 0),
  commission_bps        integer check (commission_bps is null or commission_bps between 1 and 10000),
  countries             char(2)[] not null default '{}',
  categories            text[] not null default '{}',
  min_followers         integer not null default 0 check (min_followers >= 0),
  deliverables          jsonb not null default '[]'::jsonb,   -- [{kind:'post'|'video'|'carousel', count:int}]
  required_disclosure   public.disclosure_type not null default 'sponsored' check (required_disclosure <> 'none'),
  product_ids           uuid[] not null default '{}',
  application_deadline  timestamptz,
  starts_at             timestamptz,
  ends_at               timestamptz,
  status                public.campaign_status not null default 'draft',
  rejection_note        text,
  approved_by           uuid references auth.users(id),
  created_by            uuid not null references auth.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check ((type = 'affiliate' and commission_bps is not null) or (type = 'fixed_fee' and fixed_fee is not null) or (type = 'hybrid' and fixed_fee is not null and commission_bps is not null))
);
create index campaigns_org_idx on public.campaigns(organization_id, created_at desc);
create index campaigns_open_idx on public.campaigns(status) where status in ('open','in_progress');
create trigger campaigns_updated before update on public.campaigns for each row execute function public.set_updated_at();
alter table public.campaigns enable row level security;

create policy "org members read campaigns" on public.campaigns for select using (public.is_org_member(organization_id, 'analyst') or public.is_staff());
create policy "creators see open campaigns" on public.campaigns for select using (status in ('open','in_progress') and auth.uid() is not null);
create policy "org managers create drafts" on public.campaigns for insert
  with check (public.is_org_member(organization_id, 'manager') and status = 'draft' and created_by = auth.uid() and approved_by is null);
create policy "org managers edit" on public.campaigns for update
  using (public.is_org_member(organization_id, 'manager'))
  with check (public.is_org_member(organization_id, 'manager'));
create policy "staff review campaigns" on public.campaigns for update using (public.is_staff()) with check (public.is_staff());
create policy "org admins delete drafts" on public.campaigns for delete using (public.is_org_member(organization_id, 'admin') and status = 'draft');

-- Status machine enforced server-side. Brands may: draft→pending_approval, open↔paused, open/paused→in_progress,
-- in_progress→completed, any non-final→cancelled, pending_approval→draft (withdraw). Only staff: pending_approval→open|draft.
create or replace function public.guard_campaign_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if new.status = old.status then
    if old.status not in ('draft') and not public.is_staff()
       and (new.type, new.currency, new.budget, new.fixed_fee, new.commission_bps, new.required_disclosure, new.min_followers)
           is distinct from (old.type, old.currency, old.budget, old.fixed_fee, old.commission_bps, old.required_disclosure, old.min_followers) then
      raise exception 'campaign terms are locked after submission' using errcode = '42501';
    end if;
    return new;
  end if;
  if public.is_staff() and old.status = 'pending_approval' and new.status in ('open','draft') then
    new.approved_by := case when new.status = 'open' then auth.uid() else null end;
    perform public.audit('campaign.' || new.status, 'campaign', new.id::text, new.organization_id, jsonb_build_object('note', new.rejection_note));
    return new;
  end if;
  ok := (old.status, new.status) in (
    ('draft','pending_approval'), ('pending_approval','draft'), ('open','paused'), ('paused','open'),
    ('open','in_progress'), ('paused','in_progress'), ('in_progress','completed'),
    ('draft','cancelled'), ('pending_approval','cancelled'), ('open','cancelled'), ('paused','cancelled'), ('in_progress','cancelled'));
  if not ok then raise exception 'invalid campaign status transition % → %', old.status, new.status using errcode = '42501'; end if;
  perform public.audit('campaign.' || new.status, 'campaign', new.id::text, new.organization_id, '{}'::jsonb);
  return new;
end $$;
create trigger campaigns_guard_status before update on public.campaigns for each row execute function public.guard_campaign_status();

-- ---------------------------------------------------------------------------
create table public.campaign_applications (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.campaigns(id) on delete cascade,
  creator_id    uuid not null references public.profiles(id) on delete cascade,
  pitch         text not null default '' check (char_length(pitch) <= 2000),
  proposed_fee  numeric(14,2) check (proposed_fee is null or proposed_fee > 0),
  status        text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
  reviewed_by   uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  unique (campaign_id, creator_id)
);
alter table public.campaign_applications enable row level security;
create policy "creator reads own applications" on public.campaign_applications for select using (public.can_act_as(creator_id));
create policy "org reads applications" on public.campaign_applications for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_org_member(c.organization_id, 'analyst')));
-- writes via RPCs below

create table public.campaign_invitations (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  creator_id   uuid not null references public.profiles(id) on delete cascade,
  message      text not null default '' check (char_length(message) <= 1000),
  status       text not null default 'sent' check (status in ('sent','accepted','declined','revoked')),
  invited_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  unique (campaign_id, creator_id)
);
alter table public.campaign_invitations enable row level security;
create policy "creator reads own invitations" on public.campaign_invitations for select using (public.can_act_as(creator_id));
create policy "org reads invitations" on public.campaign_invitations for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_org_member(c.organization_id, 'analyst')));

create table public.campaign_participants (
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  creator_id   uuid not null references public.profiles(id) on delete cascade,
  source       text not null check (source in ('application','invitation')),
  agreed_fee   numeric(14,2),
  status       text not null default 'active' check (status in ('active','completed','removed')),
  joined_at    timestamptz not null default now(),
  primary key (campaign_id, creator_id)
);
alter table public.campaign_participants enable row level security;
create policy "participant reads own" on public.campaign_participants for select using (public.can_act_as(creator_id));
create policy "org reads participants" on public.campaign_participants for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_org_member(c.organization_id, 'analyst')));

create table public.campaign_deliverables (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  creator_id   uuid not null references public.profiles(id) on delete cascade,
  post_id      uuid not null references public.posts(id) on delete cascade,
  note         text not null default '' check (char_length(note) <= 1000),
  status       text not null default 'submitted' check (status in ('submitted','approved','changes_requested')),
  feedback     text,
  reviewed_by  uuid references auth.users(id),
  submitted_at timestamptz not null default now(),
  reviewed_at  timestamptz,
  unique (campaign_id, post_id)
);
alter table public.campaign_deliverables enable row level security;
create policy "creator reads own deliverables" on public.campaign_deliverables for select using (public.can_act_as(creator_id));
create policy "org reads deliverables" on public.campaign_deliverables for select
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and public.is_org_member(c.organization_id, 'analyst')));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.creator_eligible(_campaign public.campaigns, _creator uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = _creator and p.kind = 'person' and p.is_creator and p.deleted_at is null
      and p.follower_count >= _campaign.min_followers
      and (cardinality(_campaign.countries) = 0 or p.country = any(_campaign.countries))
      -- conflict of interest: members of the brand's own organisation cannot take part
      and not exists (select 1 from public.organization_members m where m.organization_id = _campaign.organization_id and m.user_id = p.user_id)
  );
$$;

create or replace function public.apply_to_campaign(_campaign uuid, _creator uuid, _pitch text, _fee numeric default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare c public.campaigns; app uuid;
begin
  if not public.can_act_as(_creator) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into c from public.campaigns where id = _campaign;
  if c.status is distinct from 'open' then raise exception 'campaign_not_open' using errcode = '42501'; end if;
  if c.application_deadline is not null and c.application_deadline < now() then raise exception 'deadline_passed' using errcode = '42501'; end if;
  if not public.creator_eligible(c, _creator) then raise exception 'not_eligible' using errcode = '42501'; end if;
  insert into public.campaign_applications(campaign_id, creator_id, pitch, proposed_fee) values (_campaign, _creator, coalesce(_pitch, ''), _fee)
    on conflict (campaign_id, creator_id) do update set pitch = excluded.pitch, proposed_fee = excluded.proposed_fee, status = 'pending', created_at = now()
    where campaign_applications.status = 'withdrawn'
    returning id into app;
  if app is null then raise exception 'already_applied' using errcode = '23505'; end if;
  return app;
end $$;

create or replace function public.withdraw_application(_app uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.campaign_applications set status = 'withdrawn' where id = _app and status = 'pending' and public.can_act_as(creator_id);
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
end $$;

create or replace function public.review_application(_app uuid, _accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare a public.campaign_applications; c public.campaigns;
begin
  select * into a from public.campaign_applications where id = _app for update;
  select * into c from public.campaigns where id = a.campaign_id;
  if not public.is_org_member(c.organization_id, 'manager') then raise exception 'forbidden' using errcode = '42501'; end if;
  if a.status <> 'pending' then raise exception 'invalid_state' using errcode = '22023'; end if;
  update public.campaign_applications set status = case when _accept then 'accepted' else 'rejected' end, reviewed_by = auth.uid() where id = _app;
  if _accept then
    insert into public.campaign_participants(campaign_id, creator_id, source, agreed_fee) values (a.campaign_id, a.creator_id, 'application', coalesce(a.proposed_fee, c.fixed_fee))
      on conflict do nothing;
  end if;
  perform public.audit(case when _accept then 'application.accept' else 'application.reject' end, 'campaign_application', _app::text, c.organization_id, '{}'::jsonb);
end $$;

create or replace function public.invite_creator(_campaign uuid, _creator uuid, _message text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c public.campaigns; inv uuid;
begin
  select * into c from public.campaigns where id = _campaign;
  if not public.is_org_member(c.organization_id, 'manager') then raise exception 'forbidden' using errcode = '42501'; end if;
  if c.status not in ('open','in_progress','paused') then raise exception 'campaign_not_open' using errcode = '42501'; end if;
  if not public.creator_eligible(c, _creator) then raise exception 'not_eligible' using errcode = '42501'; end if;
  insert into public.campaign_invitations(campaign_id, creator_id, message, invited_by) values (_campaign, _creator, coalesce(_message, ''), auth.uid())
    on conflict (campaign_id, creator_id) do nothing returning id into inv;
  if inv is null then raise exception 'already_invited' using errcode = '23505'; end if;
  insert into public.notifications(user_profile_id, type, actor_id, body) values (_creator, 'system', c.brand_profile_id, left('Campaign invitation: ' || c.title, 120));
  return inv;
end $$;

create or replace function public.respond_invitation(_inv uuid, _accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare i public.campaign_invitations; c public.campaigns;
begin
  select * into i from public.campaign_invitations where id = _inv for update;
  if not public.can_act_as(i.creator_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if i.status <> 'sent' then raise exception 'invalid_state' using errcode = '22023'; end if;
  select * into c from public.campaigns where id = i.campaign_id;
  if _accept and c.status not in ('open','in_progress','paused') then raise exception 'campaign_not_open' using errcode = '42501'; end if;
  update public.campaign_invitations set status = case when _accept then 'accepted' else 'declined' end where id = _inv;
  if _accept then
    insert into public.campaign_participants(campaign_id, creator_id, source, agreed_fee) values (i.campaign_id, i.creator_id, 'invitation', c.fixed_fee) on conflict do nothing;
  end if;
end $$;

-- Deliverable must be the participant's own published post carrying the campaign's required disclosure.
create or replace function public.submit_deliverable(_campaign uuid, _creator uuid, _post uuid, _note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c public.campaigns; p public.posts; d uuid;
begin
  if not public.can_act_as(_creator) then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.campaign_participants where campaign_id = _campaign and creator_id = _creator and status = 'active') then
    raise exception 'not_participant' using errcode = '42501';
  end if;
  select * into c from public.campaigns where id = _campaign;
  select * into p from public.posts where id = _post;
  if p.author_id is distinct from _creator or p.status <> 'published' then raise exception 'invalid_post' using errcode = '22023'; end if;
  if p.disclosure is distinct from c.required_disclosure then raise exception 'disclosure_mismatch' using errcode = '22023'; end if;
  insert into public.campaign_deliverables(campaign_id, creator_id, post_id, note) values (_campaign, _creator, _post, coalesce(_note, ''))
    on conflict (campaign_id, post_id) do update set status = 'submitted', note = excluded.note, submitted_at = now(), feedback = null
    where campaign_deliverables.status = 'changes_requested'
    returning id into d;
  if d is null then raise exception 'already_submitted' using errcode = '23505'; end if;
  return d;
end $$;

create or replace function public.review_deliverable(_d uuid, _approve boolean, _feedback text) returns void
language plpgsql security definer set search_path = public as $$
declare dl public.campaign_deliverables; c public.campaigns;
begin
  select * into dl from public.campaign_deliverables where id = _d for update;
  select * into c from public.campaigns where id = dl.campaign_id;
  if not public.is_org_member(c.organization_id, 'manager') then raise exception 'forbidden' using errcode = '42501'; end if;
  if dl.status <> 'submitted' then raise exception 'invalid_state' using errcode = '22023'; end if;
  update public.campaign_deliverables set status = case when _approve then 'approved' else 'changes_requested' end, feedback = _feedback,
    reviewed_by = auth.uid(), reviewed_at = now() where id = _d;
  perform public.audit(case when _approve then 'deliverable.approve' else 'deliverable.changes' end, 'deliverable', _d::text, c.organization_id, '{}'::jsonb);
end $$;

-- Add a team member by username (org admins only; never as owner)
create or replace function public.add_org_member(_org uuid, _username text, _role public.org_role) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_org_member(_org, 'admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  if _role = 'owner' then raise exception 'cannot assign owner' using errcode = '42501'; end if;
  select user_id into uid from public.profiles where username = _username and kind = 'person';
  if uid is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  insert into public.organization_members(organization_id, user_id, role, invited_by) values (_org, uid, _role, auth.uid())
    on conflict (organization_id, user_id) do update set role = excluded.role where organization_members.role <> 'owner';
  perform public.audit('org.member', 'organization', _org::text, _org, jsonb_build_object('user', uid, 'role', _role));
end $$;

-- Org registration: organization + brand profile in one step
create or replace function public.register_brand(_name text, _slug text, _country char(2), _website text, _username text) returns uuid
language plpgsql security definer set search_path = public as $$
declare org uuid; prof uuid;
begin
  if auth.uid() is null then raise exception 'auth_required' using errcode = '42501'; end if;
  insert into public.organizations(name, slug, country, website, created_by) values (_name, _slug, upper(_country), nullif(_website, ''), auth.uid()) returning id into org;
  insert into public.profiles(kind, organization_id, username, display_name, country) values ('brand', org, _username, _name, upper(_country)) returning id into prof;
  insert into public.brand_profiles(profile_id, organization_id) values (prof, org);
  return org;
end $$;
