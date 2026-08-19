"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AttendanceRow } from "@/types/attendance";

const REQUIRED_COLUMNS = ["full name", "clock in"] as const;
type KnownColumn = "full name" | "clock in" | "clock out" | "status" | "task" | "note";

type ParsedRow = {
  line: number;
  user_id: string;
  full_name: string;
  clock_in: string;
  clock_out: string | null;
  status: string;
  task: string | null;
  note: string | null;
};

type SkippedRow = { line: number; reason: string };

export function ImportAttendanceDialog({
  employees,
  onImported,
}: {
  employees: { id: string; full_name: string }[];
  onImported: (rows: AttendanceRow[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [skipped, setSkipped] = useState<SkippedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nameToId = new Map(employees.map((e) => [e.full_name.trim().toLowerCase(), e.id]));

  function reset() {
    setParsed([]);
    setSkipped([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      toast.error("CSV has no data rows");
      setParsed([]);
      setSkipped([]);
      return;
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
    if (missing.length > 0) {
      toast.error(`Missing required column(s): ${missing.join(", ")}`);
      setParsed([]);
      setSkipped([]);
      return;
    }
    const colIndex = (name: KnownColumn) => header.indexOf(name);

    const nextParsed: ParsedRow[] = [];
    const nextSkipped: SkippedRow[] = [];

    rows.slice(1).forEach((cells, i) => {
      const line = i + 2;
      const fullName = cells[colIndex("full name")]?.trim() ?? "";
      const clockInRaw = cells[colIndex("clock in")]?.trim() ?? "";
      const clockOutRaw = colIndex("clock out") >= 0 ? cells[colIndex("clock out")]?.trim() : "";
      const status = colIndex("status") >= 0 ? cells[colIndex("status")]?.trim() : "";
      const task = colIndex("task") >= 0 ? cells[colIndex("task")]?.trim() : "";
      const note = colIndex("note") >= 0 ? cells[colIndex("note")]?.trim() : "";

      if (!fullName || !clockInRaw) {
        nextSkipped.push({ line, reason: "Missing name or clock in" });
        return;
      }
      const userId = nameToId.get(fullName.toLowerCase());
      if (!userId) {
        nextSkipped.push({ line, reason: `No employee named "${fullName}"` });
        return;
      }
      const clockIn = new Date(clockInRaw);
      if (Number.isNaN(clockIn.getTime())) {
        nextSkipped.push({ line, reason: `Unparseable clock in "${clockInRaw}"` });
        return;
      }
      let clockOut: Date | null = null;
      if (clockOutRaw) {
        clockOut = new Date(clockOutRaw);
        if (Number.isNaN(clockOut.getTime())) {
          nextSkipped.push({ line, reason: `Unparseable clock out "${clockOutRaw}"` });
          return;
        }
      }

      nextParsed.push({
        line,
        user_id: userId,
        full_name: fullName,
        clock_in: clockIn.toISOString(),
        clock_out: clockOut ? clockOut.toISOString() : null,
        status: status || "present",
        task: task || null,
        note: note || null,
      });
    });

    setParsed(nextParsed);
    setSkipped(nextSkipped);
  }

  async function handleImport() {
    if (parsed.length === 0) return;
    setImporting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("attendance")
      .insert(
        parsed.map((r) => ({
          user_id: r.user_id,
          clock_in: r.clock_in,
          clock_out: r.clock_out,
          status: r.status,
          task: r.task,
          note: r.note,
        })),
      )
      .select("*, profile:profiles(full_name)");

    setImporting(false);
    if (error) {
      toast.error(`Import failed: ${error.message}`);
      return;
    }

    toast.success(`Imported ${data?.length ?? 0} attendance record(s)`);
    onImported((data ?? []) as unknown as AttendanceRow[]);
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Upload />
        Import CSV
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import attendance</DialogTitle>
          <DialogDescription>
            CSV with columns: <code>full name</code>, <code>clock in</code> (required), and
            optionally <code>clock out</code>, <code>status</code>, <code>task</code>,{" "}
            <code>note</code>. Dates must be parseable (e.g. 2026-08-01 09:00).
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="text-sm"
        />

        {fileName && (
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {parsed.length} row(s) ready to import
              {skipped.length > 0 && `, ${skipped.length} skipped`}.
            </p>
            {skipped.length > 0 && (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2 text-xs text-muted-foreground">
                {skipped.map((s, i) => (
                  <p key={i}>
                    Line {s.line}: {s.reason}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={handleImport} disabled={importing || parsed.length === 0}>
            {importing ? "Importing..." : `Import ${parsed.length || ""} record(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
