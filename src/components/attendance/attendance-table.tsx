import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
}: {
  rows: AttendanceRow[];
  showEmployee: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No attendance records yet.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {showEmployee && <TableHead>Employee</TableHead>}
            <TableHead>Clock in</TableHead>
            <TableHead>Clock out</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
