-- Employees can edit inventory products (including replacing the product photo).
drop policy if exists "catalog_items_update" on catalog_items;
create policy "catalog_items_update" on catalog_items for update
  using (is_privileged() or get_user_role() = 'employee');

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects for update
  using (bucket_id = 'product-images' and (is_privileged() or get_user_role() = 'employee'));
