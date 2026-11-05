-- Shopfluence — Phase 4: Creator monetisation
-- Conversions (idempotent), attribution, commission rules, immutable double-entry ledger,
-- payout accounts / requests / batches. Payout EXECUTION is disabled by a feature flag until a
-- payout provider integration is verified. Clients can never write financial rows directly.

-- ---------------------------------------------------------------------------
-- Feature flags (admin-managed)
-- ---------------------------------------------------------------------------
create table public.feature_flags (
  key         text primary key,
  enabled     boolean not null default false,
  description text not null default '',
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
create policy "flags readable" on public.feature_flags for select using (true);
-- writes: admin RPC only
insert into public.feature_flags(key, enabled, description) values
  ('payout_execution', false, 'Allows approved payouts to be sent to the payout provider. Keep OFF until provider integration is verified.'),
  ('conversion_ingest', false, 'Accept conversion reports from affiliate networks.');

create or replace function public.flag(_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select enabled from public.feature_flags where key = _key), false);
$$;

create or replace function public.admin_set_flag(_key text, _enabled boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role('admin') then raise exception 'admin only' using errcode = '42501'; end if;
  update public.feature_flags set enabled = _enabled, updated_by = auth.uid(), updated_at = now() where key = _key;
  if not found then raise exception 'unknown flag' using errcode = 'P0002'; end if;
  perform public.audit('flag.set', 'feature_flag', _key, null, jsonb_build_object('enabled', _enabled));
end $$;

-- Only the service role (server ingestion jobs / signed webhooks) or admins may move money.
create or replace function public.require_finance_operator() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_service_role() or public.has_role('admin')) then
    raise exception 'finance operator only' using errcode = '42501';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Commission rules: confirmed merchant commission is split between creator and platform.
-- Most specific active rule wins (campaign > creator > organization > network > country > default).
-- ---------------------------------------------------------------------------
create table public.commission_rules (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  network_id         uuid references public.affiliate_networks(id),
  organization_id    uuid references public.organizations(id),
  creator_id         uuid references public.profiles(id),
  campaign_id        uuid,
  country            char(2),
  creator_share_bps  integer not null check (creator_share_bps between 0 and 10000),
  hold_days          smallint not null default 30 check (hold_days between 0 and 180),
  valid_from         timestamptz not null default now(),
  valid_to           timestamptz,
  created_by         uuid references auth.users(id),
  created_at         timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from)
);
alter table public.commission_rules enable row level security;
create policy "staff read rules" on public.commission_rules for select using (public.is_staff());
create policy "creator reads own rules" on public.commission_rules for select using (creator_id is not null and public.can_act_as(creator_id));
create policy "org reads own rules" on public.commission_rules for select using (organization_id is not null and public.is_org_member(organization_id, 'analyst'));
-- writes: admin RPC / service role only (no policies)

insert into public.commission_rules(name, creator_share_bps, hold_days, valid_from) values ('Platform default', 7000, 30, '2020-01-01');

create or replace function public.resolve_commission_rule(_network uuid, _org uuid, _creator uuid, _campaign uuid, _country char(2), _at timestamptz)
returns public.commission_rules language sql stable security definer set search_path = public as $$
  select r.* from public.commission_rules r
  where r.valid_from <= _at and (r.valid_to is null or r.valid_to > _at)
    and (r.network_id is null or r.network_id = _network)
    and (r.organization_id is null or r.organization_id = _org)
    and (r.creator_id is null or r.creator_id = _creator)
    and (r.campaign_id is null or r.campaign_id = _campaign)
    and (r.country is null or r.country = _country)
  order by (r.campaign_id is not null) desc, (r.creator_id is not null) desc, (r.organization_id is not null) desc,
           (r.network_id is not null) desc, (r.country is not null) desc, r.valid_from desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Conversions — one row per provider event; (network, provider_event_id) is the idempotency key.
-- ---------------------------------------------------------------------------
create type public.conversion_status as enum ('reported', 'confirmed', 'approved', 'reversed', 'rejected');

