"use client";

import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { transactionDescription } from "@/lib/transaction-display";
import type { TransactionRow } from "@/types/transaction";

export function TransactionsTable({
  transactions,
  setTransactions,
  refresh,
}: {
  transactions: TransactionRow[];
  setTransactions: React.Dispatch<React.SetStateAction<TransactionRow[]>>;
  refresh: () => void | Promise<void>;
}) {
  async function deleteTransaction(transaction: TransactionRow) {
    if (!window.confirm("Delete this transaction? This cannot be undone.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("transactions").delete().eq("id", transaction.id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== transaction.id));
    toast.success("Transaction deleted");
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground">No transactions found.</p>;
  }

  return (
    <div className="rounded-lg border border-white/15 bg-background/85 shadow-lg shadow-black/[0.03] backdrop-blur-xl dark:shadow-black/30">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date of transaction</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Transaction ID</TableHead>
            <TableHead>Debit</TableHead>
            <TableHead>Credit</TableHead>
            <TableHead>Bank A/c</TableHead>
            <TableHead>Added by</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const isManual = transaction.source === "manual";
            return (
              <TableRow key={transaction.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(transaction.transaction_date).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </TableCell>
                <TableCell className="max-w-52 whitespace-normal text-muted-foreground">
                  {transactionDescription(transaction)}
                </TableCell>
                <TableCell className="text-muted-foreground">{transaction.transaction_id ?? "—"}</TableCell>
                <TableCell className="font-medium text-destructive">
                  {transaction.direction === "paid" ? `₹${transaction.amount.toLocaleString("en-IN")}` : "—"}
                </TableCell>
                <TableCell className="font-medium text-emerald-600">
                  {transaction.direction === "received" ? `₹${transaction.amount.toLocaleString("en-IN")}` : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{transaction.brand ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{transaction.creator?.full_name ?? "—"}</TableCell>
                <TableCell>
                  {isManual && (
                    <div className="flex items-center gap-1">
                      <EditTransactionDialog transaction={transaction} onSaved={refresh} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete transaction"
                        onClick={() => deleteTransaction(transaction)}
                      >
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
