-- Shopfluence — Phase 3 (catalog subset needed by Phase 2 product tags):
-- marketplaces, canonical products, variants, offers, proposals, price alerts,
-- affiliate network/program/link registry and click events.
-- Conversions, commission ledger and payouts are intentionally NOT created yet (Phase 4).

create table public.marketplaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        citext not null unique,
  website     text not null check (website ~ '^https://'),
  logo_url    text,
  countries   char(2)[] not null default '{}',
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.marketplaces enable row level security;
create policy "active marketplaces public" on public.marketplaces for select using (is_active or public.is_staff());
-- writes: service role / admin console only

create table public.products (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete set null,
  brand_profile_id uuid references public.profiles(id) on delete set null,
  brand_name       text not null check (char_length(brand_name) between 1 and 120),
  title            text not null check (char_length(title) between 2 and 200),
  description      text not null default '' check (char_length(description) <= 5000),
  category         text not null,
  images           text[] not null default '{}',
  countries        char(2)[] not null default '{}',
  status           text not null default 'pending_review' check (status in ('approved','pending_review','rejected')),
  submitted_by     uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index products_category_idx on public.products(category) where status = 'approved';
create index products_search_idx on public.products using gin (to_tsvector('simple', brand_name || ' ' || title));
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();
alter table public.products enable row level security;
create policy "approved products public" on public.products for select
  using (status = 'approved' or submitted_by = auth.uid() or public.is_staff() or (organization_id is not null and public.is_org_member(organization_id)));
create policy "org managers create products" on public.products for insert
  with check (organization_id is not null and public.is_org_member(organization_id, 'manager') and status = 'pending_review');
create policy "org managers edit products" on public.products for update
  using (organization_id is not null and public.is_org_member(organization_id, 'manager'))
  with check (organization_id is not null and public.is_org_member(organization_id, 'manager'));
create policy "staff review products" on public.products for update using (public.is_staff());

-- Distinct variants are never merged: identity = (product, GTIN) or (product, variant attributes)
create table public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  label       text not null,
  attributes  jsonb not null default '{}'::jsonb,
  gtin        text check (gtin is null or gtin ~ '^[0-9]{8,14}$'),
  mpn         text,
  created_at  timestamptz not null default now(),
  unique (product_id, label)
);
create unique index product_variants_gtin_uq on public.product_variants(gtin) where gtin is not null;
alter table public.product_variants enable row level security;
create policy "variants follow product" on public.product_variants for select
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "org managers manage variants" on public.product_variants for all
  using (exists (select 1 from public.products p where p.id = product_id and p.organization_id is not null and public.is_org_member(p.organization_id, 'manager')))
  with check (exists (select 1 from public.products p where p.id = product_id and p.organization_id is not null and public.is_org_member(p.organization_id, 'manager')));

-- Offers come from merchant feeds / partner APIs (server-side ingestion). Clients cannot write prices.
create table public.product_offers (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references public.products(id) on delete cascade,
  variant_id         uuid references public.product_variants(id) on delete cascade,
  marketplace_id     uuid not null references public.marketplaces(id) on delete cascade,
  merchant_sku       text,
  country            char(2) not null,
  price              numeric(14,2) not null check (price >= 0),
  currency           char(3) not null,
  shipping_cost      numeric(14,2) check (shipping_cost is null or shipping_cost >= 0),
  availability       text not null default 'unknown' check (availability in ('in_stock','out_of_stock','unknown')),
  price_source       text not null check (price_source in ('merchant_feed','partner_api','manual_estimate')),
  last_updated       timestamptz not null,
  affiliate_program_id uuid,
  destination_url    text check (destination_url is null or destination_url ~ '^https://'),
  created_at         timestamptz not null default now(),
  unique (product_id, variant_id, marketplace_id, country)
);
create index product_offers_product_idx on public.product_offers(product_id, country);
alter table public.product_offers enable row level security;
create policy "offers public with product" on public.product_offers for select
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'approved'));

alter table public.post_products
  add constraint post_products_product_fk foreign key (product_id) references public.products(id) on delete cascade,
  add column variant_id uuid references public.product_variants(id) on delete set null;

