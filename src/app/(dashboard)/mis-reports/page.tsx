import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { MonthlyBrandReport } from "@/components/mis/monthly-brand-report";
import { PageHeaderIcon } from "@/components/page-header-icon";
import { computeProfit, effectiveSalePrice } from "@/lib/booking-pricing";
import type { BookingRow } from "@/types/booking";
import type { MonthlyBrandRow } from "@/types/mis";

export default async function MisReportsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  requireRole(profile, ["admin", "developer", "project_manager"]);

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "brand, booking_date, status, sale_price, guest_count, kids_count, kids_price, b2b_price, kids_b2b_price, transport_type, pickup_drop_price, pickup_drop_guest_count, item:catalog_items(category)",
    );

  // Totals per brand per month (by booking date), using the same price maths as the Bookings page.
  const monthly = new Map<string, MonthlyBrandRow>();
  for (const b of (bookings ?? []) as unknown as BookingRow[]) {
    if (b.status === "cancelled" || b.status === "cancelled_refunded") continue;
    const month = b.booking_date.slice(0, 7);
    const brand = b.brand ?? "No brand";
    const row = monthly.get(`${month}|${brand}`) ?? { month, brand, bookings: 0, revenue: 0, earnings: 0 };
    row.bookings += 1;
    row.revenue += effectiveSalePrice(b) ?? 0;
    row.earnings += computeProfit(b) ?? 0;
    monthly.set(`${month}|${brand}`, row);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PageHeaderIcon icon={BarChart3} color="var(--chart-2)" />
        <div>
          <h1 className="text-2xl font-semibold">MIS Reports</h1>
          <p className="text-sm text-muted-foreground">
            Monthly booking totals for each brand.
          </p>
        </div>
      </div>
      <MonthlyBrandReport data={[...monthly.values()]} />
    </div>
  );
}
