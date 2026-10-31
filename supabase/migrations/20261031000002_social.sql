-- Shopfluence — Phase 2: Social graph, posts, media, product tags, engagement, messaging, moderation.

-- ---------------------------------------------------------------------------
-- Blocks & mutes (needed by visibility helpers)
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks(blocked_id);
alter table public.blocks enable row level security;
create policy "own blocks" on public.blocks for all using (public.can_act_as(blocker_id)) with check (public.can_act_as(blocker_id));

create table public.mutes (
  muter_id   uuid not null references public.profiles(id) on delete cascade,
  muted_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);
alter table public.mutes enable row level security;
create policy "own mutes" on public.mutes for all using (public.can_act_as(muter_id)) with check (public.can_act_as(muter_id));

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

-- ---------------------------------------------------------------------------
-- Follows
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows(followee_id, created_at desc);
alter table public.follows enable row level security;
create policy "follows are public" on public.follows for select using (true);
create policy "follow as self" on public.follows for insert
  with check (public.can_act_as(follower_id) and not public.is_blocked_between(follower_id, followee_id));
create policy "unfollow as self" on public.follows for delete using (public.can_act_as(follower_id));

create or replace function public.follows_counter() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set follower_count = follower_count + 1 where id = new.followee_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    insert into public.notifications(user_profile_id, type, actor_id) values (new.followee_id, 'follow', new.follower_id);
  else
    update public.profiles set follower_count = greatest(follower_count - 1, 0) where id = old.followee_id;
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
  end if;
  return null;
end $$;

-- block removes follow edges both ways
create or replace function public.blocks_cleanup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.follows where (follower_id = new.blocker_id and followee_id = new.blocked_id)
                                or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return null;
end $$;
create trigger blocks_after_insert after insert on public.blocks for each row execute function public.blocks_cleanup();

-- ---------------------------------------------------------------------------
-- Posts, media, product tags
-- ---------------------------------------------------------------------------
create type public.post_type as enum ('photo', 'carousel', 'video');
create type public.post_status as enum ('draft', 'scheduled', 'published', 'removed');
create type public.disclosure_type as enum ('none', 'affiliate', 'sponsored', 'gifted');

create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  type          public.post_type not null,
  caption       text not null default '' check (char_length(caption) <= 2200),
  hashtags      text[] not null default '{}',
  disclosure    public.disclosure_type not null default 'none',
  category      text,
  country       char(2),
  status        public.post_status not null default 'draft',
  scheduled_at  timestamptz,
  published_at  timestamptz,
  like_count    integer not null default 0 check (like_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  save_count    integer not null default 0 check (save_count >= 0),
  share_count   integer not null default 0 check (share_count >= 0),
  view_count    bigint  not null default 0 check (view_count >= 0),
  removed_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (status <> 'scheduled' or scheduled_at is not null)
);
create index posts_author_idx on public.posts(author_id, created_at desc);
create index posts_published_idx on public.posts(published_at desc) where status = 'published';
create index posts_category_idx on public.posts(category, published_at desc) where status = 'published';
create index posts_hashtags_idx on public.posts using gin(hashtags);
create trigger posts_updated before update on public.posts for each row execute function public.set_updated_at();
alter table public.posts enable row level security;

create or replace function public.can_view_post(_post public.posts) returns boolean
language sql stable security definer set search_path = public as $$
  select
    public.can_act_as(_post.author_id)
    or public.is_staff()
    or (
      _post.status = 'published'
      and not exists (select 1 from public.blocks b where (b.blocker_id = _post.author_id and b.blocked_id = auth.uid())
                                                     or (b.blocker_id = auth.uid() and b.blocked_id = _post.author_id))
      and (
        not (select is_private from public.profiles where id = _post.author_id)
        or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = _post.author_id)
      )
    );
$$;

