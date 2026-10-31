-- RLS & integrity tests. Run with scripts/test-migrations.sh. Any failure raises an exception.
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function pg_temp.as_user(_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(_id::text, ''), false);
  perform set_config('request.jwt.claim.role', case when _id is null then 'anon' else 'authenticated' end, false);
  execute case when _id is null then 'set role anon' else 'set role authenticated' end;
end $$;
create or replace function pg_temp.as_admin_sql() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', false);
  perform set_config('request.jwt.claim.role', '', false);
end $$;
create or replace function pg_temp.expect(_ok boolean, _msg text) returns void language plpgsql as $$
begin
  if not _ok then raise exception 'TEST FAILED: %', _msg; end if;
  raise notice 'ok - %', _msg;
end $$;

-- fixtures (as superuser)
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.dev', '{"username":"alice","display_name":"Alice","locale":"tr","country":"TR","terms_version":"2026-10-01","marketing_opt_in":false}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.dev',   '{"username":"bob","display_name":"Bob","locale":"en","country":"US","terms_version":"2026-10-01"}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@test.dev', '{"username":"carol","display_name":"Carol"}'),
  ('00000000-0000-0000-0000-00000000000d', 'mod@test.dev',   '{"username":"mod","display_name":"Mod"}');
insert into public.user_roles(user_id, role) values ('00000000-0000-0000-0000-00000000000d', 'moderator');

select pg_temp.expect((select count(*) from public.profiles) = 4, 'signup trigger creates profiles');
select pg_temp.expect((select count(*) from public.consents where user_id = '00000000-0000-0000-0000-00000000000a') = 3, 'signup trigger records consents');
select pg_temp.expect((select country from public.user_preferences where user_id = '00000000-0000-0000-0000-00000000000b') = 'US', 'preferences seeded from metadata');

-- ===== Profiles =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update public.profiles set bio = 'hello' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set bio = 'hacked' where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_admin_sql();
select pg_temp.expect((select bio from public.profiles where username = 'alice') = 'hello', 'user updates own profile');
select pg_temp.expect((select bio from public.profiles where username = 'bob') = '', 'user cannot update another profile');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  update public.profiles set verified = true where id = '00000000-0000-0000-0000-00000000000a';
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.profiles set follower_count = 999999 where id = '00000000-0000-0000-0000-00000000000a';
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.as_admin_sql();
select pg_temp.expect((select not verified and follower_count = 0 from public.profiles where username = 'alice'), 'verified flag & counters are protected');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  insert into public.user_roles(user_id, role) values ('00000000-0000-0000-0000-00000000000a', 'admin');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.admin_set_role('00000000-0000-0000-0000-00000000000a', 'admin', true);
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.as_admin_sql();
select pg_temp.expect(not exists (select 1 from public.user_roles where user_id = '00000000-0000-0000-0000-00000000000a'), 'users cannot self-grant platform roles');

-- ===== Follows + counters + notifications =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.follows(follower_id, followee_id) values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
do $$ begin
  insert into public.follows(follower_id, followee_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.as_admin_sql();
select pg_temp.expect((select follower_count from public.profiles where username = 'bob') = 1, 'follow increments follower_count');
select pg_temp.expect((select count(*) from public.notifications where user_profile_id = '00000000-0000-0000-0000-00000000000b' and type = 'follow') = 1, 'follow creates notification');
select pg_temp.expect((select count(*) from public.follows where follower_id = '00000000-0000-0000-0000-00000000000b') = 0, 'cannot follow on behalf of others');

-- ===== Posts =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.posts(id, author_id, type, caption, status, like_count) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'photo', 'First post #Style #style #tech', 'published', 5000),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'photo', 'draft', 'draft', 0);
select pg_temp.as_admin_sql();
select pg_temp.expect((select like_count from public.posts where id = '10000000-0000-0000-0000-000000000001') = 0, 'clients cannot seed fake like counts');
select pg_temp.expect((select hashtags from public.posts where id = '10000000-0000-0000-0000-000000000001') @> array['style','tech'] and (select cardinality(hashtags) from public.posts where id = '10000000-0000-0000-0000-000000000001') = 2, 'hashtags extracted server-side and deduplicated');
select pg_temp.expect((select post_count from public.profiles where username = 'bob') = 1, 'post_count counts only published');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select count(*) from public.posts where author_id = '00000000-0000-0000-0000-00000000000b') = 1, 'others see published, not drafts');
update public.posts set caption = 'pwned' where id = '10000000-0000-0000-0000-000000000001';
do $$ begin
  insert into public.posts(author_id, type, caption, status) values ('00000000-0000-0000-0000-00000000000b', 'photo', 'impersonation', 'published');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.as_admin_sql();
select pg_temp.expect((select caption from public.posts where id = '10000000-0000-0000-0000-000000000001') <> 'pwned', 'cannot edit others posts');

