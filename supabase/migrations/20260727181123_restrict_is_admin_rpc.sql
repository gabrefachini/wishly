-- is_admin_user is used by authenticated RLS policies and admin RPCs, but it
-- must not be exposed as an anonymous RPC.
revoke all on function public.is_admin_user() from public;
revoke all on function public.is_admin_user() from anon;
grant execute on function public.is_admin_user() to authenticated;
