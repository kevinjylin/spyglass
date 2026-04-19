-- SpyGlass — Postgres schema + RLS policies
-- Apply in the Supabase SQL editor, or via `supabase db push` if using the CLI.

create table if not exists tweets (
  id text primary key,
  text text not null,
  neutral_text text,
  author_handle_hash text,
  url text,
  overall_verdict text,
  created_at timestamptz default now(),
  checked_at timestamptz,
  -- Optional media + engagement captured by the extension
  image_url text,
  author_handle text,
  author_name text,
  like_count integer,
  retweet_count integer,
  reply_count integer,
  view_count integer
);

-- Back-fill columns on existing deployments
alter table tweets add column if not exists image_url text;
alter table tweets add column if not exists author_handle text;
alter table tweets add column if not exists author_name text;
alter table tweets add column if not exists like_count integer;
alter table tweets add column if not exists retweet_count integer;
alter table tweets add column if not exists reply_count integer;
alter table tweets add column if not exists view_count integer;

create table if not exists claims (
  id bigserial primary key,
  tweet_id text references tweets(id) on delete cascade,
  text text not null,
  claim_type text,
  verdict text,
  explanation text,
  created_at timestamptz default now()
);

create table if not exists verifications (
  id bigserial primary key,
  claim_id bigint references claims(id) on delete cascade,
  source_url text,
  source_title text,
  excerpt text,
  model text,
  created_at timestamptz default now()
);

create index if not exists tweets_created_at_idx on tweets (created_at desc);
create index if not exists tweets_verdict_idx on tweets (overall_verdict);
create index if not exists claims_tweet_id_idx on claims (tweet_id);
create index if not exists verifications_claim_id_idx on verifications (claim_id);

alter table tweets enable row level security;
alter table claims enable row level security;
alter table verifications enable row level security;

drop policy if exists "public read tweets" on tweets;
drop policy if exists "public read claims" on claims;
drop policy if exists "public read verif" on verifications;

create policy "public read tweets" on tweets for select using (true);
create policy "public read claims" on claims for select using (true);
create policy "public read verif" on verifications for select using (true);

-- Realtime
alter publication supabase_realtime add table tweets;