-- likes
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.likes(profile_id, post_id) values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001');
do $$ begin
  insert into public.likes(profile_id, post_id) values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001');
  raise exception 'should not reach';
exception when unique_violation then null; end $$;
do $$ begin
  insert into public.likes(profile_id, post_id) values ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000002');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.as_admin_sql();
select pg_temp.expect((select like_count from public.posts where id = '10000000-0000-0000-0000-000000000001') = 1, 'like counted once (duplicate rejected)');

-- view / share RPC counters
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.record_post_share('10000000-0000-0000-0000-000000000001');
select public.record_post_view('10000000-0000-0000-0000-000000000001');
select pg_temp.as_admin_sql();
select pg_temp.expect((select share_count = 1 and view_count = 1 from public.posts where id = '10000000-0000-0000-0000-000000000001'), 'share/view RPCs increment counters');

-- comments
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.comments(post_id, author_id, body) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Nice!');
select pg_temp.as_admin_sql();
select pg_temp.expect((select comment_count from public.posts where id = '10000000-0000-0000-0000-000000000001') = 1, 'comment counter');

-- ===== Blocks =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.blocks(blocker_id, blocked_id) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select count(*) from public.posts where author_id = '00000000-0000-0000-0000-00000000000b') = 0, 'blocked user cannot see blocker posts');
do $$ begin
  insert into public.comments(post_id, author_id, body) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'again');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.as_admin_sql();
select pg_temp.expect(not exists (select 1 from public.follows where follower_id = '00000000-0000-0000-0000-00000000000a' and followee_id = '00000000-0000-0000-0000-00000000000b'), 'block removes follow edge');
select pg_temp.expect((select follower_count from public.profiles where username = 'bob') = 0, 'counter decremented after block cleanup');
delete from public.blocks;

-- ===== Private accounts =====
update public.profiles set is_private = true where username = 'bob';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) from public.posts where author_id = '00000000-0000-0000-0000-00000000000b') = 0, 'private account hidden from non-followers');
select pg_temp.as_admin_sql();
update public.profiles set is_private = false where username = 'bob';

-- ===== Collections =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.collections(id, owner_id, name) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Wishlist');
insert into public.collection_items(collection_id, kind, ref_id) values ('20000000-0000-0000-0000-000000000001', 'post', '10000000-0000-0000-0000-000000000001');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) from public.collections) = 0, 'private collections invisible to others');
do $$ begin
  insert into public.collection_items(collection_id, kind, ref_id) values ('20000000-0000-0000-0000-000000000001', 'post', '10000000-0000-0000-0000-000000000002');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.as_admin_sql();
select pg_temp.expect((select save_count from public.posts where id = '10000000-0000-0000-0000-000000000001') = 1, 'save counter');

-- ===== Messaging =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.start_conversation('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a', 'personal') as conv \gset
select pg_temp.expect((select status from public.conversations where id = :'conv') = 'request', 'DM from non-followed account is a request');
insert into public.messages(conversation_id, sender_id, body) values (:'conv', '00000000-0000-0000-0000-00000000000c', 'hi 1'), (:'conv', '00000000-0000-0000-0000-00000000000c', 'hi 2'), (:'conv', '00000000-0000-0000-0000-00000000000c', 'hi 3');
do $$ begin
  insert into public.messages(conversation_id, sender_id, body) select id, '00000000-0000-0000-0000-00000000000c', 'hi 4' from public.conversations limit 1;
  raise exception 'should not reach';