-- Creator-proposed products enter a review workflow (never auto-approved)
create table public.product_proposals (
  id           uuid primary key default gen_random_uuid(),
  proposed_by  uuid not null references public.profiles(id) on delete cascade,
  brand_name   text not null,
  title        text not null,
  variant      text,
  url          text not null check (url ~ '^https://'),
  gtin         text check (gtin is null or gtin ~ '^[0-9]{8,14}$'),
  category     text not null,
  note         text not null default '' check (char_length(note) <= 1000),
  status       text not null default 'pending' check (status in ('pending','matched','approved','rejected')),
  matched_product_id uuid references public.products(id),
  match_confidence numeric(4,3) check (match_confidence between 0 and 1),
  reviewed_by  uuid references auth.users(id),
  created_at   timestamptz not null default now()
);
alter table public.product_proposals enable row level security;
create policy "own proposals" on public.product_proposals for select using (public.can_act_as(proposed_by) or public.is_staff());
create policy "propose" on public.product_proposals for insert with check (public.can_act_as(proposed_by) and status = 'pending');
create policy "staff review proposals" on public.product_proposals for update using (public.is_staff());

create table public.price_alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  target_price numeric(14,2) not null check (target_price > 0),
  currency     char(3) not null,
  created_at   timestamptz not null default now(),
  unique (user_id, product_id, currency)
);
alter table public.price_alerts enable row level security;
create policy "own price alerts" on public.price_alerts for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Affiliate registry (configuration only — no tracking claims until verified)
-- ---------------------------------------------------------------------------
create table public.affiliate_networks (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  integration    text not null check (integration in ('api','postback','report_import','none')),
  status         text not null default 'not_configured' check (status in ('not_configured','sandbox','verified','suspended')),
  webhook_secret_ref text,  -- name of the server-side secret, never the secret itself
  created_at     timestamptz not null default now()
);
alter table public.affiliate_networks enable row level security;
create policy "staff read networks" on public.affiliate_networks for select using (public.is_staff());

create table public.affiliate_programs (
  id                uuid primary key default gen_random_uuid(),
  network_id        uuid not null references public.affiliate_networks(id) on delete cascade,
  marketplace_id    uuid references public.marketplaces(id),
  organization_id   uuid references public.organizations(id),
  name              text not null,
  countries         char(2)[] not null default '{}',
  attribution_window_days smallint not null default 30 check (attribution_window_days between 1 and 90),
  agreement_reference text,  -- contract id; programs without an agreement cannot be activated
  status            text not null default 'draft' check (status in ('draft','active','paused','ended')),
  created_at        timestamptz not null default now(),
  check (status <> 'active' or agreement_reference is not null)
);
alter table public.affiliate_programs enable row level security;
create policy "staff read programs" on public.affiliate_programs for select using (public.is_staff() or (organization_id is not null and public.is_org_member(organization_id)));

alter table public.product_offers add constraint product_offers_program_fk foreign key (affiliate_program_id) references public.affiliate_programs(id) on delete set null;

create table public.affiliate_links (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.profiles(id) on delete cascade,
  offer_id    uuid not null references public.product_offers(id) on delete cascade,
  program_id  uuid references public.affiliate_programs(id),
  code        text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at  timestamptz not null default now(),
  unique (creator_id, offer_id)
);
alter table public.affiliate_links enable row level security;
create policy "creator reads own links" on public.affiliate_links for select using (public.can_act_as(creator_id) or public.is_staff());
create policy "creator creates own links" on public.affiliate_links for insert with check (public.can_act_as(creator_id));

-- Click events are written only by the redirect RPC. A click is never a sale.
create table public.click_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  offer_id     uuid not null references public.product_offers(id) on delete cascade,
  post_id      uuid references public.posts(id) on delete set null,
  creator_id   uuid references public.profiles(id) on delete set null,
  link_id      uuid references public.affiliate_links(id) on delete set null,
  country      char(2),
  is_self_click boolean not null default false,
  created_at   timestamptz not null default now()
);
create index click_events_creator_idx on public.click_events(creator_id, created_at desc);
create index click_events_offer_idx on public.click_events(offer_id, created_at desc);
alter table public.click_events enable row level security;
create policy "creator reads attributed clicks" on public.click_events for select using ((creator_id is not null and public.can_act_as(creator_id)) or public.is_staff());

-- Authorized redirect: logs the click and returns the merchant-provided destination (or null if not configured).
create or replace function public.outbound_redirect(_offer uuid, _post uuid default null, _creator uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare dest text; link uuid; self boolean;
begin
  select destination_url into dest from public.product_offers o
    join public.products p on p.id = o.product_id and p.status = 'approved'
    where o.id = _offer;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  -- rate limit per user: 60 outbound clicks / 10 min
  if auth.uid() is not null and (select count(*) from public.click_events where user_id = auth.uid() and created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  self := _creator is not null and exists (select 1 from public.profiles where id = _creator and user_id = auth.uid());
  select id into link from public.affiliate_links where creator_id = _creator and offer_id = _offer;
  insert into public.click_events(user_id, offer_id, post_id, creator_id, link_id, is_self_click)
    values (auth.uid(), _offer, _post, _creator, link, self);
  return dest;
end $$;
