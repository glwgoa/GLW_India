"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileCheck2, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TransactionsTable } from "./transactions-table";
import { NewTransactionDialog } from "./new-transaction-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PageHeaderIcon } from "@/components/page-header-icon";
import { DownloadButton } from "@/components/motion/download-button";
import { downloadCsv } from "@/lib/csv";
import { transactionDescription } from "@/lib/transaction-display";
import type { TransactionDirection, TransactionRow } from "@/types/transaction";
import type { Profile } from "@/types/profile";

const DIRECTION_LABEL: Record<TransactionDirection, string> = {
  received: "Received",
  paid: "Paid",
};

export function TransactionsClient({
  initialTransactions,
  profile,
}: {
  initialTransactions: TransactionRow[];
  profile: Profile;
}) {
  const [transactions, setTransactions] = useState<TransactionRow[]>(initialTransactions);
  const [directionFilter, setDirectionFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase
      .from("transactions")
      .select("*, booking:bookings(customer_name, brand), creator:profiles(full_name)")
      .order("transaction_date", { ascending: false });
    if (data) setTransactions(data as unknown as TransactionRow[]);
  }

  const visibleTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (directionFilter && t.direction !== directionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [t.transaction_id ?? "", t.booking?.customer_name ?? "", t.notes ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, directionFilter, search]);

  const totals = useMemo(() => {
    const received = visibleTransactions
      .filter((t) => t.direction === "received")
      .reduce((sum, t) => sum + t.amount, 0);
    const paid = visibleTransactions
      .filter((t) => t.direction === "paid")
      .reduce((sum, t) => sum + t.amount, 0);
    return { received, paid, net: received - paid };
  }, [visibleTransactions]);

  function handleDownload() {
    const headers = [
      "Date of transaction",
      "Description",
      "Transaction ID",
      "Debit",
      "Credit",
      "Bank A/c",
      "Added by",
    ];
    const rows = visibleTransactions.map((t) => [
      new Date(t.transaction_date).toLocaleString("en-IN"),
      transactionDescription(t),
      t.transaction_id ?? "",
      t.direction === "paid" ? t.amount : "",
      t.direction === "received" ? t.amount : "",
      t.brand ?? "",
      t.creator?.full_name ?? "",
    ]);
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`transactions-${date}.csv`, headers, rows);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PageHeaderIcon icon={Receipt} color="var(--chart-4)" />
          <div>
            <h1 className="text-2xl font-semibold">Transactions</h1>
            <p className="text-sm text-muted-foreground">
              Booking advances sync in automatically; add other payments manually.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/transactions/reconcile" />}>
            <FileCheck2 />
            Reconcile statement
          </Button>
          <DownloadButton onDownload={handleDownload} />
          <NewTransactionDialog profile={profile} onAdded={refresh} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-muted/30 p-3 text-center">
          <div className="text-xs text-muted-foreground">Received</div>
          <div className="text-base font-semibold text-emerald-600">
            ₹{totals.received.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 text-center">
          <div className="text-xs text-muted-foreground">Paid</div>
          <div className="text-base font-semibold text-destructive">
            ₹{totals.paid.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 text-center">
          <div className="text-xs text-muted-foreground">Net</div>
          <div className={`text-base font-semibold ${totals.net >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {totals.net >= 0 ? "+" : ""}₹{totals.net.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="transaction-search" className="text-xs text-muted-foreground">
            Search
          </Label>
          <Input
            id="transaction-search"
            placeholder="Transaction ID, customer, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v ?? "")}>
            <SelectTrigger className="w-36">
              <SelectValue>{(value: string) => DIRECTION_LABEL[value as TransactionDirection] ?? "All"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(directionFilter || search) && (
          <div className="space-y-1.5">
            <Label className="invisible text-xs">Clear</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDirectionFilter("");
                setSearch("");
              }}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      <TransactionsTable transactions={visibleTransactions} setTransactions={setTransactions} refresh={refresh} />
    </div>
  );
}