create table public.conversion_events (
  id                  uuid primary key default gen_random_uuid(),
  network_id          uuid not null references public.affiliate_networks(id),
  provider_event_id   text not null check (char_length(provider_event_id) between 1 and 200),
  link_id             uuid references public.affiliate_links(id),
  click_id            uuid references public.click_events(id),
  creator_id          uuid references public.profiles(id),
  offer_id            uuid references public.product_offers(id),
  country             char(2),
  order_amount        numeric(14,2) not null check (order_amount >= 0),
  commission_amount   numeric(14,2) not null check (commission_amount >= 0),  -- confirmed merchant commission
  currency            char(3) not null,
  status              public.conversion_status not null default 'reported',
  reject_reason       text,
  is_self_purchase    boolean not null default false,
  rule_id             uuid references public.commission_rules(id),
  creator_share_bps   integer,
  occurred_at         timestamptz not null,
  confirmed_at        timestamptz,
  hold_until          timestamptz,
  reversed_amount     numeric(14,2) not null default 0 check (reversed_amount >= 0),
  raw                 jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  unique (network_id, provider_event_id),
  check (reversed_amount <= commission_amount)
);
create index conversion_events_creator_idx on public.conversion_events(creator_id, occurred_at desc);
alter table public.conversion_events enable row level security;
create policy "creator reads own conversions" on public.conversion_events for select using ((creator_id is not null and public.can_act_as(creator_id)) or public.is_staff());

create table public.conversion_items (
  id            uuid primary key default gen_random_uuid(),
  conversion_id uuid not null references public.conversion_events(id) on delete cascade,
  sku           text,
  product_id    uuid references public.products(id),
  quantity      integer not null default 1 check (quantity > 0),
  amount        numeric(14,2) not null check (amount >= 0)
);
alter table public.conversion_items enable row level security;
create policy "items follow conversion" on public.conversion_items for select
  using (exists (select 1 from public.conversion_events c where c.id = conversion_id and ((c.creator_id is not null and public.can_act_as(c.creator_id)) or public.is_staff())));

create table public.attribution_records (
  conversion_id uuid primary key references public.conversion_events(id) on delete cascade,
  click_id      uuid references public.click_events(id),
  model         text not null default 'last_click',
  window_days   smallint not null,
  within_window boolean not null,
  created_at    timestamptz not null default now()
);
alter table public.attribution_records enable row level security;
create policy "staff read attribution" on public.attribution_records for select using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Immutable double-entry ledger. Each conversion's entries sum to zero per currency.
-- Buckets: pending (inside hold window) → approved (withdrawable) → in_payout → paid.
-- ---------------------------------------------------------------------------
create table public.ledger_accounts (
  id         uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('creator', 'platform', 'network_receivable', 'payout_clearing')),
  owner_id   uuid,
  currency   char(3) not null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (owner_type, owner_id, currency)
);
alter table public.ledger_accounts enable row level security;
create policy "creator reads own accounts" on public.ledger_accounts for select
  using ((owner_type = 'creator' and public.can_act_as(owner_id)) or public.has_role('admin'));

create table public.ledger_entries (
  id             bigint generated always as identity primary key,
  txn_id         uuid not null,              -- groups the balanced legs of one movement
  account_id     uuid not null references public.ledger_accounts(id),
  bucket         text not null check (bucket in ('pending', 'approved', 'in_payout', 'paid', 'none')),
  entry_type     text not null check (entry_type in ('commission', 'release', 'reversal', 'payout_hold', 'payout_release', 'payout_paid', 'adjustment')),
  amount         numeric(14,2) not null check (amount <> 0),
  currency       char(3) not null,
  fx_rate_snapshot numeric(18,8),            -- informational only; balances are never converted
  conversion_id  uuid references public.conversion_events(id),
  payout_id      uuid,
  memo           text not null default '',
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now()
);
create index ledger_entries_account_idx on public.ledger_entries(account_id, bucket);
create index ledger_entries_txn_idx on public.ledger_entries(txn_id);
alter table public.ledger_entries enable row level security;
create policy "creator reads own entries" on public.ledger_entries for select
  using (exists (select 1 from public.ledger_accounts a where a.id = account_id and ((a.owner_type = 'creator' and public.can_act_as(a.owner_id)) or public.has_role('admin'))));

create or replace function public.ledger_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'ledger entries are immutable; post a reversing entry instead' using errcode = '42501';
end $$;
create trigger ledger_entries_no_update before update or delete on public.ledger_entries for each row execute function public.ledger_immutable();
create trigger ledger_entries_no_truncate before truncate on public.ledger_entries execute function public.ledger_immutable();

