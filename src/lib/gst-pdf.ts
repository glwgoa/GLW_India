import { DEFAULT_HSN_SAC, GST_DOC_LABEL, GST_SELLERS, stateName } from "@/lib/gst-config";
import { amountInWords, formatInr } from "@/lib/gst";
import type { GstDocument } from "@/types/gst-document";

/** Builds the PDF for an invoice, quotation or credit note and downloads it. */
export async function downloadGstPdf(doc: GstDocument, refNumber?: string | null) {
  // Loaded on demand so the PDF libraries stay out of the main bundle.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const seller = GST_SELLERS[doc.brand];
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const left = 14;
  const right = 196;
  const intra = doc.igst === 0;
  // The built-in PDF fonts have no rupee glyph, so amounts print as "Rs."
  const inr = (n: number) => `Rs. ${formatInr(n)}`;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text((GST_DOC_LABEL[doc.doc_type] ?? "Document").toUpperCase(), right, 18, { align: "right" });

  pdf.setFontSize(13);
  pdf.text(seller?.legalName ?? doc.brand, left, 18);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const sellerLines = [
    seller?.address,
    seller?.gstin ? `GSTIN: ${seller.gstin}` : "",
    seller ? `State: ${stateName(seller.stateCode)} (${seller.stateCode})` : "",
    [seller?.phone, seller?.email].filter(Boolean).join("  |  "),
  ].filter(Boolean) as string[];
  pdf.text(sellerLines, left, 24);

  pdf.text(
    [
      `No: ${doc.doc_number}`,
      `Date: ${new Date(`${doc.doc_date}T00:00:00`).toLocaleDateString("en-GB")}`,
      ...(refNumber ? [`Against invoice: ${refNumber}`] : []),
    ],
    right,
    26,
    { align: "right" },
  );

  const billY = 24 + sellerLines.length * 4.5 + 6;
  pdf.setFont("helvetica", "bold");
  pdf.text("Bill to", left, billY);
  pdf.setFont("helvetica", "normal");
  const billLines = [
    doc.customer_name,
    doc.customer_address ?? "",
    doc.customer_gstin ? `GSTIN: ${doc.customer_gstin}` : "",
    `Place of supply: ${stateName(doc.customer_state_code)} (${doc.customer_state_code})`,
  ].filter(Boolean);
  pdf.text(billLines, left, billY + 5);

  const head = [["#", "Description", "HSN/SAC", "Taxable", "Rate", ...(intra ? ["CGST", "SGST"] : ["IGST"]), "Amount"]];
  const body = [
    [
      "1",
      doc.description,
      doc.hsn_sac || DEFAULT_HSN_SAC,
      inr(doc.taxable_value),
      `${doc.gst_rate}%`,
      ...(intra ? [inr(doc.cgst), inr(doc.sgst)] : [inr(doc.igst)]),
      inr(doc.total),
    ],
  ];
  autoTable(pdf, {
    startY: billY + 5 + billLines.length * 4.5 + 4,
    head,
    body,
    theme: "grid",
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: [30, 30, 30] },
    columnStyles: { 1: { cellWidth: 55 } },
  });

  const afterTable = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let y = afterTable + 8;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(`Total: ${inr(doc.total)}`, right, y, { align: "right" });
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(amountInWords(doc.total), right, y, { align: "right" });

  if (doc.notes) {
    y += 10;
    pdf.setFont("helvetica", "bold");
    pdf.text("Notes", left, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(pdf.splitTextToSize(doc.notes, right - left), left, y + 5);
  }

  pdf.setFontSize(8);
  pdf.text(
    doc.doc_type === "quotation"
      ? "This is a quotation and not a tax invoice."
      : "This is a computer-generated document.",
    left,
    285,
  );
  pdf.save(`${doc.doc_number.replace(/\//g, "-")}.pdf`);
}
