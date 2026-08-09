-- ============================================================================
-- Storage — product images + user avatars
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- product-images: everyone signed in can view; only admins can manage.
create policy "product_images_read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_write_admin_only" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_update_admin_only" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_delete_admin_only" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- avatars: everyone signed in can view; a user can only manage files inside
-- a folder named after their own user id (e.g. `avatars/<uid>/photo.jpg`).
create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_write_own_folder" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own_folder" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own_folder" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