create policy "view visible posts" on public.posts for select using (public.can_view_post(posts));
create policy "author creates" on public.posts for insert
  with check (public.can_act_as(author_id) and status in ('draft','scheduled','published') and removed_reason is null);
create policy "author updates" on public.posts for update
  using (public.can_act_as(author_id) and status <> 'removed')
  with check (public.can_act_as(author_id) and status <> 'removed');
create policy "staff moderates" on public.posts for update using (public.has_role('moderator') or public.has_role('admin'));
create policy "author deletes" on public.posts for delete using (public.can_act_as(author_id));

create or replace function public.posts_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- server-side hashtag extraction (client values are ignored)
  new.hashtags := coalesce((
    select array_agg(distinct lower(m[1])) from regexp_matches(new.caption, '#([[:alnum:]_]{2,40})', 'g') as m
  ), '{}');
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := now();
  end if;
  if tg_op = 'UPDATE' and not public.is_service_role() and pg_trigger_depth() <= 1 and not public.is_staff()
     and coalesce(current_setting('sf.counter_write', true), '') <> 'on' then
    -- counters are maintained by triggers only
    new.like_count := old.like_count; new.comment_count := old.comment_count;
    new.save_count := old.save_count; new.share_count := old.share_count; new.view_count := old.view_count;
  elsif tg_op = 'INSERT' and not public.is_service_role() then
    new.like_count := 0; new.comment_count := 0; new.save_count := 0; new.share_count := 0; new.view_count := 0;
  end if;
  return new;
end $$;
create trigger posts_before_write before insert or update on public.posts for each row execute function public.posts_before_write();

create or replace function public.posts_counter() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'published' then
    update public.profiles set post_count = post_count + 1 where id = new.author_id;
  elsif tg_op = 'UPDATE' and old.status <> new.status then
    if new.status = 'published' then update public.profiles set post_count = post_count + 1 where id = new.author_id;
    elsif old.status = 'published' then update public.profiles set post_count = greatest(post_count - 1, 0) where id = new.author_id; end if;
  elsif tg_op = 'DELETE' and old.status = 'published' then
    update public.profiles set post_count = greatest(post_count - 1, 0) where id = old.author_id;
  end if;
  return null;
end $$;
create trigger posts_counter after insert or update of status or delete on public.posts for each row execute function public.posts_counter();

create table public.post_media (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  position     smallint not null check (position between 0 and 9),
  type         text not null check (type in ('image','video')),
  storage_path text not null,
  poster_path  text,
  width        integer not null check (width > 0),
  height       integer not null check (height > 0),
  alt          text not null default '' check (char_length(alt) <= 300),
  captions_path text,
  unique (post_id, position)
);
alter table public.post_media enable row level security;
create policy "media follows post visibility" on public.post_media for select
  using (exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p)));
create policy "author manages media" on public.post_media for all
  using (exists (select 1 from public.posts p where p.id = post_id and public.can_act_as(p.author_id)))
  with check (exists (select 1 from public.posts p where p.id = post_id and public.can_act_as(p.author_id)));

-- product tags reference catalog products (created in the commerce migration; FK added there)
create table public.post_products (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  product_id  uuid not null,
  media_index smallint not null default 0 check (media_index between 0 and 9),
  x           numeric(5,4) not null check (x between 0 and 1),
  y           numeric(5,4) not null check (y between 0 and 1),
  created_at  timestamptz not null default now()
);
create index post_products_product_idx on public.post_products(product_id);
create index post_products_post_idx on public.post_products(post_id);
alter table public.post_products enable row level security;
create policy "tags follow post visibility" on public.post_products for select
  using (exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p)));
create policy "author manages tags" on public.post_products for all
  using (exists (select 1 from public.posts p where p.id = post_id and public.can_act_as(p.author_id)))
  with check (exists (select 1 from public.posts p where p.id = post_id and public.can_act_as(p.author_id)));

