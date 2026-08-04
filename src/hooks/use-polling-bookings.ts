"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BookingRow } from "@/types/booking";

const BOOKINGS_SELECT = "*, region:regions(name), vendor:vendors(name), item:catalog_items(name)";

export function usePollingBookings(initial: BookingRow[], intervalMs = 30000) {
  const [bookings, setBookings] = useState<BookingRow[]>(initial);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("bookings")
      .select(BOOKINGS_SELECT)
      .order("created_at", { ascending: false });
    if (data) setBookings(data as unknown as BookingRow[]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { bookings, setBookings, refresh, refreshing };
}
