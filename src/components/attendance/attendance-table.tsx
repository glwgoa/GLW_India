"use client";

import { Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import type { AttendanceRow } from "@/types/attendance";

function formatDuration(clockIn: string, clockOut: string | null) {
  if (!clockOut) return "—";
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

export function AttendanceTable({
  rows,
  showEmployee,
  showNote,
}: {
  rows: AttendanceRow[];
  showEmployee: boolean;
  /** Notes are admin-only, even for HR or the employee's own history. */
  showNote: boolean;
}) {
  function handleDownload() {
    const headers = [
      ...(showEmployee ? ["Employee"] : []),
      "Clock in",
      "Clock out",
      "Duration",
      "Status",
      "Task",
      ...(showNote ? ["Note"] : []),
    ];
    const csvRows = rows.map((row) => [
      ...(showEmployee ? [row.profile?.full_name ?? "—"] : []),
      new Date(row.clock_in).toLocaleString(),
      row.clock_out ? new Date(row.clock_out).toLocaleString() : "—",
      formatDuration(row.clock_in, row.clock_out),
      row.clock_out ? row.status : "active",
      row.task ?? "",
      ...(showNote ? [row.note ?? ""] : []),
    ]);
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`attendance-${date}.csv`, headers, csvRows);
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No attendance records yet.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download />
          Download CSV
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showEmployee && <TableHead>Employee</TableHead>}
              <TableHead>Clock in</TableHead>
              <TableHead>Clock out</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Task</TableHead>
              {showNote && <TableHead>Note</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {showEmployee && <TableCell>{row.profile?.full_name ?? "—"}</TableCell>}
                <TableCell>{new Date(row.clock_in).toLocaleString()}</TableCell>
                <TableCell>
                  {row.clock_out ? new Date(row.clock_out).toLocaleString() : "—"}
                </TableCell>
                <TableCell>{formatDuration(row.clock_in, row.clock_out)}</TableCell>
                <TableCell>
                  <Badge variant={row.clock_out ? "secondary" : "default"} className="capitalize">
                    {row.clock_out ? row.status : "active"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.task ?? "—"}</TableCell>
                {showNote && (
                  <TableCell className="max-w-48 truncate text-muted-foreground">
                    {row.note ?? "—"}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
