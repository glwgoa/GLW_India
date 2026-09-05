import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { BookingsClient } from "@/components/bookings/bookings-client";
import type { BookingRow } from "@/types/booking";
import { isPrivileged } from "@/lib/auth/roles";

export default async function BookingsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const canManageBookings =
    isPrivileged(profile.role) || profile.role === "project_manager" || profile.role === "employee";
  const canAssignEmployee = isPrivileged(profile.role);

  const [{ data: bookings }, { data: vendors }, { data: regions }, { data: products }, { data: employees }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(
          "*, region:regions(name), vendor:vendors(name, contact_phone), employee:profiles!bookings_assigned_employee_id_fkey(full_name), creator:profiles!bookings_created_by_fkey(full_name), item:catalog_items(name, b2b_price, kids_b2b_price, kids_sale_price, category, reporting_time, jetty_name, jetty_location_url, coordinator_name, coordinator_phone)",
        )
        .order("created_at", { ascending: false }),
      canManageBookings
        ? supabase.from("vendors").select("id, name").order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      canManageBookings
        ? supabase.from("regions").select("id, name").order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      canManageBookings
        ? supabase
            .from("catalog_items")
            .select("id, name, sale_price, kids_sale_price, category, vendor_id, regional_inventory(region_id)")
            .order("name")
        : Promise.resolve({
            data: [] as {
              id: string;
              name: string;
              sale_price: number | null;
              kids_sale_price: number | null;
              category: string | null;
              vendor_id: string | null;
              regional_inventory: { region_id: string | null }[];
            }[],
          }),
      canAssignEmployee
        ? supabase.from("profiles").select("id, full_name").order("full_name")
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    ]);

  return (
    <BookingsClient
      initialBookings={(bookings ?? []) as unknown as BookingRow[]}
      profile={profile}
      vendors={(vendors ?? []).map((v) => ({ ...v, name: v.name ?? "Unnamed vendor" }))}
      regions={regions ?? []}
      products={products ?? []}
      employees={employees ?? []}
    />
  );
}
