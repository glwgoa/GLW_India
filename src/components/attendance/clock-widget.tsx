"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceRow } from "@/types/attendance";

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 8000 },
    );
  });
}

export function ClockWidget({
  userId,
  openRecord,
  onClockIn,
  onClockOut,
}: {
  userId: string;
  openRecord: AttendanceRow | null;
  onClockIn: (record: AttendanceRow) => void;
  onClockOut: (record: AttendanceRow) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClockIn() {
    setBusy(true);
    const position = await getPosition();
    const supabase = createClient();
    const location = position
      ? `(${position.coords.longitude},${position.coords.latitude})`
      : null;

    const { data, error } = await supabase
      .from("attendance")
      .insert({ user_id: userId, location_coordinates: location, status: "present" })
      .select("*")
      .single();

    setBusy(false);
    if (error) {
      toast.error(`Clock-in failed: ${error.message}`);
      return;
    }
    toast.success(position ? "Clocked in" : "Clocked in (location unavailable)");
    onClockIn(data as AttendanceRow);
  }

  async function handleClockOut() {
    if (!openRecord) return;
    setBusy(true);
    const clockOut = new Date().toISOString();
    const supabase = createClient();
    const { error } = await supabase
      .from("attendance")
      .update({ clock_out: clockOut })
      .eq("id", openRecord.id);

    setBusy(false);
    if (error) {
      toast.error(`Clock-out failed: ${error.message}`);
      return;
    }
    toast.success("Clocked out");
    onClockOut({ ...openRecord, clock_out: clockOut });
  }

  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Time clock</CardTitle>
        <CardDescription>
          {openRecord
            ? `Clocked in at ${new Date(openRecord.clock_in).toLocaleTimeString()}`
            : "You're not clocked in"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {openRecord ? (
          <Button onClick={handleClockOut} disabled={busy} variant="destructive">
            {busy ? "Clocking out..." : "Clock out"}
          </Button>
        ) : (
          <Button onClick={handleClockIn} disabled={busy}>
            {busy ? "Clocking in..." : "Clock in"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
