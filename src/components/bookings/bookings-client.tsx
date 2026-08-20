"use client";

import { RefreshCw } from "lucide-react";
import { usePollingBookings } from "@/hooks/use-polling-bookings";
import { BookingsTable } from "./bookings-table";
import { NewBookingDialog } from "./new-booking-dialog";
import { Button } from "@/components/ui/button";
import type { BookingRow } from "@/types/booking";
import type { Profile } from "@/types/profile";
import { isPrivileged } from "@/lib/auth/roles";

export function BookingsClient({
  initialBookings,
  profile,
  vendors,
  regions,
  products,
}: {
  initialBookings: BookingRow[];
  profile: Profile;
  vendors: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  products: { id: string; name: string; sale_price: number | null }[];
}) {
  const { bookings, setBookings, refresh, refreshing } = usePollingBookings(initialBookings);
  const canCreateBooking = isPrivileged(profile.role) || profile.role === "project_manager";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Auto-refreshes every 30s. Status and SLA are set manually by staff.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          {canCreateBooking && (
            <NewBookingDialog
              vendors={vendors}
              regions={regions}
              products={products}
              onAdded={refresh}
            />
          )}
        </div>
      </div>
      <BookingsTable
        bookings={bookings}
        setBookings={setBookings}
        profile={profile}
        vendors={vendors}
        regions={regions}
        products={products}
        refresh={refresh}
      />
    </div>
  );
}
