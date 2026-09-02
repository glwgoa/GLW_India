import type { TransactionRow } from "@/types/transaction";

export function transactionDescription(transaction: TransactionRow) {
  if (transaction.source === "booking") {
    const name = transaction.booking?.customer_name;
    return name ? `Booking – ${name}` : "Booking advance";
  }
  return transaction.notes ?? "—";
}
