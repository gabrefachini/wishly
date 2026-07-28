-- Listas modelo curadas pelo time: viram o conteúdo real da seção "Ideias para começar".
-- O admin cadastra o modelo e seus itens (com link de afiliado); qualquer pessoa
-- pode instanciar o modelo, e a lista nasce já com os produtos dentro.

create table if not exists public.list_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  occasion text not null default 'Lista de desejos',
  cover_image_url text,
  locale text not null default 'pt-BR' check (locale in ('en', 'pt-BR')),
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.list_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.list_templates(id) on delete cascade,
  name text not null,
  description text,
  store_name text,
  image_url text,
  product_url text not null,
  -- Link de afiliado curado pelo admin. Quando vazio, cai no product_url.
  affiliate_url text,
  estimated_price numeric(10, 2),
  currency text not null default 'BRL',
  priority text not null default 'nice_to_have'
    check (priority in ('must_have', 'nice_to_have', 'surprise_me')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists list_templates_published_idx
  on public.list_templates (published, position);

create index if not exists list_template_items_template_idx
  on public.list_template_items (template_id, position);

alter table public.list_templates enable row level security;
alter table public.list_template_items enable row level security;

-- Leitura: modelos publicados são visíveis para todos (inclusive visitantes),
-- porque a landing mostra os modelos antes de existir conta.
drop policy if exists "list_templates_public_select" on public.list_templates;
create policy "list_templates_public_select"
  on public.list_templates for select
  to anon, authenticated
  using (published = true);

drop policy if exists "list_template_items_public_select" on public.list_template_items;
create policy "list_template_items_public_select"
  on public.list_template_items for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.list_templates t
      where t.id = list_template_items.template_id
        and t.published = true
    )
  );

-- Escrita: somente admins.
drop policy if exists "list_templates_admin_all" on public.list_templates;
create policy "list_templates_admin_all"
  on public.list_templates for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "list_template_items_admin_all" on public.list_template_items;
create policy "list_template_items_admin_all"
  on public.list_template_items for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Instancia um modelo como lista da pessoa autenticada.
--
-- É security definer porque precisa gravar em affiliate_links, onde o dono da
-- lista não tem permissão de escrita — o link de afiliado é curado pelo time.
create or replace function public.create_wishlist_from_template(
  p_template_id uuid,
  p_title text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_template public.list_templates%rowtype;
  v_wishlist public.wishlists%rowtype;
  v_item public.list_template_items%rowtype;
  v_gift public.gifts%rowtype;
  v_affiliate_url text;
  v_count integer := 0;
begin
  select * into v_profile
  from public.profiles
  where auth_user_id = auth.uid();

  if not found then
    raise exception 'profile_not_found';
  end if;

  select * into v_template
  from public.list_templates
  where id = p_template_id
    and published = true;

  if not found then
    raise exception 'template_not_found';
  end if;

  insert into public.wishlists (owner_id, title, occasion, type, locale, cover_image_url)
  values (
    v_profile.id,
    coalesce(nullif(btrim(p_title), ''), v_template.title),
    v_template.occasion,
    'wishlist',
    v_template.locale,
    v_template.cover_image_url
  )
  returning * into v_wishlist;

  for v_item in
    select * from public.list_template_items
    where template_id = v_template.id
    order by position, created_at
  loop
    v_affiliate_url := nullif(btrim(coalesce(v_item.affiliate_url, '')), '');

    insert into public.gifts (
      wishlist_id, name, description, store_url, image_url,
      estimated_price, currency, priority, status
    )
    values (
      v_wishlist.id,
      v_item.name,
      v_item.description,
      coalesce(v_affiliate_url, v_item.product_url),
      v_item.image_url,
      v_item.estimated_price,
      v_item.currency,
      v_item.priority,
      'available'
    )
    returning * into v_gift;

    -- Só registramos affiliate_link quando o time realmente curou um link;
    -- sem isso o item entraria na fila de afiliados como pendente.
    if v_affiliate_url is not null then
      insert into public.affiliate_links (gift_id, original_url, affiliate_url, status)
      values (v_gift.id, v_item.product_url, v_affiliate_url, 'generated')
      on conflict (gift_id) do nothing;
    end if;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'wishlist_id', v_wishlist.id,
    'share_id', v_wishlist.share_id,
    'title', v_wishlist.title,
    'item_count', v_count
  );
end;
$$;

revoke all on function public.create_wishlist_from_template(uuid, text) from public;
grant execute on function public.create_wishlist_from_template(uuid, text) to authenticated;
