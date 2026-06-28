alter table public.wishlists
  add column if not exists theme_preset text not null default 'default'
    check (theme_preset in ('default', 'baby', 'wedding', 'birthday', 'christmas', 'newHome', 'minimal')),
  add column if not exists theme_primary_color text,
  add column if not exists theme_secondary_color text,
  add column if not exists use_custom_theme boolean not null default false;

update public.wishlists
set
  theme_preset = case
    when occasion = 'babyShower' then 'baby'
    when occasion = 'wedding' then 'wedding'
    when occasion = 'christmas' then 'christmas'
    when occasion = 'newHome' then 'newHome'
    else 'birthday'
  end
where theme_preset = 'default';

update public.wishlists
set
  theme_primary_color = case theme_preset
    when 'baby' then '#A7C7E7'
    when 'wedding' then '#C9A66B'
    when 'birthday' then '#DE7762'
    when 'christmas' then '#9F4F45'
    when 'newHome' then '#B98263'
    when 'minimal' then '#241815'
    else '#DE7762'
  end,
  theme_secondary_color = case theme_preset
    when 'baby' then '#F6DAD2'
    when 'wedding' then '#EFE4DA'
    when 'birthday' then '#DCD2FF'
    when 'christmas' then '#D9E5D6'
    when 'newHome' then '#DDECF7'
    when 'minimal' then '#EFE4DA'
    else '#DCD2FF'
  end
where theme_primary_color is null
   or theme_secondary_color is null;

create or replace function public.get_public_wishlist_by_path(p_identifier text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'id', w.id,
    'share_id', w.share_id,
    'slug', w.slug,
    'title', w.title,
    'occasion', w.occasion,
    'event_date', w.event_date,
    'message', w.message,
    'cover_image_url', w.cover_image_url,
    'theme_color', w.theme_color,
    'theme_preset', w.theme_preset,
    'theme_primary_color', w.theme_primary_color,
    'theme_secondary_color', w.theme_secondary_color,
    'use_custom_theme', w.use_custom_theme,
    'locale', w.locale,
    'rsvp_enabled', w.rsvp_enabled,
    'event_location', w.event_location,
    'event_time', w.event_time,
    'max_guests', w.max_guests,
    'gifts', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', g.id,
            'wishlist_id', g.wishlist_id,
            'name', g.name,
            'description', g.description,
            'store_url', g.store_url,
            'image_url', g.image_url,
            'estimated_price', g.estimated_price,
            'currency', g.currency,
            'priority', g.priority,
            'status', g.status,
            'purchase_type', g.purchase_type,
            'funding_goal_amount', g.funding_goal_amount,
            'funding_currency', g.funding_currency,
            'funding_received_amount', g.funding_received_amount,
            'funding_status', g.funding_status,
            'source_sponsored_item_id', g.source_sponsored_item_id,
            'deleted_at', g.deleted_at,
            'created_at', g.created_at,
            'updated_at', g.updated_at
          )
          order by g.created_at asc
        )
        from public.gifts g
        where g.wishlist_id = w.id
          and g.deleted_at is null
      ),
      '[]'::jsonb
    )
  )
  into result
  from public.wishlists w
  where (w.share_id = p_identifier or w.slug = p_identifier)
    and w.visibility = 'public_link'
    and w.archived_at is null;

  return result;
end;
$$;

create or replace function public.get_public_wishlist(p_share_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.get_public_wishlist_by_path(p_share_id);
end;
$$;
