drop policy if exists "meli_connections_owner_select" on public.meli_connections;
create policy "meli_connections_owner_select"
  on public.meli_connections
  for select
  to authenticated
  using ((select auth.uid()) = auth_user_id);
