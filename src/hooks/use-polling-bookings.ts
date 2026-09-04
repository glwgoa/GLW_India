"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BookingRow } from "@/types/booking";

const BOOKINGS_SELECT =
  "*, region:regions(name), vendor:vendors(name, contact_phone), employee:profiles!bookings_assigned_employee_id_fkey(full_name), item:catalog_items(name, b2b_price, kids_b2b_price, kids_sale_price, category, reporting_time, jetty_name, jetty_location_url, coordinator_name, coordinator_phone)";

export function usePollingBookings(initial: BookingRow[]) {
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
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  return { bookings, setBookings, refresh, refreshing };
}
