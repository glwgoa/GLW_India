export type GstDocType = "invoice" | "quotation" | "credit_note";

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
  created_at: string;
};
