-- Phase 8: storage buckets and policies
-- Bucket creation through SQL is supported for storage.buckets.
-- Policies enforce owner-scoped paths in the format {auth.uid()}/file.ext

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wishlist-covers',
  'wishlist-covers',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gift-images',
  'gift-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "wishlist_covers_public_read" on storage.objects;
create policy "wishlist_covers_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'wishlist-covers');

drop policy if exists "wishlist_covers_owner_insert" on storage.objects;
create policy "wishlist_covers_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'wishlist-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "wishlist_covers_owner_update" on storage.objects;
create policy "wishlist_covers_owner_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'wishlist-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'wishlist-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "wishlist_covers_owner_delete" on storage.objects;
create policy "wishlist_covers_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'wishlist-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "gift_images_public_read" on storage.objects;
create policy "gift_images_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'gift-images');

drop policy if exists "gift_images_owner_insert" on storage.objects;
create policy "gift_images_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'gift-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "gift_images_owner_update" on storage.objects;
create policy "gift_images_owner_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'gift-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'gift-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "gift_images_owner_delete" on storage.objects;
create policy "gift_images_owner_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'gift-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
