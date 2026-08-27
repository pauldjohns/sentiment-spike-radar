-- Table to track StockTwits API usage for shared rate limiting
create table if not exists public.stocktwits_api_usage (
  id bigserial primary key,
  api_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists stocktwits_api_usage_key_idx on public.stocktwits_api_usage(api_key, created_at);

alter table public.stocktwits_api_usage enable row level security;
create policy if not exists "stocktwits_api_usage_public" on public.stocktwits_api_usage for all using (true);
