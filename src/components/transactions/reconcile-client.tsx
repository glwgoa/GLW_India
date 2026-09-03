"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, FileCheck2, Upload } from "lucide-react";
import { parseCsv, downloadCsv } from "@/lib/csv";
import { transactionDescription } from "@/lib/transaction-display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeaderIcon } from "@/components/page-header-icon";
import { MatchDetailDialog } from "./match-detail-dialog";
import type { TransactionRow } from "@/types/transaction";

type ColumnKey = "reference" | "debit" | "credit" | "date" | "description";

const COLUMN_LABEL: Record<ColumnKey, string> = {
  reference: "Reference / Transaction ID (or Narration)",
  debit: "Debit (withdrawal)",
  credit: "Credit (deposit)",
  date: "Date",
  description: "Description",
};

const AUTO_DETECT_KEYWORDS: Record<ColumnKey, string[]> = {
  // Falls back to the narration column when there's no dedicated reference/UTR
  // column — banks often bury the UPI/NEFT reference inside that text instead.
  reference: [
    "reference",
    "ref no",
    "chq",
    "utr",
    "transaction id",
    "txn id",
    "cheque",
    "narration",
    "particulars",
    "details",
  ],
  debit: ["debit", "withdrawal", "dr amount", "amount debited", "withdrawal amt"],
  credit: ["credit", "deposit", "cr amount", "amount credited", "deposit amt"],
  date: ["date"],
  description: ["narration", "description", "particulars", "details"],
};

type BankRowStatus = "matched" | "mismatch" | "not-in-system" | "no-reference";

type BankResultRow = {
  line: number;
  reference: string;
  bankAmount: number;
  bankDirection: "paid" | "received";
  status: BankRowStatus;
  match?: TransactionRow;
};

function autoDetectColumn(header: string[], key: ColumnKey): string {
  const keywords = AUTO_DETECT_KEYWORDS[key];
  const idx = header.findIndex((h) => keywords.some((k) => h.toLowerCase().includes(k)));
  return idx >= 0 ? String(idx) : "";
}

function parseAmount(raw: string | undefined) {
  if (!raw) return 0;
  const cleaned = raw.replace(/[,₹\s]/g, "");
  const value = Number(cleaned);
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Bank narrations often bury the actual UPI/NEFT/IMPS reference inside a
 * slash- or dash-separated string, e.g.
 * "UPI IN/554801243387/nitya2702@ibl/Payment fr/4722" — the reference is
 * the long digit run ("554801243387"), not the whole cell or trailing
 * segments like "4722". Pull that out instead of requiring a clean column.
 */
function extractReference(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed || !/[/\-]/.test(trimmed)) return trimmed;
  const segments = trimmed.split(/[/\-]/).map((s) => s.trim());
  const longDigitRun = segments.find((s) => /^\d{8,}$/.test(s));
  if (longDigitRun) return longDigitRun;
  const longestSegment = [...segments].filter(Boolean).sort((a, b) => b.length - a.length)[0];
  return longestSegment ?? trimmed;
}