create or replace function public.ledger_account(_type text, _owner uuid, _currency char(3)) returns uuid
language plpgsql security definer set search_path = public as $$
declare acc uuid;
begin
  select id into acc from public.ledger_accounts where owner_type = _type and owner_id is not distinct from _owner and currency = _currency;
  if acc is null then
    insert into public.ledger_accounts(owner_type, owner_id, currency) values (_type, _owner, _currency)
      on conflict do nothing returning id into acc;
    if acc is null then
      select id into acc from public.ledger_accounts where owner_type = _type and owner_id is not distinct from _owner and currency = _currency;
    end if;
  end if;
  return acc;
end $$;

-- Every transaction must balance (sum = 0) — checked at commit.
create or replace function public.ledger_check_balance() returns trigger
language plpgsql as $$
begin
  if (select sum(amount) from public.ledger_entries where txn_id = new.txn_id) <> 0 then
    raise exception 'unbalanced ledger transaction %', new.txn_id using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger ledger_entries_balanced after insert on public.ledger_entries
  deferrable initially deferred for each row execute function public.ledger_check_balance();

create or replace function public.post_entry(_txn uuid, _acc uuid, _bucket text, _type text, _amount numeric, _currency char(3), _conversion uuid, _payout uuid, _memo text)
returns void language sql security definer set search_path = public as $$
  insert into public.ledger_entries(txn_id, account_id, bucket, entry_type, amount, currency, conversion_id, payout_id, memo, created_by)
  select _txn, _acc, _bucket, _type, _amount, _currency, _conversion, _payout, _memo, auth.uid() where _amount <> 0;
$$;

-- Creator balances per currency & bucket (never summed across currencies)
create or replace view public.creator_balances with (security_invoker = true) as
  select a.owner_id as creator_id, e.currency, e.bucket, sum(e.amount) as amount
  from public.ledger_entries e join public.ledger_accounts a on a.id = e.account_id
  where a.owner_type = 'creator'
  group by a.owner_id, e.currency, e.bucket;

