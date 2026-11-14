import { GST_SELLERS } from "@/lib/gst-config";
import { formatInr } from "@/lib/gst";
import type { GstDocument, GstLineItem } from "@/types/gst-document";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const BLUE: [number, number, number] = [0, 87, 231];
const GREY: [number, number, number] = [110, 110, 110];

const TITLE: Record<GstDocument["doc_type"], string> = {
  invoice: "INVOICE",
  quotation: "QUOTATION",
  credit_note: "CREDIT NOTE",
};

/** Line items of a document; older single-line documents are rebuilt from the legacy columns. */
export function lineItemsOf(doc: GstDocument): GstLineItem[] {
  if (doc.line_items && doc.line_items.length > 0) return doc.line_items;
  return [{ description: doc.description, qty: 1, rate: doc.taxable_value, gst_rate: doc.gst_rate }];
}

const dmy = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
};

async function fetchBase64(url: string) {
  const buf = await (await fetch(url)).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/** Builds the PDF for an invoice, quotation or credit note and downloads it. */
export async function downloadGstPdf(
  doc: GstDocument,
  refNumber?: string | null,
  withSignature = false,
) {
  // Loaded on demand so the PDF libraries stay out of the main bundle.
  const [{ jsPDF }, { default: autoTable }, regular, bold, logo, signature] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    fetchBase64("/invoice/Roboto-Regular.ttf"),
    fetchBase64("/invoice/Roboto-Bold.ttf"),
    fetchBase64("/invoice/logo.png"),
    withSignature ? fetchBase64("/invoice/signature.png") : Promise.resolve(null),
  ]);

  const seller = GST_SELLERS[doc.brand] ?? GST_SELLERS["Waterz Goa"];
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  // Roboto has the rupee glyph; the built-in PDF fonts do not.
  pdf.addFileToVFS("Roboto-Regular.ttf", regular);
  pdf.addFileToVFS("Roboto-Bold.ttf", bold);
  pdf.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  pdf.addFont("Roboto-Bold.ttf", "Roboto", "bold");

  const left = 14;
  const right = 196;
  const inr = (n: number) => `₹${formatInr(n)}`;
  const font = (style: "normal" | "bold", size: number) => {
    pdf.setFont("Roboto", style);
    pdf.setFontSize(size);
  };
  pdf.setTextColor(0);

  // Title
  font("bold", 20);
  pdf.text(TITLE[doc.doc_type] ?? "INVOICE", 105, 20, { align: "center" });

  // Company block (left) + logo (right)
  font("bold", 11);
  pdf.text(seller.legalName, left, 32);
  font("normal", 9.5);
  const sellerLines = [
    ...pdf.splitTextToSize(seller.address, 100),
    seller.email ? `Email: ${seller.email}` : "",
    seller.gstin ? `GSTIN: ${seller.gstin}` : "",
  ].filter(Boolean) as string[];
  pdf.text(sellerLines, left, 38);
  pdf.addImage(`data:image/png;base64,${logo}`, "PNG", right - 60, 24, 60, 60 * (724 / 2172));

  let y = 38 + sellerLines.length * 4.6 + 4;
  pdf.setDrawColor(190);
  pdf.line(left, y, right, y);
  y += 8;

  // Bill to (left) + number / date (right)
  font("bold", 10);
  pdf.text("Bill To", left, y);
  font("normal", 9.5);
  const billLines = [
    doc.customer_name,
    ...(doc.customer_address ? pdf.splitTextToSize(doc.customer_address, 95) : []),
    doc.customer_gstin ? `GSTIN: ${doc.customer_gstin}` : "",
  ].filter(Boolean) as string[];
  pdf.text(billLines, left, y + 5.5);

  const metaX = 125;
  const metaRows: [string, string][] = [
    ["Invoice No", doc.doc_number],
    ["Invoice Date", dmy(doc.doc_date)],
    ...(refNumber ? ([["Against Invoice", refNumber]] as [string, string][]) : []),
  ];
  if (doc.doc_type !== "invoice") {
    metaRows[0][0] = doc.doc_type === "quotation" ? "Quotation No" : "Credit Note No";
    metaRows[1][0] = "Date";
  }
  font("bold", 9.5);
  metaRows.forEach(([k], i) => pdf.text(`${k} :`, metaX, y + i * 5.5));
  font("normal", 9.5);
  metaRows.forEach(([, v], i) => pdf.text(v, metaX + 27, y + i * 5.5));

  y += 5.5 + Math.max(billLines.length * 4.6, metaRows.length * 5.5) + 4;

  // Items table
  const items = lineItemsOf(doc);
  const rows = items.map((it, i) => {
    const gst = round2((it.qty * it.rate * it.gst_rate) / 100);
    return { n: i + 1, it, gst, amount: round2(it.qty * it.rate + gst) };
  });
  const itemTotal = round2(rows.reduce((s, r) => s + r.amount, 0));

  autoTable(pdf, {
    startY: y,
    head: [["Sl.", "Description", "Qty", "Qty × Rate", "GST", "Amount"]],
    body: [
      ...rows.map((r) => [
        String(r.n),
        r.it.description,
        String(r.it.qty),
        `${r.it.qty} × ${inr(r.it.rate)}\n= ${inr(round2(r.it.qty * r.it.rate))}`,
        { content: `${inr(r.gst)}\n${r.it.gst_rate}%`, styles: { halign: "right" as const } },
        inr(r.amount),
      ]),
      [
        { content: "Item Total", colSpan: 5, styles: { fontStyle: "bold" as const, halign: "right" as const } },
        { content: inr(itemTotal), styles: { fontStyle: "bold" as const } },
      ],
    ],
    theme: "grid",
    margin: { left, right: 210 - right },
    styles: { font: "Roboto", fontSize: 9, cellPadding: 2.5, lineColor: [210, 210, 210], lineWidth: 0.2, textColor: 20 },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 40, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 32, halign: "right" },
    },
    didParseCell: (d) => {
      if (d.section === "head" && (d.column.index >= 3)) d.cell.styles.halign = "right";
      if (d.section === "head" && d.column.index === 2) d.cell.styles.halign = "center";
    },
    didDrawCell: (d) => {
      // GST % in grey under the rupee amount
      if (d.section === "body" && d.column.index === 4 && typeof d.cell.raw === "object" && d.row.index < rows.length) {
        const r = rows[d.row.index];
        const x = d.cell.x + d.cell.width - d.cell.padding("right");
        const top = d.cell.y + d.cell.padding("top");
        pdf.setFillColor(255, 255, 255);
        pdf.rect(d.cell.x + 0.3, d.cell.y + 0.3, d.cell.width - 0.6, d.cell.height - 0.6, "F");
        font("normal", 9);
        pdf.setTextColor(20);
        pdf.text(inr(r.gst), x, top + 3, { align: "right" });
        font("normal", 8);
        pdf.setTextColor(...GREY);
        pdf.text(`${r.it.gst_rate}%`, x, top + 7.2, { align: "right" });
        pdf.setTextColor(0);
      }
    },
  });

  // Totals block
  let ty = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const gstTotal = round2(doc.cgst + doc.sgst + doc.igst);
  const totals: [string, string, boolean][] = [
    ["Subtotal", inr(doc.taxable_value), false],
    ["GST", inr(gstTotal), false],
    ["Total", inr(doc.total), true],
  ];
  if (doc.doc_type === "invoice") {
    const paidLabel = doc.paid_date ? `Paid (${dmy(doc.paid_date)})` : "Paid";
    totals.push([paidLabel, inr(doc.paid_amount ?? 0), false]);
    totals.push(["Balance Due", inr(Math.max(0, round2(doc.total - (doc.paid_amount ?? 0)))), true]);
  }
  if (ty + totals.length * 6 + 82 > 290) {
    pdf.addPage();
    ty = 20;
  }
  const labelX = 128;
  // Total and Balance Due sit centred between two rules; other rows are plain.
  let cy = ty - 4;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.3);
  totals.forEach(([label, value, strong]) => {
    const h = strong ? 10 : 6;
    const baseline = cy + h / 2 + 1.2;
    if (strong) {
      pdf.line(labelX - 2, cy, right, cy);
      pdf.line(labelX - 2, cy + h, right, cy + h);
    }
    font(strong ? "bold" : "normal", 10);
    pdf.text(label, labelX, baseline);
    pdf.text(value, right, baseline, { align: "right" });
    cy += h;
  });
  ty = cy + 4;

  if (doc.notes) {
    font("bold", 9);
    pdf.text("Notes", left, ty - 18);
    font("normal", 9);
    pdf.text(pdf.splitTextToSize(doc.notes, 100), left, ty - 13);
  }

  // Optional signature block, otherwise a "signature not required" note
  let noteY = Math.max(ty + 14, 270);
  const kind = doc.doc_type === "invoice" ? "invoice" : doc.doc_type === "quotation" ? "quotation" : "credit note";
  if (signature) {
    let sigY = Math.max(ty + 6, 236);
    if (sigY + 36 > 290) {
      pdf.addPage();
      sigY = 20;
    }
    const sigW = 42;
    pdf.addImage(`data:image/png;base64,${signature}`, "PNG", right - sigW - 4, sigY, sigW, sigW * (164 / 343));
    pdf.setDrawColor(...GREY);
    pdf.line(right - 52, sigY + 21, right, sigY + 21);
    font("normal", 9);
    pdf.setTextColor(...GREY);
    pdf.text("Authorised Signatory", right - 26, sigY + 26, { align: "center" });
    noteY = sigY + 33;
    font("normal", 9);
    pdf.setTextColor(...GREY);
    pdf.text(`This is a computer generated ${kind}.`, 105, noteY, { align: "center" });
  } else {
    font("normal", 9);
    pdf.setTextColor(...GREY);
    pdf.text(`This is a computer generated ${kind}, signature not required.`, 105, noteY, { align: "center" });
  }

  if (doc.doc_type === "quotation") {
    font("normal", 8);
    pdf.setTextColor(...GREY);
    pdf.text("This is a quotation and not a tax invoice.", 105, noteY + 5, { align: "center" });
  }

  pdf.save(`${doc.doc_number.replace(/\//g, "-")}.pdf`);
}
