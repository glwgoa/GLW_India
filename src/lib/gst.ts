const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Split an amount into taxable value and GST. Same-state sales get CGST + SGST
 * (half each); other-state sales get IGST. `inclusive` means `amount` already
 * contains the GST.
 */
export function computeGst({
  amount,
  rate,
  inclusive,
  intraState,
}: {
  amount: number;
  rate: number;
  inclusive: boolean;
  intraState: boolean;
}) {
  const taxable = round2(inclusive ? (amount * 100) / (100 + rate) : amount);
  const tax = round2(inclusive ? amount - taxable : (taxable * rate) / 100);
  const cgst = intraState ? round2(tax / 2) : 0;
  const sgst = intraState ? round2(tax - cgst) : 0;
  const igst = intraState ? 0 : tax;
  return { taxable, cgst, sgst, igst, total: round2(taxable + tax) };
}

export const formatInr = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
  "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ""));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

/** e.g. 1250.5 -> "Rupees One Thousand Two Hundred Fifty and Fifty Paise Only" (Indian numbering). */
export function amountInWords(value: number) {
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);
  const units: [number, string][] = [
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
  ];
  let rest = rupees;
  const parts: string[] = [];
  for (const [size, name] of units) {
    if (rest >= size) {
      parts.push(`${belowThousand(Math.floor(rest / size))} ${name}`);
      rest %= size;
    }
  }
  if (rest > 0) parts.push(belowThousand(rest));
  const rupeeWords = parts.length > 0 ? parts.join(" ") : "Zero";
  return `Rupees ${rupeeWords}${paise ? ` and ${belowThousand(paise)} Paise` : ""} Only`;
}
