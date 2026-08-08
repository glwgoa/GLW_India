"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AttendanceRow } from "@/types/attendance";

const TASKS = [
  "Google Ads - Goa",
  "Accounts",
  "Sales Goa",
  "SEO",
  "Social Media",
  "Google Ads",
  "Website Development",
] as const;

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
  const [note, setNote] = useState("");
  const [task, setTask] = useState("");

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
      .update({ clock_out: clockOut, note: note || null, task: task || null })
      .eq("id", openRecord.id);

    setBusy(false);
    if (error) {
      toast.error(`Clock-out failed: ${error.message}`);
      return;
    }
    toast.success("Clocked out");
    setNote("");
    setTask("");
    onClockOut({ ...openRecord, clock_out: clockOut, note: note || null, task: task || null });
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
      <CardContent className="space-y-3">
        {openRecord && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Task</Label>
              <Select value={task} onValueChange={(v) => setTask(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => value || "Select task"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TASKS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clock-out-note" className="text-xs text-muted-foreground">
                Note (optional)
              </Label>
              <Textarea
                id="clock-out-note"
                placeholder="Anything worth flagging about today..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          </>
        )}
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
