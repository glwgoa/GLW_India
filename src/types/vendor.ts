export type VendorPriority = "primary" | "secondary" | "tertiary";

export type VendorRow = {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string | null;
  additional_contact_number: string | null;
  category: string | null;
  priority: string | null;
  city: string | null;
  location: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
  payment_terms: string | null;
  created_at: string;
};