-- ---------------------------------------------------------------------------
-- Likes
-- ---------------------------------------------------------------------------
create table public.likes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, post_id)
);
create index likes_post_idx on public.likes(post_id, created_at desc);
alter table public.likes enable row level security;
create policy "likes visible with post" on public.likes for select
  using (exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p)));
create policy "like as self" on public.likes for insert
  with check (public.can_act_as(profile_id) and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published' and public.can_view_post(p)));
create policy "unlike as self" on public.likes for delete using (public.can_act_as(profile_id));

create or replace function public.likes_counter() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id returning author_id into author;
    if author is not null and author <> new.profile_id then
      insert into public.notifications(user_profile_id, type, actor_id, post_id) values (author, 'like', new.profile_id, new.post_id);
    end if;
  else
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
create trigger likes_counter after insert or delete on public.likes for each row execute function public.likes_counter();

-- ---------------------------------------------------------------------------
-- Comments (one level of replies)
-- ---------------------------------------------------------------------------
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  parent_id  uuid references public.comments(id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  status     text not null default 'visible' check (status in ('visible','hidden','removed')),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments(post_id, created_at);
alter table public.comments enable row level security;
create policy "comments visible with post" on public.comments for select
  using (status = 'visible' and exists (select 1 from public.posts p where p.id = post_id and public.can_view_post(p))
         and not public.is_blocked_between(author_id, auth.uid()));
create policy "comment as self" on public.comments for insert
  with check (public.can_act_as(author_id) and status = 'visible'
              and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published' and public.can_view_post(p)
                          and not public.is_blocked_between(p.author_id, author_id)));
create policy "author or post owner deletes" on public.comments for delete
  using (public.can_act_as(author_id) or exists (select 1 from public.posts p where p.id = post_id and public.can_act_as(p.author_id)));

-- comment rate limit: 10 per minute per profile
create or replace function public.comments_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.comments where author_id = new.author_id and created_at > now() - interval '1 minute') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  return new;
end $$;
create trigger comments_rate_limit before insert on public.comments for each row execute function public.comments_rate_limit();

create or replace function public.comments_counter() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id returning author_id into author;
    if author <> new.author_id then
      insert into public.notifications(user_profile_id, type, actor_id, post_id, body) values (author, 'comment', new.author_id, new.post_id, left(new.body, 120));
    end if;
  else
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;
create trigger comments_counter after insert or delete on public.comments for each row execute function public.comments_counter();

-- ---------------------------------------------------------------------------
-- Collections
-- ---------------------------------------------------------------------------
create table public.collections (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);
create index collections_owner_idx on public.collections(owner_id);
alter table public.collections enable row level security;
create policy "own or public collections" on public.collections for select using (public.can_act_as(owner_id) or not is_private);
create policy "manage own collections" on public.collections for all using (public.can_act_as(owner_id)) with check (public.can_act_as(owner_id));

create table public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  kind          text not null check (kind in ('post','product')),
  ref_id        uuid not null,
  added_at      timestamptz not null default now(),
  primary key (collection_id, kind, ref_id)
);
alter table public.collection_items enable row level security;
create policy "items follow collection" on public.collection_items for select
  using (exists (select 1 from public.collections c where c.id = collection_id and (public.can_act_as(c.owner_id) or not c.is_private)));
create policy "manage own items" on public.collection_items for all
  using (exists (select 1 from public.collections c where c.id = collection_id and public.can_act_as(c.owner_id)))
  with check (exists (select 1 from public.collections c where c.id = collection_id and public.can_act_as(c.owner_id)));

create or replace function public.saves_counter() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.kind = 'post' then update public.posts set save_count = save_count + 1 where id = new.ref_id;
  elsif tg_op = 'DELETE' and old.kind = 'post' then update public.posts set save_count = greatest(save_count - 1, 0) where id = old.ref_id; end if;
  return null;
end $$;
create trigger saves_counter after insert or delete on public.collection_items for each row execute function public.saves_counter();

