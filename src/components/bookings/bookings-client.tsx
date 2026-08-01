"use client";

import { RefreshCw } from "lucide-react";
import { usePollingBookings } from "@/hooks/use-polling-bookings";
import { BookingsTable } from "./bookings-table";
import { Button } from "@/components/ui/button";
import type { BookingRow } from "@/types/booking";
import type { Profile } from "@/types/profile";

export function BookingsClient({
  initialBookings,
  profile,
  vendors,
}: {
  initialBookings: BookingRow[];
  profile: Profile;
  vendors: { id: string; name: string }[];
}) {
  const { bookings, setBookings, refresh, refreshing } = usePollingBookings(initialBookings);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Auto-refreshes every 30s. Status and SLA are set manually by staff.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={refreshing ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>
      <BookingsTable
        bookings={bookings}
        setBookings={setBookings}
        profile={profile}
        vendors={vendors}
      />
    </div>
  );
}
