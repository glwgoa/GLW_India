-- Product images move from local disk (broken on Vercel's read-only
-- production filesystem) to a public Supabase Storage bucket.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_public_read" on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product_images_admin_insert" on storage.objects for insert
  with check (bucket_id = 'product-images' and get_user_role() = 'admin');

create policy "product_images_admin_update" on storage.objects for update
  using (bucket_id = 'product-images' and get_user_role() = 'admin');

create policy "product_images_admin_delete" on storage.objects for delete
  using (bucket_id = 'product-images' and get_user_role() = 'admin');
