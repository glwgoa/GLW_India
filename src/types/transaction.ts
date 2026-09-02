export type TransactionDirection = "paid" | "received";
export type TransactionSource = "manual" | "booking";

export type TransactionRow = {
  id: string;
  booking_id: string | null;
  direction: TransactionDirection;
  amount: number;
  transaction_id: string | null;
  transaction_date: string;
  brand: string | null;
  notes: string | null;
  source: TransactionSource;
  created_by: string | null;
  created_at: string;
  booking: { customer_name: string; brand: string | null } | null;
  creator: { full_name: string } | null;
};
