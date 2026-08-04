import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingsClient } from "@/components/bookings/bookings-client";
import type { Profile } from "@/types/profile";
import type { BookingRow } from "@/types/booking";

export default async function BookingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect("/login");

  const canAssignVendor = profile.role === "admin" || profile.role === "project_manager";

  const [{ data: bookings }, { data: vendors }, { data: regions }, { data: products }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("*, region:regions(name), vendor:vendors(name), item:catalog_items(name, b2b_price)")
        .order("created_at", { ascending: false }),
      canAssignVendor
        ? supabase.from("vendors").select("id, name").order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      canAssignVendor
        ? supabase.from("regions").select("id, name").order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      canAssignVendor
        ? supabase.from("catalog_items").select("id, name, sale_price").order("name")
        : Promise.resolve({ data: [] as { id: string; name: string; sale_price: number | null }[] }),
    ]);

  return (
    <BookingsClient
      initialBookings={(bookings ?? []) as unknown as BookingRow[]}
      profile={profile}
      vendors={vendors ?? []}
      regions={regions ?? []}
      products={products ?? []}
    />
  );
}
