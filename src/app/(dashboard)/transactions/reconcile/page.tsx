import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { ReconcileClient } from "@/components/transactions/reconcile-client";
import type { TransactionRow } from "@/types/transaction";

export default async function ReconcileTransactionsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  requireRole(profile, ["admin", "developer", "project_manager"]);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, booking:bookings(customer_name, brand), creator:profiles(full_name)")
    .order("transaction_date", { ascending: false });

  return <ReconcileClient transactions={(transactions ?? []) as unknown as TransactionRow[]} />;
}
