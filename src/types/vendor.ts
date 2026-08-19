export type VendorPriority = "primary" | "secondary" | "tertiary";

export type VendorCategoryRow = {
  id: string;
  name: string;
  created_at: string;
};

export type VendorSubCategoryRow = {
  id: string;
  category_id: string;
  name: string;
  created_at: string;
};

export type VendorRow = {
  id: string;
  name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  additional_contact_number: string | null;
  category: string | null;
  sub_category: string | null;
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