export function ReconcileClient({ transactions }: { transactions: TransactionRow[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [header, setHeader] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<ColumnKey, string>>({
    reference: "",
    debit: "",
    credit: "",
    date: "",
    description: "",
  });
  const [results, setResults] = useState<BankResultRow[] | null>(null);

  const systemByRef = useMemo(() => {
    const map = new Map<string, TransactionRow>();
    for (const t of transactions) {
      if (t.transaction_id) map.set(t.transaction_id.trim().toLowerCase(), t);
    }
    return map;
  }, [transactions]);

  function handleFile(file: File) {
    setFileName(file.name);
    setResults(null);
    file.text().then((text) => {
      const rows = parseCsv(text);
      if (rows.length < 2) {
        toast.error("CSV has no data rows");
        return;
      }
      const headerRow = rows[0].map((h) => h.trim());
      setHeader(headerRow);
      setDataRows(rows.slice(1));
      setColumnMap({
        reference: autoDetectColumn(headerRow, "reference"),
        debit: autoDetectColumn(headerRow, "debit"),
        credit: autoDetectColumn(headerRow, "credit"),
        date: autoDetectColumn(headerRow, "date"),
        description: autoDetectColumn(headerRow, "description"),
      });
    });
  }

  function runReconciliation() {
    const refIdx = Number(columnMap.reference);
    const debitIdx = columnMap.debit === "" ? -1 : Number(columnMap.debit);
    const creditIdx = columnMap.credit === "" ? -1 : Number(columnMap.credit);

    if (columnMap.reference === "") {
      toast.error("Map the Reference / Transaction ID column first");
      return;
    }
    if (debitIdx < 0 && creditIdx < 0) {
      toast.error("Map at least a Debit or Credit column");
      return;
    }

    const matchedRefs = new Set<string>();
    const next: BankResultRow[] = dataRows.map((cells, i) => {
      const reference = extractReference(cells[refIdx] ?? "");
      const debit = debitIdx >= 0 ? parseAmount(cells[debitIdx]) : 0;
      const credit = creditIdx >= 0 ? parseAmount(cells[creditIdx]) : 0;
      const bankAmount = credit > 0 ? credit : debit;
      const bankDirection: "paid" | "received" = credit > 0 ? "received" : "paid";

      if (!reference) {
        return { line: i + 2, reference, bankAmount, bankDirection, status: "no-reference" as const };
      }
      const key = reference.toLowerCase();
      const match = systemByRef.get(key);
      if (!match) {
        return { line: i + 2, reference, bankAmount, bankDirection, status: "not-in-system" as const };
      }
      matchedRefs.add(key);
      const amountMatches = Math.abs(match.amount - bankAmount) < 0.5;
      const directionMatches = match.direction === bankDirection;
      return {
        line: i + 2,
        reference,
        bankAmount,
        bankDirection,
        status: amountMatches && directionMatches ? ("matched" as const) : ("mismatch" as const),
        match,
      };
    });

    setResults(next);
  }

  const missingFromStatement = useMemo(() => {
    if (!results) return [];
    const seen = new Set(
      results.filter((r) => r.status === "matched" || r.status === "mismatch").map((r) => r.reference.toLowerCase()),
    );
    return transactions.filter((t) => t.transaction_id && !seen.has(t.transaction_id.trim().toLowerCase()));
  }, [results, transactions]);

  const summary = useMemo(() => {
    if (!results) return null;
    return {
      matched: results.filter((r) => r.status === "matched").length,
      mismatch: results.filter((r) => r.status === "mismatch").length,
      notInSystem: results.filter((r) => r.status === "not-in-system").length,
      noReference: results.filter((r) => r.status === "no-reference").length,
      missing: missingFromStatement.length,
    };
  }, [results, missingFromStatement]);

  function handleDownloadReport() {
    if (!results) return;
    const headers = ["Line", "Reference", "Bank amount", "Bank type", "Status", "System amount", "System type"];
    const rows: (string | number)[][] = results.map((r) => [
      r.line,
      r.reference,
      r.bankAmount,
      r.bankDirection,
      r.status,
      r.match?.amount ?? "",
      r.match?.direction ?? "",
    ]);
    for (const t of missingFromStatement) {
      rows.push(["", t.transaction_id ?? "", "", "", "missing-from-statement", t.amount, t.direction]);
    }
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`reconciliation-${date}.csv`, headers, rows);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PageHeaderIcon icon={FileCheck2} color="var(--chart-4)" />
        <div>
          <h1 className="text-2xl font-semibold">Reconcile bank statement</h1>
          <p className="text-sm text-muted-foreground">
            Upload a bank statement CSV to verify it against recorded transactions.
          </p>
        </div>
      </div>

      <Link href="/transactions" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to transactions
      </Link>

      <div className="space-y-3 rounded-md border bg-background p-4">
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

        {header.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {(Object.keys(COLUMN_LABEL) as ColumnKey[]).map((key) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{COLUMN_LABEL[key]}</Label>
                  <Select
                    value={columnMap[key]}
                    onValueChange={(v) => setColumnMap((prev) => ({ ...prev, [key]: v ?? "" }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string) => (value === "" ? "None" : (header[Number(value)] ?? "None"))}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {header.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h || `Column ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={runReconciliation}>
                <Upload />
                Run reconciliation
              </Button>
              <span className="text-xs text-muted-foreground">
                {fileName} — {dataRows.length} row(s)
              </span>
            </div>
          </>
        )}
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">Matched</div>
              <div className="text-base font-semibold text-emerald-600">{summary.matched}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">Mismatched</div>
              <div className="text-base font-semibold text-amber-600">{summary.mismatch}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">Not in system</div>
              <div className="text-base font-semibold text-destructive">{summary.notInSystem}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">No reference</div>
              <div className="text-base font-semibold text-muted-foreground">{summary.noReference}</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <div className="text-xs text-muted-foreground">Missing from statement</div>
              <div className="text-base font-semibold text-destructive">{summary.missing}</div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleDownloadReport}>
              Download report CSV
            </Button>
          </div>

          <ResultsTable results={results ?? []} />

          {missingFromStatement.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium">Recorded but not found in this statement</h2>
              <div className="rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missingFromStatement.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.transaction_id}</TableCell>
                        <TableCell className="text-muted-foreground">{transactionDescription(t)}</TableCell>
                        <TableCell>₹{t.amount.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{t.direction}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<BankRowStatus, string> = {
  matched: "Matched",
  mismatch: "Mismatch",
  "not-in-system": "Not in system",
  "no-reference": "No reference",
};

const STATUS_BADGE_CLASS: Record<BankRowStatus, string> = {
  matched: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  mismatch: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "not-in-system": "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  "no-reference": "bg-muted text-muted-foreground",
};

function ResultsTable({ results }: { results: BankResultRow[] }) {
  return (
    <div className="rounded-md border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Line</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Bank amount</TableHead>
            <TableHead>Bank type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>System amount</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r) => (
            <TableRow key={r.line}>
              <TableCell className="text-muted-foreground">{r.line}</TableCell>
              <TableCell>{r.reference || "—"}</TableCell>
              <TableCell>₹{r.bankAmount.toLocaleString("en-IN")}</TableCell>
              <TableCell className="capitalize text-muted-foreground">{r.bankDirection}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={STATUS_BADGE_CLASS[r.status]}>
                  {STATUS_LABEL[r.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {r.match ? `₹${r.match.amount.toLocaleString("en-IN")}` : "—"}
              </TableCell>
              <TableCell>{r.status === "matched" && r.match && <MatchDetailDialog transaction={r.match} />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
