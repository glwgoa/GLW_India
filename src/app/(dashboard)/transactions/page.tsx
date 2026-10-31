import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { TransactionsClient } from "@/components/transactions/transactions-client";
import type { GstDocument } from "@/types/gst-document";
import type { TransactionRow } from "@/types/transaction";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  requireRole(profile, ["admin", "developer", "project_manager"]);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, booking:bookings(customer_name, brand), creator:profiles(full_name)")
    .order("transaction_date", { ascending: false });

  // Empty until the gst_documents migration has been applied.
  const { data: gstDocuments } = await supabase
    .from("gst_documents")
    .select("*")
    .order("doc_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <TransactionsClient
      initialTransactions={(transactions ?? []) as unknown as TransactionRow[]}
      initialGstDocuments={(gstDocuments ?? []) as GstDocument[]}
      profile={profile}
    />
  );
}