-- ---------------------------------------------------------------------------
-- Ingestion & lifecycle (service role / admin only)
-- ---------------------------------------------------------------------------
create or replace function public.ingest_conversion(
  _network uuid, _provider_event_id text, _link_code text, _order_amount numeric, _commission numeric,
  _currency char(3), _occurred_at timestamptz, _status text default 'reported', _raw jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare conv uuid; lnk public.affiliate_links; clk public.click_events; prog public.affiliate_programs; win smallint := 30; existing public.conversion_events;
begin
  perform public.require_finance_operator();
  -- idempotency: the same provider event is processed once; later reports only move status forward
  select * into existing from public.conversion_events where network_id = _network and provider_event_id = _provider_event_id;
  if found then
    if _status = 'confirmed' and existing.status = 'reported' then perform public.confirm_conversion(existing.id);
    elsif _status = 'reversed' and existing.status in ('reported','confirmed','approved') then perform public.reverse_conversion(existing.id, existing.commission_amount - existing.reversed_amount, 'provider reversal');
    end if;
    return existing.id;
  end if;

  select * into lnk from public.affiliate_links where code = _link_code;
  if lnk.program_id is not null then select * into prog from public.affiliate_programs where id = lnk.program_id; win := coalesce(prog.attribution_window_days, 30); end if;
  select * into clk from public.click_events where link_id = lnk.id and created_at <= _occurred_at order by created_at desc limit 1;

  insert into public.conversion_events(network_id, provider_event_id, link_id, click_id, creator_id, offer_id, order_amount, commission_amount, currency, occurred_at, raw, is_self_purchase, country)
  values (_network, _provider_event_id, lnk.id, clk.id, lnk.creator_id, lnk.offer_id, _order_amount, _commission, upper(_currency), _occurred_at, _raw, coalesce(clk.is_self_click, false), clk.country)
  returning id into conv;

  insert into public.attribution_records(conversion_id, click_id, window_days, within_window)
  values (conv, clk.id, win, clk.id is not null and clk.created_at >= _occurred_at - make_interval(days => win));

  if lnk.id is null or clk.id is null or not (clk.created_at >= _occurred_at - make_interval(days => win)) then
    update public.conversion_events set status = 'rejected', reject_reason = 'no_attributable_click' where id = conv;
  elsif coalesce(clk.is_self_click, false) then
    update public.conversion_events set status = 'rejected', reject_reason = 'self_purchase' where id = conv;
  elsif _status = 'confirmed' then
    perform public.confirm_conversion(conv);
  end if;
  return conv;
end $$;

-- Confirmed by merchant/network: split commission, post pending ledger legs.
create or replace function public.confirm_conversion(_conv uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.conversion_events; r public.commission_rules; creator_amt numeric; platform_amt numeric; txn uuid := gen_random_uuid(); org uuid;
begin
  perform public.require_finance_operator();
  select * into c from public.conversion_events where id = _conv for update;
  if c.status <> 'reported' then return; end if;  -- idempotent
  select p.organization_id into org from public.product_offers o join public.products p on p.id = o.product_id where o.id = c.offer_id;
  select * into r from public.resolve_commission_rule(c.network_id, org, c.creator_id, null, c.country, c.occurred_at);
  if r.id is null then raise exception 'no commission rule' using errcode = 'P0002'; end if;
  creator_amt := round(c.commission_amount * r.creator_share_bps / 10000.0, 2);
  platform_amt := c.commission_amount - creator_amt;
  update public.conversion_events set status = 'confirmed', confirmed_at = now(), rule_id = r.id, creator_share_bps = r.creator_share_bps,
    hold_until = now() + make_interval(days => r.hold_days) where id = _conv;
  perform public.post_entry(txn, public.ledger_account('network_receivable', c.network_id, c.currency), 'none', 'commission', -c.commission_amount, c.currency, _conv, null, 'merchant commission confirmed');
  perform public.post_entry(txn, public.ledger_account('creator', c.creator_id, c.currency), 'pending', 'commission', creator_amt, c.currency, _conv, null, 'creator share');
  perform public.post_entry(txn, public.ledger_account('platform', null, c.currency), 'none', 'commission', platform_amt, c.currency, _conv, null, 'platform share');
  perform public.audit('conversion.confirm', 'conversion', _conv::text, null, jsonb_build_object('creator', creator_amt, 'platform', platform_amt));
end $$;

-- After the hold window: pending → approved.
create or replace function public.release_conversion(_conv uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.conversion_events; pend numeric; acc uuid; txn uuid := gen_random_uuid();
begin
  perform public.require_finance_operator();
  select * into c from public.conversion_events where id = _conv for update;
  if c.status <> 'confirmed' then return; end if;
  if c.hold_until > now() then raise exception 'hold window not over' using errcode = '22023'; end if;
  acc := public.ledger_account('creator', c.creator_id, c.currency);
  select coalesce(sum(amount), 0) into pend from public.ledger_entries where conversion_id = _conv and account_id = acc and bucket = 'pending';
  perform public.post_entry(txn, acc, 'pending', 'release', -pend, c.currency, _conv, null, 'hold released');
  perform public.post_entry(txn, acc, 'approved', 'release', pend, c.currency, _conv, null, 'hold released');
  update public.conversion_events set status = 'approved' where id = _conv;
end $$;

-- Refund / cancellation: reverse proportionally from wherever the creator's share sits.
create or replace function public.reverse_conversion(_conv uuid, _commission_reversed numeric, _reason text) returns void
language plpgsql security definer set search_path = public as $$
declare c public.conversion_events; creator_rev numeric; platform_rev numeric; acc uuid; bucket text; txn uuid := gen_random_uuid(); amt numeric;
begin
  perform public.require_finance_operator();
  select * into c from public.conversion_events where id = _conv for update;
  if c.status in ('rejected') then return; end if;
  amt := least(_commission_reversed, c.commission_amount - c.reversed_amount);
  if amt <= 0 then return; end if;
  if c.status = 'reported' then
    update public.conversion_events set status = 'reversed', reversed_amount = reversed_amount + amt, reject_reason = _reason where id = _conv;
    return;
  end if;
  creator_rev := round(amt * c.creator_share_bps / 10000.0, 2);
  platform_rev := amt - creator_rev;
  bucket := case when c.status = 'confirmed' then 'pending' else 'approved' end;  -- approved/paid → clawback from approved (may go negative)
  acc := public.ledger_account('creator', c.creator_id, c.currency);
  perform public.post_entry(txn, public.ledger_account('network_receivable', c.network_id, c.currency), 'none', 'reversal', amt, c.currency, _conv, null, _reason);
  perform public.post_entry(txn, acc, bucket, 'reversal', -creator_rev, c.currency, _conv, null, _reason);
  perform public.post_entry(txn, public.ledger_account('platform', null, c.currency), 'none', 'reversal', -platform_rev, c.currency, _conv, null, _reason);
  update public.conversion_events set reversed_amount = reversed_amount + amt,
    status = case when reversed_amount + amt >= commission_amount then 'reversed'::public.conversion_status else status end where id = _conv;
  perform public.audit('conversion.reverse', 'conversion', _conv::text, null, jsonb_build_object('amount', amt, 'reason', _reason));
end $$;

-- ---------------------------------------------------------------------------
-- Payouts
-- ---------------------------------------------------------------------------
create table public.payout_accounts (
  creator_id        uuid primary key references public.profiles(id) on delete cascade,
  provider          text not null default 'unconfigured',
  provider_account_ref text,                 -- id at the provider; bank details are never stored here
  status            text not null default 'not_started' check (status in ('not_started','pending_verification','verified','rejected','disabled')),
  kyc_status        text not null default 'not_started' check (kyc_status in ('not_started','pending','verified','failed')),
  tax_form_status   text not null default 'not_started' check (tax_form_status in ('not_started','submitted','accepted','rejected')),
  payout_currency   char(3),
  updated_at        timestamptz not null default now()
);
alter table public.payout_accounts enable row level security;
create policy "creator reads own payout account" on public.payout_accounts for select using (public.can_act_as(creator_id) or public.has_role('admin'));
-- status fields are set by provider webhooks (service role) only

create table public.payouts (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references public.profiles(id),
  currency     char(3) not null,
  amount       numeric(14,2) not null check (amount > 0),
  status       text not null default 'requested' check (status in ('requested','approved','rejected','processing','paid','failed','cancelled')),
  batch_id     uuid,
  requested_at timestamptz not null default now(),
  reviewed_by  uuid references auth.users(id),
  reviewed_at  timestamptz,
  provider_ref text,
  failure_reason text
);
create index payouts_creator_idx on public.payouts(creator_id, requested_at desc);
alter table public.payouts enable row level security;
create policy "creator reads own payouts" on public.payouts for select using (public.can_act_as(creator_id) or public.has_role('admin'));

create table public.payout_batches (
  id         uuid primary key default gen_random_uuid(),
  currency   char(3) not null,
  status     text not null default 'draft' check (status in ('draft','submitted','completed','failed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.payout_batches enable row level security;
create policy "admins read batches" on public.payout_batches for select using (public.has_role('admin'));

create table public.payout_events (
  id         bigint generated always as identity primary key,
  payout_id  uuid not null references public.payouts(id) on delete cascade,
  status     text not null,
  note       text not null default '',
  actor_id   uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.payout_events enable row level security;
create policy "payout events follow payout" on public.payout_events for select
  using (exists (select 1 from public.payouts p where p.id = payout_id and (public.can_act_as(p.creator_id) or public.has_role('admin'))));

create or replace function public.creator_bucket(_creator uuid, _currency char(3), _bucket text) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(e.amount), 0) from public.ledger_entries e join public.ledger_accounts a on a.id = e.account_id
  where a.owner_type = 'creator' and a.owner_id = _creator and e.currency = _currency and e.bucket = _bucket;
$$;

-- Creator requests a payout of approved funds. Funds move to in_payout (held) until reviewed.
create or replace function public.request_payout(_creator uuid, _currency char(3), _amount numeric) returns uuid
language plpgsql security definer set search_path = public as $$
declare acct public.payout_accounts; avail numeric; pid uuid; txn uuid := gen_random_uuid(); acc uuid;
begin
  if not public.can_act_as(_creator) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into acct from public.payout_accounts where creator_id = _creator;
  if acct.status is distinct from 'verified' or acct.kyc_status is distinct from 'verified' or acct.tax_form_status is distinct from 'accepted' then
    raise exception 'payout_account_not_verified' using errcode = '42501';
  end if;
  if exists (select 1 from public.payouts where creator_id = _creator and currency = _currency and status in ('requested','approved','processing')) then
    raise exception 'payout_already_open' using errcode = '23505';
  end if;
  acc := public.ledger_account('creator', _creator, _currency);
  perform pg_advisory_xact_lock(hashtext(acc::text));
  avail := public.creator_bucket(_creator, _currency, 'approved');
  if _amount <= 0 or _amount > avail then raise exception 'insufficient_available_balance' using errcode = '22023'; end if;
  insert into public.payouts(creator_id, currency, amount) values (_creator, _currency, _amount) returning id into pid;
  perform public.post_entry(txn, acc, 'approved', 'payout_hold', -_amount, _currency, null, pid, 'payout requested');
  perform public.post_entry(txn, acc, 'in_payout', 'payout_hold', _amount, _currency, null, pid, 'payout requested');
  insert into public.payout_events(payout_id, status, actor_id) values (pid, 'requested', auth.uid());
  return pid;
end $$;

-- Admin review. Rejection returns held funds to approved.
create or replace function public.review_payout(_payout uuid, _approve boolean, _note text default '') returns void
language plpgsql security definer set search_path = public as $$
declare p public.payouts; acc uuid; txn uuid := gen_random_uuid();
begin
  if not public.has_role('admin') then raise exception 'admin only' using errcode = '42501'; end if;
  select * into p from public.payouts where id = _payout for update;
  if p.status <> 'requested' then raise exception 'invalid_state' using errcode = '22023'; end if;
  if (select user_id from public.profiles where id = p.creator_id) = auth.uid() then raise exception 'cannot review own payout' using errcode = '42501'; end if;
  if _approve then
    update public.payouts set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() where id = _payout;
  else
    acc := public.ledger_account('creator', p.creator_id, p.currency);
    perform public.post_entry(txn, acc, 'in_payout', 'payout_release', -p.amount, p.currency, null, _payout, 'payout rejected');
    perform public.post_entry(txn, acc, 'approved', 'payout_release', p.amount, p.currency, null, _payout, 'payout rejected');
    update public.payouts set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), failure_reason = _note where id = _payout;
  end if;
  insert into public.payout_events(payout_id, status, note, actor_id) values (_payout, case when _approve then 'approved' else 'rejected' end, _note, auth.uid());
  perform public.audit(case when _approve then 'payout.approve' else 'payout.reject' end, 'payout', _payout::text, null, jsonb_build_object('note', _note));
end $$;

-- Execution is blocked until the payout_execution flag is turned on after provider verification.
create or replace function public.mark_payout_paid(_payout uuid, _provider_ref text) returns void
language plpgsql security definer set search_path = public as $$
declare p public.payouts; acc uuid; txn uuid := gen_random_uuid();
begin
  perform public.require_finance_operator();
  if not public.flag('payout_execution') then raise exception 'payout_execution_disabled' using errcode = '42501'; end if;
  select * into p from public.payouts where id = _payout for update;
  if p.status not in ('approved','processing') then raise exception 'invalid_state' using errcode = '22023'; end if;
  acc := public.ledger_account('creator', p.creator_id, p.currency);
  perform public.post_entry(txn, acc, 'in_payout', 'payout_paid', -p.amount, p.currency, null, _payout, 'paid out');
  perform public.post_entry(txn, acc, 'paid', 'payout_paid', p.amount, p.currency, null, _payout, 'paid out');
  update public.payouts set status = 'paid', provider_ref = _provider_ref where id = _payout;
  insert into public.payout_events(payout_id, status, actor_id) values (_payout, 'paid', auth.uid());
end $$;

-- Reconciliation jobs (network report imports)
create table public.reconciliation_jobs (
  id          uuid primary key default gen_random_uuid(),
  network_id  uuid not null references public.affiliate_networks(id),
  period_from date not null,
  period_to   date not null,
  status      text not null default 'queued' check (status in ('queued','running','completed','failed')),
  imported    integer not null default 0,
  duplicates  integer not null default 0,
  reversed    integer not null default 0,
  mismatches  jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.reconciliation_jobs enable row level security;
create policy "admins read reconciliation" on public.reconciliation_jobs for select using (public.has_role('admin'));
