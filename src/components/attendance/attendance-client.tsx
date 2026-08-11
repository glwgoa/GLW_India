"use client";

import { useState } from "react";
import { ClockWidget } from "./clock-widget";
import { AttendanceTable } from "./attendance-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HyperText } from "@/components/ui/hyper-text";
import type { AttendanceRow } from "@/types/attendance";

export function AttendanceClient({
  userId,
  initialOpenRecord,
  initialOwnRows,
  orgRows,
  isAdminHr,
  isAdmin,
}: {
  userId: string;
  initialOpenRecord: AttendanceRow | null;
  initialOwnRows: AttendanceRow[];
  orgRows: AttendanceRow[];
  isAdminHr: boolean;
  isAdmin: boolean;
}) {
  const [openRecord, setOpenRecord] = useState<AttendanceRow | null>(initialOpenRecord);
  const [ownRows, setOwnRows] = useState<AttendanceRow[]>(initialOwnRows);

  function handleClockIn(record: AttendanceRow) {
    setOpenRecord(record);
    setOwnRows((prev) => [record, ...prev]);
  }

  function handleClockOut(record: AttendanceRow) {
    setOpenRecord(null);
    setOwnRows((prev) => prev.map((r) => (r.id === record.id ? record : r)));
  }

  const ownSection = (
    <div className="space-y-4">
      <ClockWidget
        userId={userId}
        openRecord={openRecord}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
      />
      <AttendanceTable rows={ownRows} showEmployee={false} showNote={isAdmin} />
    </div>
  );

  if (!isAdminHr) {
    return (
      <div className="space-y-4">
        <HyperText as="h1" className="text-2xl font-semibold">Attendance</HyperText>
        {ownSection}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HyperText as="h1" className="text-2xl font-semibold">Attendance</HyperText>
      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">My attendance</TabsTrigger>
          <TabsTrigger value="team">Team attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="mine" className="mt-4">
          {ownSection}
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <AttendanceTable rows={orgRows} showEmployee showNote={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
