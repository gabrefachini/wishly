alter table public.meli_connections
  add column if not exists is_platform boolean not null default false;

create unique index if not exists meli_connections_single_active_platform_idx
  on public.meli_connections ((is_platform))
  where is_platform = true
    and revoked_at is null;

update public.meli_connections mc
set is_platform = true
from auth.users au
join public.admin_users admin
  on lower(trim(admin.email)) = lower(trim(au.email))
 and admin.active = true
where mc.auth_user_id = au.id
  and mc.revoked_at is null
  and not exists (
    select 1
    from public.meli_connections existing
    where existing.is_platform = true
      and existing.revoked_at is null
  );
