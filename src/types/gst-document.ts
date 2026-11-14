export type GstDocType = "invoice" | "proforma" | "quotation" | "credit_note";

/** One invoice row. `rate` is the taxable unit price (GST is added on top). */
export type GstLineItem = {
  description: string;
  qty: number;
  rate: number;
  gst_rate: number;
};

export type GstDocument = {
  id: string;
  doc_type: GstDocType;
  doc_number: string;
  doc_date: string;
  brand: string;
  booking_id: string | null;
  ref_document_id: string | null;
  customer_name: string;
  customer_gstin: string | null;
  customer_address: string | null;
  customer_state_code: string;
  description: string;
  hsn_sac: string | null;
  taxable_value: number;
  gst_rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  notes: string | null;
  line_items: GstLineItem[] | null;
  paid_amount: number;
  paid_date: string | null;
  created_at: string;
};
