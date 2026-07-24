create table if not exists public.meli_connections (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  meli_user_id text not null,
  access_token text not null,
  refresh_token text not null,
  token_type text not null default 'bearer',
  scope text,
  expires_at timestamptz,
  connected_at timestamptz not null default now(),
  last_refreshed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meli_notification_events (
  id uuid primary key default gen_random_uuid(),
  topic text,
  resource text,
  user_id text,
  application_id text,
  attempts integer,
  payload jsonb not null default '{}'::jsonb,
  headers jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists meli_connections_auth_user_idx
  on public.meli_connections (auth_user_id);

create index if not exists meli_connections_meli_user_idx
  on public.meli_connections (meli_user_id);

create index if not exists meli_notification_events_received_idx
  on public.meli_notification_events (received_at desc);

drop trigger if exists meli_connections_set_updated_at on public.meli_connections;
create trigger meli_connections_set_updated_at
before update on public.meli_connections
for each row execute procedure public.set_updated_at();

alter table public.meli_connections enable row level security;
alter table public.meli_notification_events enable row level security;
