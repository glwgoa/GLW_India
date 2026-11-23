import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { MonthlyBrandReport } from "@/components/mis/monthly-brand-report";
import { SourceBrandReport } from "@/components/mis/source-brand-report";
import { PageHeaderIcon } from "@/components/page-header-icon";
import { computeProfit, effectiveSalePrice } from "@/lib/booking-pricing";
import type { BookingRow } from "@/types/booking";
import type { MonthlyBrandRow, SourceBrandRow } from "@/types/mis";

export default async function MisReportsPage() {
  const supabase = await createClient();

  // Profile and bookings fetch run together — RLS guards the rows,
  // requireRole still redirects unauthorized roles before rendering.
  const [profile, { data: bookings }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("bookings")
      .select(
        "brand, source, booking_date, status, sale_price, guest_count, kids_count, kids_price, b2b_price, kids_b2b_price, transport_type, pickup_drop_price, pickup_drop_guest_count, item:catalog_items(category)",
      ),
  ]);

  requireRole(profile, ["admin", "developer", "project_manager"]);

  // Totals per brand per month (by booking date), using the same price maths as the Bookings page.
  const monthly = new Map<string, MonthlyBrandRow>();
  const bySource = new Map<string, SourceBrandRow>();
  for (const b of (bookings ?? []) as unknown as BookingRow[]) {
    if (b.status === "cancelled" || b.status === "cancelled_refunded") continue;
    const month = b.booking_date.slice(0, 7);
    const brand = b.brand ?? "No brand";
    const row = monthly.get(`${month}|${brand}`) ?? { month, brand, bookings: 0, revenue: 0, earnings: 0 };
    const revenue = effectiveSalePrice(b) ?? 0;
    const earnings = computeProfit(b) ?? 0;
    row.bookings += 1;
    row.revenue += revenue;
    row.earnings += earnings;
    monthly.set(`${month}|${brand}`, row);

    const source = b.source ?? "Not set";
    const key = `${month}|${brand}|${source}`;
    const srow = bySource.get(key) ?? { month, brand, source, bookings: 0, revenue: 0, earnings: 0 };
    srow.bookings += 1;
    srow.revenue += revenue;
    srow.earnings += earnings;
    bySource.set(key, srow);

  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PageHeaderIcon icon={BarChart3} color="var(--chart-2)" />
        <div>
          <h1 className="text-2xl font-semibold">MIS Reports</h1>
          <p className="text-sm text-muted-foreground">
            Monthly booking totals for each brand, and where the bookings came from.
          </p>
        </div>
      </div>
      <MonthlyBrandReport data={[...monthly.values()]} />
      <SourceBrandReport data={[...bySource.values()]} />
    </div>
  );
}
