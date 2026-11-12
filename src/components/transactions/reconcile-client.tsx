"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, FileCheck2, Save, Upload } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { readStatementFile, parseBankDate, toLocalDateKey } from "@/lib/bank-statement";
import { createClient } from "@/lib/supabase/client";
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
  bankDate: string;
  status: BankRowStatus;
  match?: TransactionRow;
  /** Why a referenced row didn't match (date / amount / type). */
  reasons?: string[];
  matchedBy?: "reference" | "date-amount";
};

export type ReconciledRecord = { transaction_id: string; reconciled_at: string };

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

export function ReconcileClient({
  transactions,
  reconciled,
}: {
  transactions: TransactionRow[];
  reconciled: ReconciledRecord[];
}) {
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
  const [reconciledIds, setReconciledIds] = useState<Set<string>>(
    () => new Set(reconciled.map((r) => r.transaction_id)),
  );
  const [saving, setSaving] = useState(false);

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
    readStatementFile(file)
      .then((rows) => {
        if (rows.length < 2) {
          toast.error("No data rows found in the statement");
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
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Couldn't read that file"));
  }

  function runReconciliation() {
    const refIdx = columnMap.reference === "" ? -1 : Number(columnMap.reference);
    const debitIdx = columnMap.debit === "" ? -1 : Number(columnMap.debit);
    const creditIdx = columnMap.credit === "" ? -1 : Number(columnMap.credit);

    if (columnMap.date === "") {
      toast.error("Map the Date column — a row only matches when the date and amount agree");
      return;
    }
    if (debitIdx < 0 && creditIdx < 0) {
      toast.error("Map at least a Debit or Credit column");
      return;
    }
    const dateIdx = Number(columnMap.date);
    const claimed = new Set<string>(); // system transaction ids already matched in this run

    const next: BankResultRow[] = dataRows.map((cells, i) => {
      const reference = refIdx >= 0 ? extractReference(cells[refIdx] ?? "") : "";
      const debit = debitIdx >= 0 ? parseAmount(cells[debitIdx]) : 0;
      const credit = creditIdx >= 0 ? parseAmount(cells[creditIdx]) : 0;
      const bankAmount = credit > 0 ? credit : debit;
      const bankDirection: "paid" | "received" = credit > 0 ? "received" : "paid";
      const bankDate = parseBankDate(cells[dateIdx]);
      const base = { line: i + 2, reference, bankAmount, bankDirection, bankDate };

      const agrees = (t: TransactionRow) =>
        Math.abs(t.amount - bankAmount) < 0.01 &&
        t.direction === bankDirection &&
        bankDate !== "" &&
        toLocalDateKey(t.transaction_date) === bankDate;

      const byRef = reference ? systemByRef.get(reference.toLowerCase()) : undefined;
      if (byRef) {
        if (agrees(byRef)) {
          claimed.add(byRef.id);
          return { ...base, status: "matched" as const, match: byRef, matchedBy: "reference" as const };
        }
        const reasons: string[] = [];
        if (bankDate === "") reasons.push("bank date unreadable");
        else if (toLocalDateKey(byRef.transaction_date) !== bankDate) reasons.push("date differs");
        if (Math.abs(byRef.amount - bankAmount) >= 0.01) reasons.push("amount differs");
        if (byRef.direction !== bankDirection) reasons.push("paid/received differs");
        claimed.add(byRef.id);
        return { ...base, status: "mismatch" as const, match: byRef, reasons };
      }

      // No usable reference: fall back to an unambiguous date + amount + type match.
      const candidates = transactions.filter((t) => !claimed.has(t.id) && !reconciledIds.has(t.id) && agrees(t));
      if (candidates.length === 1) {
        claimed.add(candidates[0].id);
        return { ...base, status: "matched" as const, match: candidates[0], matchedBy: "date-amount" as const };
      }
      return { ...base, status: reference ? ("not-in-system" as const) : ("no-reference" as const) };
    });

    setResults(next);
  }

  const missingFromStatement = useMemo(() => {
    if (!results) return [];
    const seen = new Set(results.filter((r) => r.match).map((r) => r.match!.id));
    return transactions.filter((t) => !seen.has(t.id) && !reconciledIds.has(t.id));
  }, [results, transactions, reconciledIds]);

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

  const toSave = useMemo(
    () => (results ?? []).filter((r) => r.status === "matched" && r.match && !reconciledIds.has(r.match.id)),
    [results, reconciledIds],
  );

  async function handleSave() {
    if (toSave.length === 0) return;
    setSaving(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("transaction_reconciliations").upsert(
      toSave.map((r) => ({
        transaction_id: r.match!.id,
        bank_date: r.bankDate,
        bank_amount: r.bankAmount,
        bank_reference: r.reference || null,
        statement_name: fileName || null,
        reconciled_by: userData.user?.id ?? null,
      })),
      { onConflict: "transaction_id" },
    );
    setSaving(false);
    if (error) {
      toast.error(`Couldn't save: ${error.message}`);
      return;
    }
    setReconciledIds((prev) => new Set([...prev, ...toSave.map((r) => r.match!.id)]));
    toast.success(`${toSave.length} transaction(s) marked as reconciled`);
  }

  function handleDownloadReport() {
    if (!results) return;
    const headers = ["Line", "Date", "Reference", "Bank amount", "Bank type", "Status", "System amount", "System type"];
    const rows: (string | number)[][] = results.map((r) => [
      r.line,
      r.bankDate,
      r.reference,
      r.bankAmount,
      r.bankDirection,
      r.status,
      r.match?.amount ?? "",
      r.match?.direction ?? "",
    ]);
    for (const t of missingFromStatement) {
      rows.push(["", "", t.transaction_id ?? "", "", "", "missing-from-statement", t.amount, t.direction]);
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
            Upload a bank statement (CSV, Excel or PDF). A row matches only when its date, amount and paid/received type all agree.
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
          accept=".csv,.xlsx,.pdf,text/csv,application/pdf"
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

          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">{reconciledIds.size} transaction(s) reconciled in total</span>
            <Button size="sm" onClick={handleSave} disabled={saving || toSave.length === 0}>
              <Save />
              {saving ? "Saving…" : `Save & mark ${toSave.length} reconciled`}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadReport}>
              Download report CSV
            </Button>
          </div>

          <ResultsTable results={results ?? []} reconciledIds={reconciledIds} />

          {missingFromStatement.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium">Recorded but not found in this statement (not yet reconciled)</h2>
              <div className="rounded-lg bg-card/80 shadow-xl shadow-black/[0.14] backdrop-blur-md ring-1 ring-black/[0.03]">
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

function ResultsTable({ results, reconciledIds }: { results: BankResultRow[]; reconciledIds: Set<string> }) {
  return (
    <div className="rounded-lg bg-card/80 shadow-xl shadow-black/[0.14] backdrop-blur-md ring-1 ring-black/[0.03]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Line</TableHead>
            <TableHead>Date</TableHead>
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
              <TableCell>{r.bankDate || "—"}</TableCell>
              <TableCell>{r.reference || "—"}</TableCell>
              <TableCell>₹{r.bankAmount.toLocaleString("en-IN")}</TableCell>
              <TableCell className="capitalize text-muted-foreground">{r.bankDirection}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={STATUS_BADGE_CLASS[r.status]}>
                  {STATUS_LABEL[r.status]}
                </Badge>
                {r.match && reconciledIds.has(r.match.id) && (
                  <span className="ml-1.5 text-xs text-emerald-600">Reconciled</span>
                )}
                {r.reasons && r.reasons.length > 0 && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{r.reasons.join(", ")}</div>
                )}
                {r.matchedBy === "date-amount" && (
                  <div className="mt-0.5 text-xs text-muted-foreground">by date + amount</div>
                )}
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
