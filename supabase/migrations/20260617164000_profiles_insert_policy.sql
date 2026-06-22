insert into public.profiles (auth_user_id, name, email, locale)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1)),
  u.email,
  coalesce(u.raw_user_meta_data ->> 'locale', 'en')
from auth.users u
left join public.profiles p on p.auth_user_id = u.id
where p.id is null;

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = auth_user_id);
