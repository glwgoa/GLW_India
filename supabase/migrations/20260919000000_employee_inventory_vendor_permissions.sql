-- Employees can add and delete inventory products and vendors (edit stays admin/developer only).

drop policy if exists "catalog_items_insert" on catalog_items;
create policy "catalog_items_insert" on catalog_items for insert
  with check (is_privileged() or get_user_role() = 'employee');

drop policy if exists "catalog_items_delete" on catalog_items;
create policy "catalog_items_delete" on catalog_items for delete
  using (is_privileged() or get_user_role() = 'employee');

drop policy if exists "vendors_insert" on vendors;
create policy "vendors_insert" on vendors for insert
  with check (is_privileged() or get_user_role() = 'employee');

drop policy if exists "vendors_delete" on vendors;
create policy "vendors_delete" on vendors for delete
  using (is_privileged() or get_user_role() = 'employee');

drop policy if exists "vendor_category_selections_insert" on vendor_category_selections;
create policy "vendor_category_selections_insert" on vendor_category_selections for insert
  with check (is_privileged() or get_user_role() = 'employee' or vendor_id = get_user_vendor());

drop policy if exists "vendor_category_selections_delete" on vendor_category_selections;
create policy "vendor_category_selections_delete" on vendor_category_selections for delete
  using (is_privileged() or get_user_role() = 'employee' or vendor_id = get_user_vendor());

-- Product photos uploaded while adding a product.
drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects for insert
  with check (bucket_id = 'product-images' and (is_privileged() or get_user_role() = 'employee'));
