-- Phase 5: brand portal — org isolation, campaign status machine, applications, invitations, deliverables.
\set ON_ERROR_STOP on
set client_min_messages = notice;
create or replace function pg_temp.as_user(_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(_id::text, ''), false);
  perform set_config('request.jwt.claim.role', 'authenticated', false);
  execute 'set role authenticated';
end $$;
create or replace function pg_temp.as_admin_sql() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('request.jwt.claim.sub', '', false); perform set_config('request.jwt.claim.role', '', false); end $$;
create or replace function pg_temp.expect(_ok boolean, _msg text) returns void language plpgsql as $$
begin if not coalesce(_ok, false) then raise exception 'TEST FAILED: %', _msg; end if; raise notice 'ok - %', _msg; end $$;

-- users: brand owner (b1), brand analyst (b2), rival brand (r1), creators (k1 eligible, k2 small), moderator (m1 from earlier file: ...0d)
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'b1@test.dev', '{"username":"brandowner","display_name":"Brand Owner"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@test.dev', '{"username":"brandanalyst","display_name":"Analyst"}'),
  ('00000000-0000-0000-0000-0000000000f1', 'r1@test.dev', '{"username":"rival","display_name":"Rival"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'k1@test.dev', '{"username":"bigcreator","display_name":"Big"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'k2@test.dev', '{"username":"smallcreator","display_name":"Small"}');
select set_config('request.jwt.claim.role', 'service_role', false);
update public.profiles set is_creator = true, follower_count = 5000 where username = 'bigcreator';
update public.profiles set is_creator = true, follower_count = 10 where username = 'smallcreator';
select set_config('request.jwt.claim.role', '', false);

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select public.register_brand('Acme Brand', 'acme-brand', 'TR', 'https://acme.example', 'acmebrand') as org \gset
select pg_temp.expect((select count(*) from public.profiles where username = 'acmebrand' and kind = 'brand') = 1, 'brand registration creates org + brand profile');
select public.add_org_member(:'org', 'brandanalyst', 'analyst');
do $$ begin
  perform public.add_org_member((select id from public.organizations where slug = 'acme-brand'), 'brandanalyst', 'owner');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect(true, 'owner role cannot be assigned');

insert into public.campaigns(id, organization_id, brand_profile_id, title, objective, type, currency, budget, fixed_fee, countries, min_followers, required_disclosure, created_by)
  select '80000000-0000-0000-0000-000000000001', :'org', id, 'Autumn launch', 'launch', 'fixed_fee', 'TRY', 50000, 5000, '{TR}', 1000, 'sponsored', '00000000-0000-0000-0000-0000000000b1' from public.profiles where username = 'acmebrand';
do $$ begin
  update public.campaigns set status = 'open' where id = '80000000-0000-0000-0000-000000000001';
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect(true, 'brand cannot self-approve (draft → open blocked)');
update public.campaigns set status = 'pending_approval' where id = '80000000-0000-0000-0000-000000000001';
do $$ begin
  update public.campaigns set fixed_fee = 1 where id = '80000000-0000-0000-0000-000000000001';
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect(true, 'commercial terms locked after submission');

-- analyst cannot edit, rival cannot see
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select pg_temp.expect((select count(*) from public.campaigns) = 1, 'analyst can read org campaigns');
update public.campaigns set title = 'hacked' where true;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.expect((select count(*) from public.campaigns) = 0, 'other organizations cannot see draft/pending campaigns');
do $$ begin
  insert into public.campaigns(organization_id, title, objective, type, currency, fixed_fee, created_by) values ((select id from public.organizations limit 1), 'evil', 'sales', 'fixed_fee', 'TRY', 1, '00000000-0000-0000-0000-0000000000f1');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.as_admin_sql();
select pg_temp.expect((select title from public.campaigns where id = '80000000-0000-0000-0000-000000000001') = 'Autumn launch', 'analyst/rival cannot modify campaigns');

-- creator cannot apply while pending
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
do $$ begin
  perform public.apply_to_campaign('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'hi');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect(true, 'cannot apply before platform approval');

-- moderator approves
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
update public.campaigns set status = 'open' where id = '80000000-0000-0000-0000-000000000001';
select pg_temp.as_admin_sql();
select pg_temp.expect((select status from public.campaigns where id = '80000000-0000-0000-0000-000000000001') = 'open', 'staff approves campaign');

-- applications
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
do $$ begin
  perform public.apply_to_campaign('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d2', 'pls');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect(true, 'ineligible creator (followers) cannot apply');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select public.apply_to_campaign('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'I love autumn', 4500) as app \gset
do $$ begin
  perform public.apply_to_campaign('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'again');
  raise exception 'should not reach';
exception when unique_violation then null; end $$;
select pg_temp.expect(true, 'duplicate application rejected');
do $$ begin
  perform public.review_application((select id from public.campaign_applications limit 1), true);
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect(true, 'creator cannot accept own application');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.expect((select count(*) from public.campaign_applications) = 0, 'rival org cannot see applications');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
do $$ begin
  perform public.review_application((select id from public.campaign_applications limit 1), true);
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect(true, 'analyst cannot review applications');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select public.review_application(:'app', true);
select pg_temp.expect((select agreed_fee from public.campaign_participants where creator_id = '00000000-0000-0000-0000-0000000000d1') = 4500, 'accepted application creates participant with agreed fee');

-- invitations: ineligible creator cannot be invited
do $$ begin
  perform public.invite_creator('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d2', 'join');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect(true, 'invitations respect eligibility');

-- conflict of interest: an org member who is also a creator cannot apply
select pg_temp.as_admin_sql();
select set_config('request.jwt.claim.role', 'service_role', false);
update public.profiles set is_creator = true, follower_count = 5000 where username = 'brandanalyst';
select set_config('request.jwt.claim.role', '', false);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
do $$ begin
  perform public.apply_to_campaign('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b2', 'me');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect(true, 'brand team members cannot apply to their own campaigns');

-- deliverables: disclosure must match
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
insert into public.posts(id, author_id, type, caption, status, disclosure) values
  ('81000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'photo', 'no disclosure', 'published', 'none'),
  ('81000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', 'photo', 'Sponsored look #ad', 'published', 'sponsored');
do $$ begin
  perform public.submit_deliverable('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', '81000000-0000-0000-0000-000000000001', '');
  raise exception 'should not reach';
exception when invalid_parameter_value then null; end $$;
select pg_temp.expect(true, 'deliverable without required disclosure is rejected');
select public.submit_deliverable('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', '81000000-0000-0000-0000-000000000002', 'done') as del \gset
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d2');
do $$ begin
  perform public.submit_deliverable('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d2', '81000000-0000-0000-0000-000000000002', '');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect(true, 'non-participants cannot submit deliverables');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select public.review_deliverable(:'del', true, 'great');
select pg_temp.expect((select status from public.campaign_deliverables where id = :'del') = 'approved', 'brand approves deliverable');

-- status machine
update public.campaigns set status = 'in_progress' where id = '80000000-0000-0000-0000-000000000001';
do $$ begin
  update public.campaigns set status = 'open' where id = '80000000-0000-0000-0000-000000000001';
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
update public.campaigns set status = 'completed' where id = '80000000-0000-0000-0000-000000000001';
select pg_temp.as_admin_sql();
select pg_temp.expect((select status from public.campaigns where id = '80000000-0000-0000-0000-000000000001') = 'completed', 'status machine: in_progress → completed; no going back to open');
select pg_temp.expect((select count(*) from public.audit_logs where action like 'campaign.%' or action like 'application.%' or action like 'deliverable.%') >= 5, 'brand actions audited');
\echo 'ALL CAMPAIGN TESTS PASSED'