-- ---------------------------------------------------------------------------
-- Notifications (written by triggers / server only)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.profiles(id) on delete cascade,
  type            text not null check (type in ('follow','like','comment','mention','message','system','price_alert')),
  actor_id        uuid references public.profiles(id) on delete cascade,
  post_id         uuid references public.posts(id) on delete cascade,
  body            text,
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_profile_id, created_at desc);
alter table public.notifications enable row level security;
create policy "read own notifications" on public.notifications for select using (public.can_act_as(user_profile_id));
create policy "mark own read" on public.notifications for update using (public.can_act_as(user_profile_id)) with check (public.can_act_as(user_profile_id));
-- inserts come from SECURITY DEFINER triggers only

create or replace function public.notifications_filter() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.actor_id is not null and exists (select 1 from public.mutes where muter_id = new.user_profile_id and muted_id = new.actor_id) then
    return null;
  end if;
  if new.actor_id is not null and public.is_blocked_between(new.actor_id, new.user_profile_id) then
    return null;
  end if;
  return new;
end $$;
create trigger notifications_filter before insert on public.notifications for each row execute function public.notifications_filter();

-- follows trigger defined after notifications table exists
create trigger follows_counter after insert or delete on public.follows for each row execute function public.follows_counter();

-- ---------------------------------------------------------------------------
-- Direct messages (personal and brand collaboration threads are separate kinds)
-- ---------------------------------------------------------------------------
create table public.conversations (
  id                   uuid primary key default gen_random_uuid(),
  kind                 text not null default 'personal' check (kind in ('personal','collaboration')),
  created_by           uuid not null references public.profiles(id),
  status               text not null default 'request' check (status in ('active','request')),
  last_message_at      timestamptz not null default now(),
  last_message_preview text not null default '',
  created_at           timestamptz not null default now()
);
alter table public.conversations enable row level security;

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);
create index conversation_participants_profile_idx on public.conversation_participants(profile_id);
alter table public.conversation_participants enable row level security;

create or replace function public.is_participant(_conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_participants cp where cp.conversation_id = _conv and public.can_act_as(cp.profile_id));
$$;

create policy "participants read conversations" on public.conversations for select using (public.is_participant(id));
create policy "participants update conversations" on public.conversations for update using (public.is_participant(id)) with check (public.is_participant(id));
create policy "participants read members" on public.conversation_participants for select using (public.is_participant(conversation_id));
create policy "update own read marker" on public.conversation_participants for update using (public.can_act_as(profile_id)) with check (public.can_act_as(profile_id));

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at      timestamptz not null default now()
);
create index messages_conv_idx on public.messages(conversation_id, created_at);
alter table public.messages enable row level security;
create policy "participants read messages" on public.messages for select using (public.is_participant(conversation_id));
create policy "participants send" on public.messages for insert
  with check (public.can_act_as(sender_id) and public.is_participant(conversation_id));