exception when sqlstate 'P0429' then null; end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) from public.messages) = 0, 'non-participants cannot read messages');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.messages(conversation_id, sender_id, body) values (:'conv', '00000000-0000-0000-0000-00000000000a', 'hello back');
select pg_temp.as_admin_sql();
select pg_temp.expect((select status from public.conversations where id = :'conv') = 'active', 'reply accepts request');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  perform public.start_conversation('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'collaboration');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.as_admin_sql();
select pg_temp.expect(true, 'collaboration threads require a brand participant');

-- ===== Organizations (brand isolation) =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.organizations(id, name, slug, country, created_by) values ('30000000-0000-0000-0000-000000000001', 'Alice Brand', 'alice-brand', 'TR', '00000000-0000-0000-0000-00000000000a');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.organizations(id, name, slug, country, created_by) values ('30000000-0000-0000-0000-000000000002', 'Bob Brand', 'bob-brand', 'US', '00000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) from public.organizations) = 1, 'org members only see their own unverified org');
select pg_temp.expect((select count(*) from public.organization_members) = 1, 'org membership isolated');
do $$ begin
  insert into public.organization_members(organization_id, user_id, role) values ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'admin');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.organizations set verification_status = 'verified' where id = '30000000-0000-0000-0000-000000000002';
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.profiles(kind, organization_id, username, display_name) values ('brand', '30000000-0000-0000-0000-000000000001', 'stolenbrand', 'Stolen');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
insert into public.profiles(kind, organization_id, username, display_name) values ('brand', '30000000-0000-0000-0000-000000000002', 'bobbrand', 'Bob Brand');
select pg_temp.as_admin_sql();
select pg_temp.expect((select owner from (select role = 'owner' as owner from public.organization_members where user_id = '00000000-0000-0000-0000-00000000000b') x), 'org creator becomes owner');
select pg_temp.expect(exists (select 1 from public.profiles where username = 'bobbrand' and kind = 'brand'), 'org admin creates brand profile');

-- brand profile can post via org manager role
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into public.posts(author_id, type, caption, status) select id, 'photo', 'Brand launch', 'published' from public.profiles where username = 'bobbrand';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  insert into public.posts(author_id, type, caption, status) select id, 'photo', 'fake brand post', 'published' from public.profiles where username = 'bobbrand';
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.as_admin_sql();
select pg_temp.expect((select count(*) from public.posts p join public.profiles pr on pr.id = p.author_id where pr.username = 'bobbrand') = 1, 'only org members can post as brand');

-- ===== Moderation =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.moderation_reports(reporter_id, target_type, target_id, reason) values ('00000000-0000-0000-0000-00000000000a', 'post', '10000000-0000-0000-0000-000000000001', 'spam');
do $$ begin
  insert into public.moderation_reports(reporter_id, target_type, target_id, reason) values ('00000000-0000-0000-0000-00000000000a', 'post', '10000000-0000-0000-0000-000000000001', 'spam');
  raise exception 'should not reach';
exception when unique_violation then null; end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) from public.moderation_reports) = 0, 'reports private to reporter');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect((select count(*) from public.moderation_reports) = 1, 'moderator sees queue');
update public.posts set status = 'removed', removed_reason = 'spam' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.as_admin_sql();
select pg_temp.expect((select status from public.posts where id = '10000000-0000-0000-0000-000000000001') = 'removed', 'moderator can remove post');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
update public.posts set status = 'published' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.as_admin_sql();
select pg_temp.expect((select status from public.posts where id = '10000000-0000-0000-0000-000000000001') = 'removed', 'author cannot restore removed post');

-- ===== Commerce =====
insert into public.marketplaces(id, name, slug, website, countries, is_active) values ('40000000-0000-0000-0000-000000000001', 'Test Market', 'test-market', 'https://example.com', '{TR}', true);
insert into public.products(id, brand_name, title, category, status) values ('50000000-0000-0000-0000-000000000001', 'Acme', 'Widget', 'tech', 'approved'), ('50000000-0000-0000-0000-000000000002', 'Acme', 'Hidden', 'tech', 'pending_review');
insert into public.product_offers(id, product_id, marketplace_id, country, price, currency, price_source, last_updated, destination_url)
  values ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'TR', 100, 'TRY', 'merchant_feed', now(), 'https://example.com/p/1');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) from public.products) = 1, 'unapproved products hidden');
do $$ begin
  update public.product_offers set price = 1 where true;
  if exists (select 1 from public.product_offers where price = 1) then raise exception 'price changed'; end if;
end $$;
select pg_temp.expect(public.outbound_redirect('60000000-0000-0000-0000-000000000001', null, '00000000-0000-0000-0000-00000000000a') = 'https://example.com/p/1', 'redirect returns authorized destination');
select public.outbound_redirect('60000000-0000-0000-0000-000000000001', null, '00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) from public.click_events where creator_id = '00000000-0000-0000-0000-00000000000a') = 0, 'shoppers cannot read clicks attributed to other creators');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select count(*) from public.click_events) = 1, 'creator reads own attributed clicks');
do $$ begin
  insert into public.click_events(offer_id) values ('60000000-0000-0000-0000-000000000001');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.as_admin_sql();
select pg_temp.expect((select is_self_click from public.click_events where creator_id = '00000000-0000-0000-0000-00000000000c'), 'self-clicks flagged');
do $$ begin
  with n as (insert into public.affiliate_networks(name, integration) values ('Net', 'api') returning id)
  insert into public.affiliate_programs(network_id, name, status) select id, 'x', 'active' from n;
  raise exception 'should not reach';
exception when check_violation then null; end $$;
select pg_temp.expect(true, 'affiliate program cannot be active without agreement reference');

-- anon
select pg_temp.as_user(null);
select pg_temp.expect((select count(*) from public.profiles) >= 4, 'anon can browse public profiles');
select pg_temp.expect((select count(*) from public.notifications) = 0, 'anon sees no notifications');
select pg_temp.as_admin_sql();

\echo 'ALL RLS TESTS PASSED'
