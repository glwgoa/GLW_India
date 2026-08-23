"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { ClockWidget } from "./clock-widget";
import { AttendanceTable } from "./attendance-table";
import { ImportAttendanceDialog } from "./import-attendance-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeaderIcon } from "@/components/page-header-icon";
import type { AttendanceRow } from "@/types/attendance";

export function AttendanceClient({
  userId,
  initialOpenRecord,
  initialOwnRows,
  orgRows: initialOrgRows,
  isAdminHr,
  isAdmin,
  isDeveloper,
  employees,
}: {
  userId: string;
  initialOpenRecord: AttendanceRow | null;
  initialOwnRows: AttendanceRow[];
  orgRows: AttendanceRow[];
  isAdminHr: boolean;
  isAdmin: boolean;
  isDeveloper: boolean;
  employees: { id: string; full_name: string }[];
}) {
  const [openRecord, setOpenRecord] = useState<AttendanceRow | null>(initialOpenRecord);
  const [ownRows, setOwnRows] = useState<AttendanceRow[]>(initialOwnRows);
  const [orgRows, setOrgRows] = useState<AttendanceRow[]>(initialOrgRows);

  function handleClockIn(record: AttendanceRow) {
    setOpenRecord(record);
    setOwnRows((prev) => [record, ...prev]);
  }

  function handleClockOut(record: AttendanceRow) {
    setOpenRecord(null);
    setOwnRows((prev) => prev.map((r) => (r.id === record.id ? record : r)));
  }

  function handleImported(records: AttendanceRow[]) {
    setOrgRows((prev) => [...records, ...prev]);
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

  const heading = (
    <div className="flex items-center gap-3">
      <PageHeaderIcon icon={Clock} color="var(--chart-1)" />
      <h1 className="text-2xl font-semibold">Attendance</h1>
    </div>
  );

  if (!isAdminHr) {
    return (
      <div className="space-y-4">
        {heading}
        {ownSection}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {heading}
      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">My attendance</TabsTrigger>
          <TabsTrigger value="team">Team attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="mine" className="mt-4">
          {ownSection}
        </TabsContent>
        <TabsContent value="team" className="mt-4">
          <AttendanceTable
            rows={orgRows}
            showEmployee
            showNote={isAdmin}
            actions={
              isDeveloper && (
                <ImportAttendanceDialog employees={employees} onImported={handleImported} />
              )
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
