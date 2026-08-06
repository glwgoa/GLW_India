-- Deleting a vendor was blocked (FK RESTRICT) by any booking/project/profile/
-- catalog_item still referencing it, even though the app's delete confirmation
-- already promised those references would just become unassigned. Switch
-- those FKs to ON DELETE SET NULL to match that intent (all four columns are
-- already nullable). sla_guidelines stays ON DELETE CASCADE — a vendor's SLA
-- terms are meaningless without the vendor.
alter table bookings drop constraint bookings_assigned_vendor_id_fkey;
alter table bookings add constraint bookings_assigned_vendor_id_fkey
  foreign key (assigned_vendor_id) references vendors(id) on delete set null;

alter table projects drop constraint projects_assigned_vendor_id_fkey;
alter table projects add constraint projects_assigned_vendor_id_fkey
  foreign key (assigned_vendor_id) references vendors(id) on delete set null;

alter table catalog_items drop constraint catalog_items_vendor_id_fkey;
alter table catalog_items add constraint catalog_items_vendor_id_fkey
  foreign key (vendor_id) references vendors(id) on delete set null;

alter table profiles drop constraint profiles_vendor_id_fkey;
alter table profiles add constraint profiles_vendor_id_fkey
  foreign key (vendor_id) references vendors(id) on delete set null;
