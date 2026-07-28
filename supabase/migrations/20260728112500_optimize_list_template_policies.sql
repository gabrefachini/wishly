-- Evita políticas permissivas sobrepostas no SELECT autenticado.
-- Visitantes continuam vendo apenas modelos publicados; admins autenticados
-- também podem revisar rascunhos sem duplicar a avaliação das políticas.

drop policy if exists "list_templates_public_select" on public.list_templates;
drop policy if exists "list_templates_admin_all" on public.list_templates;

create policy "list_templates_public_select"
  on public.list_templates for select
  to anon
  using (published = true);

create policy "list_templates_authenticated_select"
  on public.list_templates for select
  to authenticated
  using (published = true or public.is_admin_user());

create policy "list_templates_admin_insert"
  on public.list_templates for insert
  to authenticated
  with check (public.is_admin_user());

create policy "list_templates_admin_update"
  on public.list_templates for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "list_templates_admin_delete"
  on public.list_templates for delete
  to authenticated
  using (public.is_admin_user());

drop policy if exists "list_template_items_public_select" on public.list_template_items;
drop policy if exists "list_template_items_admin_all" on public.list_template_items;

create policy "list_template_items_public_select"
  on public.list_template_items for select
  to anon
  using (
    exists (
      select 1
      from public.list_templates t
      where t.id = list_template_items.template_id
        and t.published = true
    )
  );

create policy "list_template_items_authenticated_select"
  on public.list_template_items for select
  to authenticated
  using (
    public.is_admin_user()
    or exists (
      select 1
      from public.list_templates t
      where t.id = list_template_items.template_id
        and t.published = true
    )
  );

create policy "list_template_items_admin_insert"
  on public.list_template_items for insert
  to authenticated
  with check (public.is_admin_user());

create policy "list_template_items_admin_update"
  on public.list_template_items for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "list_template_items_admin_delete"
  on public.list_template_items for delete
  to authenticated
  using (public.is_admin_user());
