import type { GstDocType } from "@/types/gst-document";

/**
 * Seller details printed on every GST document, per brand.
 * TODO: replace the placeholders with each brand's real GSTIN, legal name and address.
 */
export type GstSeller = {
  legalName: string;
  gstin: string;
  address: string;
  stateCode: string;
  phone: string;
  email: string;
};

const PLACEHOLDER = (brand: string): GstSeller => ({
  legalName: brand,
  gstin: "ADD GSTIN",
  address: "ADD ADDRESS",
  stateCode: "30", // Goa
  phone: "",
  email: "",
});

export const GST_SELLERS: Record<string, GstSeller> = {
  "Waterz Goa": PLACEHOLDER("Waterz Goa"),
  GoaCruising: PLACEHOLDER("GoaCruising"),
  "Life on Yachts": PLACEHOLDER("Life on Yachts"),
  "Cruise Goa": PLACEHOLDER("Cruise Goa"),
};

/** TODO: set the SAC code used on your invoices. */
export const DEFAULT_HSN_SAC = "";
export const DEFAULT_GST_RATE = 5;
export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const GST_DOC_LABEL: Record<GstDocType, string> = {
  invoice: "Tax Invoice",
  quotation: "Quotation",
  credit_note: "Credit Note",
};

export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
];

export function stateName(code: string) {
  return INDIAN_STATES.find((s) => s.code === code)?.name ?? code;
}
