-- Accountants get every employee permission, plus full access to transactions and GST billing.

-- Bookings
drop policy if exists "bookings_insert" on bookings;
create policy "bookings_insert" on bookings for insert
  with check (is_privileged() or get_user_role() in ('project_manager', 'employee', 'accountant'));

drop policy if exists "bookings_select" on bookings;
create policy "bookings_select" on bookings for select
  using (
    is_privileged()
    or get_user_role() in ('employee', 'accountant', 'project_manager')
    or (get_user_role() = 'vendor' and assigned_vendor_id = get_user_vendor())
  );

drop policy if exists "bookings_update" on bookings;
create policy "bookings_update" on bookings for update
  using (
    is_privileged()
    or get_user_role() in ('employee', 'accountant', 'project_manager')
    or (get_user_role() = 'vendor' and assigned_vendor_id = get_user_vendor())
  );

-- Inventory products
drop policy if exists "catalog_items_insert" on catalog_items;
create policy "catalog_items_insert" on catalog_items for insert
  with check (is_privileged() or get_user_role() in ('employee', 'accountant'));

drop policy if exists "catalog_items_update" on catalog_items;
create policy "catalog_items_update" on catalog_items for update
  using (is_privileged() or get_user_role() in ('employee', 'accountant'));

drop policy if exists "catalog_items_delete" on catalog_items;
create policy "catalog_items_delete" on catalog_items for delete
  using (is_privileged() or get_user_role() in ('employee', 'accountant'));

drop policy if exists "regional_inventory_insert" on regional_inventory;
create policy "regional_inventory_insert" on regional_inventory for insert
  with check (is_privileged() or get_user_role() in ('project_manager', 'employee', 'accountant'));

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects for insert
  with check (bucket_id = 'product-images' and (is_privileged() or get_user_role() in ('employee', 'accountant')));

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects for update
  using (bucket_id = 'product-images' and (is_privileged() or get_user_role() in ('employee', 'accountant')));

-- Vendors
drop policy if exists "vendors_select" on vendors;
create policy "vendors_select" on vendors for select
  using (
    is_privileged()
    or get_user_role() in ('project_manager', 'employee', 'accountant')
    or id = get_user_vendor()
  );

drop policy if exists "vendors_insert" on vendors;
create policy "vendors_insert" on vendors for insert
  with check (is_privileged() or get_user_role() in ('employee', 'accountant'));

drop policy if exists "vendors_delete" on vendors;
create policy "vendors_delete" on vendors for delete
  using (is_privileged() or get_user_role() in ('employee', 'accountant'));

drop policy if exists "vendor_category_selections_insert" on vendor_category_selections;
create policy "vendor_category_selections_insert" on vendor_category_selections for insert
  with check (is_privileged() or get_user_role() in ('employee', 'accountant') or vendor_id = get_user_vendor());

drop policy if exists "vendor_category_selections_delete" on vendor_category_selections;
create policy "vendor_category_selections_delete" on vendor_category_selections for delete
  using (is_privileged() or get_user_role() in ('employee', 'accountant') or vendor_id = get_user_vendor());

-- Transactions (same rules as project managers: booking-synced rows stay read-only)
drop policy if exists "transactions_select" on transactions;
create policy "transactions_select" on transactions for select
  using (is_privileged() or get_user_role() in ('project_manager', 'accountant'));

drop policy if exists "transactions_insert" on transactions;
create policy "transactions_insert" on transactions for insert
  with check ((is_privileged() or get_user_role() in ('project_manager', 'accountant')) and source = 'manual');

drop policy if exists "transactions_update" on transactions;
create policy "transactions_update" on transactions for update
  using ((is_privileged() or get_user_role() in ('project_manager', 'accountant')) and source = 'manual')
  with check ((is_privileged() or get_user_role() in ('project_manager', 'accountant')) and source = 'manual');

drop policy if exists "transactions_delete" on transactions;
create policy "transactions_delete" on transactions for delete
  using ((is_privileged() or get_user_role() in ('project_manager', 'accountant')) and source = 'manual');

-- GST billing
drop policy if exists "gst_documents_select" on gst_documents;
create policy "gst_documents_select" on gst_documents for select
  using (is_privileged() or get_user_role() in ('project_manager', 'accountant'));

drop policy if exists "gst_documents_insert" on gst_documents;
create policy "gst_documents_insert" on gst_documents for insert
  with check (is_privileged() or get_user_role() in ('project_manager', 'accountant'));

drop policy if exists "gst_documents_update" on gst_documents;
create policy "gst_documents_update" on gst_documents for update
  using (is_privileged() or get_user_role() in ('project_manager', 'accountant'))
  with check (is_privileged() or get_user_role() in ('project_manager', 'accountant'));

drop policy if exists "gst_documents_delete" on gst_documents;
create policy "gst_documents_delete" on gst_documents for delete
  using (is_privileged() or get_user_role() = 'accountant');
