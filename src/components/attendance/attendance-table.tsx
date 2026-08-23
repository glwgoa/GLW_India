"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadCsv } from "@/lib/csv";
import { DownloadButton } from "@/components/motion/download-button";
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
  actions,
}: {
  rows: AttendanceRow[];
  showEmployee: boolean;
  /** Notes are admin-only, even for HR or the employee's own history. */
  showNote: boolean;
  /** Extra controls (e.g. Import CSV) rendered next to Download CSV. */
  actions?: React.ReactNode;
}) {
  const [nameFilter, setNameFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (showEmployee && nameFilter) {
        const name = row.profile?.full_name?.toLowerCase() ?? "";
        if (!name.includes(nameFilter.toLowerCase())) return false;
      }
      const clockInDate = row.clock_in.slice(0, 10);
      if (dateFrom && clockInDate < dateFrom) return false;
      if (dateTo && clockInDate > dateTo) return false;
      return true;
    });
  }, [rows, showEmployee, nameFilter, dateFrom, dateTo]);

  const hasFilters = (showEmployee && nameFilter) || dateFrom || dateTo;

  function clearFilters() {
    setNameFilter("");
    setDateFrom("");
    setDateTo("");
  }

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
    const csvRows = filteredRows.map((row) => [
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {showEmployee && (
            <div className="space-y-1.5">
              <Label htmlFor="attendance-name-filter" className="text-xs text-muted-foreground">
                Name
              </Label>
              <Input
                id="attendance-name-filter"
                placeholder="Search employee..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="w-44"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="attendance-date-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="attendance-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="attendance-date-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="attendance-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X />
              Clear
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <DownloadButton onDownload={handleDownload} />
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attendance records match these filters.</p>
      ) : (
        <div className="rounded-md border bg-background">
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
              {filteredRows.map((row) => (
                <TableRow key={row.id}>
                  {showEmployee && <TableCell>{row.profile?.full_name ?? "—"}</TableCell>}
                  <TableCell>{new Date(row.clock_in).toLocaleString()}</TableCell>
                  <TableCell>
                    {row.clock_out ? new Date(row.clock_out).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>{formatDuration(row.clock_in, row.clock_out)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`capitalize ${
                        !row.clock_out
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                          : row.status === "present"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      }`}
                    >
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
      )}
    </div>
  );
}