-- Spam protection + request acceptance + preview
create or replace function public.messages_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations; other uuid;
begin
  select * into c from public.conversations where id = new.conversation_id for update;
  select profile_id into other from public.conversation_participants where conversation_id = c.id and profile_id <> new.sender_id limit 1;
  if public.is_blocked_between(new.sender_id, other) then raise exception 'forbidden' using errcode = '42501'; end if;
  if (select count(*) from public.messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  if c.status = 'request' then
    if c.created_by = new.sender_id then
      if (select count(*) from public.messages where conversation_id = c.id) >= 3 then
        raise exception 'rate_limited' using errcode = 'P0429';
      end if;
    else
      update public.conversations set status = 'active' where id = c.id; -- replying accepts the request
    end if;
  end if;
  update public.conversations set last_message_at = now(), last_message_preview = left(new.body, 80) where id = c.id;
  update public.conversation_participants set last_read_at = now() where conversation_id = c.id and profile_id = new.sender_id;
  insert into public.notifications(user_profile_id, type, actor_id, body) values (other, 'message', new.sender_id, left(new.body, 80));
  return new;
end $$;
create trigger messages_before_insert before insert on public.messages for each row execute function public.messages_before_insert();

-- Start (or reuse) a conversation. Enforces DM policy and collaboration rules server-side.
create or replace function public.start_conversation(_me uuid, _other uuid, _kind text default 'personal')
returns uuid language plpgsql security definer set search_path = public as $$
declare conv uuid; policy text; other_kind public.profile_kind; me_kind public.profile_kind; other_follows boolean;
begin
  if not public.can_act_as(_me) then raise exception 'forbidden' using errcode = '42501'; end if;
  if _me = _other or public.is_blocked_between(_me, _other) then raise exception 'forbidden' using errcode = '42501'; end if;
  select kind into other_kind from public.profiles where id = _other and deleted_at is null;
  if other_kind is null then raise exception 'not_found' using errcode = 'P0002'; end if;
  select kind into me_kind from public.profiles where id = _me;
  if _kind = 'collaboration' and other_kind <> 'brand' and me_kind <> 'brand' then
    raise exception 'collaboration threads require a brand participant' using errcode = '42501';
  end if;
  select c.id into conv from public.conversations c
    join public.conversation_participants a on a.conversation_id = c.id and a.profile_id = _me
    join public.conversation_participants b on b.conversation_id = c.id and b.profile_id = _other
    where c.kind = _kind limit 1;
  if conv is not null then return conv; end if;
  select coalesce(up.dm_policy, 'followers') into policy from public.profiles p left join public.user_preferences up on up.user_id = p.user_id where p.id = _other;
  other_follows := exists (select 1 from public.follows where follower_id = _other and followee_id = _me);
  if _kind = 'personal' and policy = 'nobody' then raise exception 'dm_disabled' using errcode = '42501'; end if;
  insert into public.conversations(kind, created_by, status)
    values (_kind, _me, case when _kind = 'collaboration' or other_follows or policy = 'everyone' then 'active' else 'request' end)
    returning id into conv;
  insert into public.conversation_participants(conversation_id, profile_id) values (conv, _me), (conv, _other);
  return conv;
end $$;

-- ---------------------------------------------------------------------------
-- Reports & moderation queue
-- ---------------------------------------------------------------------------
create table public.moderation_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','profile','message','product')),
  target_id   uuid not null,
  reason      text not null check (reason in ('spam','harassment','misleading','undisclosed_ad','ip','counterfeit','nudity','violence','other')),
  details     text not null default '' check (char_length(details) <= 1000),
  status      text not null default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  assigned_to uuid references auth.users(id),
  resolution  text,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index moderation_reports_dedupe on public.moderation_reports(reporter_id, target_type, target_id) where status = 'open';
create index moderation_reports_queue on public.moderation_reports(status, created_at);
alter table public.moderation_reports enable row level security;
create policy "reporter reads own" on public.moderation_reports for select using (public.can_act_as(reporter_id) or public.has_role('moderator') or public.has_role('admin'));
create policy "file report" on public.moderation_reports for insert with check (public.can_act_as(reporter_id) and status = 'open');
create policy "moderators triage" on public.moderation_reports for update using (public.has_role('moderator') or public.has_role('admin'));

-- ---------------------------------------------------------------------------
-- Engagement RPCs that must not be client-writable columns
-- ---------------------------------------------------------------------------
create or replace function public.record_post_share(_post uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('sf.counter_write', 'on', true);
  update public.posts p set share_count = share_count + 1 where p.id = _post and p.status = 'published' and public.can_view_post(p);
  perform set_config('sf.counter_write', '', true);
end $$;

create or replace function public.record_post_view(_post uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('sf.counter_write', 'on', true);
  update public.posts p set view_count = view_count + 1 where p.id = _post and p.status = 'published' and public.can_view_post(p);
  perform set_config('sf.counter_write', '', true);
end $$;
