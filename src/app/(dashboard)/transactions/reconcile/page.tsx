import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { ReconcileClient, type ReconciledRecord } from "@/components/transactions/reconcile-client";
import type { TransactionRow } from "@/types/transaction";

export default async function ReconcileTransactionsPage() {
  const supabase = await createClient();

  // Profile and data queries run together — RLS already guards the rows,
  // requireRole below still redirects unauthorized roles before rendering.
  const [profile, { data: transactions }, { data: reconciled }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("transactions")
      .select("*, booking:bookings(customer_name, brand), creator:profiles(full_name)")
      .order("transaction_date", { ascending: false }),
    // Empty until the transaction_reconciliations migration has been applied.
    supabase.from("transaction_reconciliations").select("transaction_id, reconciled_at, bank_account"),
  ]);

  requireRole(profile, ["admin", "developer", "project_manager", "accountant"]);

  return (
    <ReconcileClient
      transactions={(transactions ?? []) as unknown as TransactionRow[]}
      reconciled={(reconciled ?? []) as ReconciledRecord[]}
    />
  );
}
