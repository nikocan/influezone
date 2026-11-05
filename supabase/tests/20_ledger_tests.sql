-- Phase 4 financial tests: idempotency, attribution, self-purchase, split, reversal, payouts, immutability.
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function pg_temp.as_user(_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(_id::text, ''), false);
  perform set_config('request.jwt.claim.role', case when _id is null then 'anon' else 'authenticated' end, false);
  execute 'set role authenticated';
end $$;
create or replace function pg_temp.as_service() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', false);
  perform set_config('request.jwt.claim.role', 'service_role', false);
end $$;
create or replace function pg_temp.as_admin_sql() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', false);
  perform set_config('request.jwt.claim.role', '', false);
end $$;
create or replace function pg_temp.expect(_ok boolean, _msg text) returns void language plpgsql as $$
begin
  if not coalesce(_ok, false) then raise exception 'TEST FAILED: %', _msg; end if;
  raise notice 'ok - %', _msg;
end $$;

-- fixtures
insert into auth.users(id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'creator@test.dev', '{"username":"creator1","display_name":"Creator"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'shop@test.dev', '{"username":"shopper1","display_name":"Shopper"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.dev', '{"username":"admin1","display_name":"Admin"}');
insert into public.user_roles(user_id, role) values ('00000000-0000-0000-0000-0000000000a1', 'admin');
insert into public.affiliate_networks(id, name, integration, status) values ('70000000-0000-0000-0000-000000000001', 'TestNet', 'postback', 'sandbox');
insert into public.affiliate_programs(id, network_id, name, attribution_window_days, agreement_reference, status) values ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Prog', 7, 'CONTRACT-1', 'active');
insert into public.affiliate_links(id, creator_id, offer_id, program_id, code) values ('72000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '60000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'LINK1');

-- shopper clicks the creator link
insert into public.click_events(id, user_id, offer_id, creator_id, link_id, created_at) values
  ('73000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', '60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '72000000-0000-0000-0000-000000000001', now() - interval '2 days');

-- ===== Authorization =====
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ begin
  perform public.ingest_conversion('70000000-0000-0000-0000-000000000001', 'EV-FAKE', 'LINK1', 1000, 100, 'TRY', now(), 'confirmed');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.conversion_events(network_id, provider_event_id, order_amount, commission_amount, currency, occurred_at) values ('70000000-0000-0000-0000-000000000001', 'X', 1, 1, 'TRY', now());
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.as_admin_sql();
select pg_temp.expect(true, 'creators cannot create conversions or call ingestion');

-- ===== Ingest + idempotency =====
select pg_temp.as_service();
select public.ingest_conversion('70000000-0000-0000-0000-000000000001', 'EV-1', 'LINK1', 1000, 100, 'TRY', now() - interval '1 day', 'reported') as c1 \gset
select public.ingest_conversion('70000000-0000-0000-0000-000000000001', 'EV-1', 'LINK1', 1000, 100, 'TRY', now() - interval '1 day', 'reported') as c1b \gset
select pg_temp.expect(:'c1' = :'c1b' and (select count(*) from public.conversion_events where provider_event_id = 'EV-1') = 1, 'duplicate provider event is ignored (idempotent)');
select pg_temp.expect((select count(*) from public.ledger_entries where conversion_id = :'c1') = 0, 'reported (unconfirmed) conversion creates no ledger money');

-- confirmation arrives later via same event id
select public.ingest_conversion('70000000-0000-0000-0000-000000000001', 'EV-1', 'LINK1', 1000, 100, 'TRY', now() - interval '1 day', 'confirmed');
select public.ingest_conversion('70000000-0000-0000-0000-000000000001', 'EV-1', 'LINK1', 1000, 100, 'TRY', now() - interval '1 day', 'confirmed');
select pg_temp.expect((select status from public.conversion_events where id = :'c1') = 'confirmed', 'confirmation transitions status');
select pg_temp.expect((select count(*) from public.ledger_entries where conversion_id = :'c1') = 3, 'confirmation posted once (3 legs)');
select pg_temp.expect((select sum(amount) from public.ledger_entries where conversion_id = :'c1') = 0, 'ledger transaction balances to zero');
select pg_temp.expect(public.creator_bucket('00000000-0000-0000-0000-0000000000c1', 'TRY', 'pending') = 70.00, 'default rule: creator gets 70% of confirmed commission into pending');
select pg_temp.expect((select amount from public.ledger_entries e join public.ledger_accounts a on a.id = e.account_id where a.owner_type = 'platform' and e.conversion_id = :'c1') = 30.00, 'platform share 30%');

-- creator-specific rule overrides default
insert into public.commission_rules(name, creator_id, creator_share_bps, hold_days, valid_from) values ('VIP', '00000000-0000-0000-0000-0000000000c1', 8000, 0, now() - interval '10 days');
select public.ingest_conversion('70000000-0000-0000-0000-000000000001', 'EV-2', 'LINK1', 500, 50, 'TRY', now() - interval '1 hour', 'confirmed') as c2 \gset
select pg_temp.expect((select creator_share_bps from public.conversion_events where id = :'c2') = 8000, 'most specific commission rule applied');

-- attribution window: conversion 10 days after click with 7-day window is rejected
select public.ingest_conversion('70000000-0000-0000-0000-000000000001', 'EV-OLD', 'LINK1', 500, 50, 'TRY', now() + interval '9 days', 'confirmed') as c3 \gset
select pg_temp.expect((select status::text || ':' || reject_reason from public.conversion_events where id = :'c3') = 'rejected:no_attributable_click', 'outside attribution window is rejected');
select pg_temp.expect((select count(*) from public.ledger_entries where conversion_id = :'c3') = 0, 'rejected conversion posts nothing');

-- self purchase
insert into public.click_events(id, user_id, offer_id, creator_id, link_id, is_self_click, created_at) values
  ('73000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c1', '60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', '72000000-0000-0000-0000-000000000001', true, now() - interval '30 minutes');
select public.ingest_conversion('70000000-0000-0000-0000-000000000001', 'EV-SELF', 'LINK1', 500, 50, 'TRY', now() - interval '10 minutes', 'confirmed') as c4 \gset
select pg_temp.expect((select reject_reason from public.conversion_events where id = :'c4') = 'self_purchase', 'self-purchase excluded from commission');

-- ===== Release & reversal =====
do $$ begin
  perform public.release_conversion((select id from public.conversion_events where provider_event_id = 'EV-1'));
  raise exception 'should not reach';
exception when invalid_parameter_value then null; end $$;
select pg_temp.expect(true, 'cannot release before hold window ends');
select public.release_conversion(:'c2');
select pg_temp.expect(public.creator_bucket('00000000-0000-0000-0000-0000000000c1', 'TRY', 'approved') = 40.00, 'hold release moves funds pending → approved');

-- partial refund on pending conversion (c1: 100 commission, 70% creator) → refund 50 commission → -35 creator
select public.reverse_conversion(:'c1', 50, 'partial refund');
select pg_temp.expect(public.creator_bucket('00000000-0000-0000-0000-0000000000c1', 'TRY', 'pending') = 35.00, 'partial refund reverses proportional creator share');
select public.ingest_conversion('70000000-0000-0000-0000-000000000001', 'EV-1', 'LINK1', 1000, 100, 'TRY', now() - interval '1 day', 'reversed');
select pg_temp.expect((select status from public.conversion_events where id = :'c1') = 'reversed' and public.creator_bucket('00000000-0000-0000-0000-0000000000c1', 'TRY', 'pending') = 0, 'full provider reversal zeroes pending balance');
select public.reverse_conversion(:'c1', 100, 'again');
select pg_temp.expect((select reversed_amount from public.conversion_events where id = :'c1') = 100, 'reversal cannot exceed commission (idempotent)');
select pg_temp.expect((select sum(amount) from public.ledger_entries) = 0, 'whole ledger balances to zero');

-- ===== Immutability =====
do $$ begin
  update public.ledger_entries set amount = 999 where id = (select min(id) from public.ledger_entries);
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
do $$ begin
  delete from public.ledger_entries;
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect(true, 'ledger entries cannot be updated or deleted (even by service role)');

-- ===== Visibility =====
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select pg_temp.expect((select count(*) from public.ledger_entries) = 0 and (select count(*) from public.conversion_events) = 0, 'other users cannot see creator finances');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect((select count(*) from public.conversion_events) >= 4, 'creator sees own conversions');
select pg_temp.expect((select amount from public.creator_balances where currency = 'TRY' and bucket = 'approved') = 40.00, 'creator_balances view respects RLS');

-- ===== Payouts =====
do $$ begin
  perform public.request_payout('00000000-0000-0000-0000-0000000000c1', 'TRY', 10);
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect(true, 'payout blocked without verified payout account / KYC / tax form');
select pg_temp.as_service();
insert into public.payout_accounts(creator_id, provider, status, kyc_status, tax_form_status, payout_currency) values ('00000000-0000-0000-0000-0000000000c1', 'sandbox', 'verified', 'verified', 'accepted', 'TRY');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
do $$ begin
  perform public.request_payout('00000000-0000-0000-0000-0000000000c1', 'TRY', 1000);
  raise exception 'should not reach';
exception when invalid_parameter_value then null; end $$;
select pg_temp.expect(true, 'cannot request more than available');
select public.request_payout('00000000-0000-0000-0000-0000000000c1', 'TRY', 40) as p1 \gset
select pg_temp.expect(public.creator_bucket('00000000-0000-0000-0000-0000000000c1', 'TRY', 'approved') = 0 and public.creator_bucket('00000000-0000-0000-0000-0000000000c1', 'TRY', 'in_payout') = 40, 'requested funds are held');
do $$ begin
  perform public.review_payout((select id from public.payouts limit 1), true);
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect(true, 'creator cannot approve own payout');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select public.review_payout(:'p1', true, 'ok');
select pg_temp.expect((select status from public.payouts where id = :'p1') = 'approved', 'admin approves payout');
do $$ begin
  perform public.mark_payout_paid((select id from public.payouts limit 1), 'REF');
  raise exception 'should not reach';
exception when insufficient_privilege then null; end $$;
select pg_temp.expect((select status from public.payouts where id = :'p1') = 'approved', 'payout execution disabled by feature flag');
do $$ begin
  perform public.admin_set_flag('payout_execution', true);
end $$;
select public.mark_payout_paid(:'p1', 'SANDBOX-1');
select pg_temp.expect(public.creator_bucket('00000000-0000-0000-0000-0000000000c1', 'TRY', 'paid') = 40 and public.creator_bucket('00000000-0000-0000-0000-0000000000c1', 'TRY', 'in_payout') = 0, 'paid moves held funds to paid');
select pg_temp.as_admin_sql();
select pg_temp.expect((select count(*) from public.audit_logs where action in ('payout.approve','flag.set','conversion.confirm','conversion.reverse')) >= 4, 'financial actions are audited');
select pg_temp.expect((select sum(amount) from public.ledger_entries) = 0, 'ledger still balanced after payouts');

\echo 'ALL LEDGER TESTS PASSED'
