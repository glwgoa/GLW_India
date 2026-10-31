"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { downloadCsv } from "@/lib/csv";
import { formatInr } from "@/lib/gst";
import { stateName } from "@/lib/gst-config";
import type { GstDocument } from "@/types/gst-document";

/** GSTR-1 / GSTR-3B style summary for one month. Credit notes count as negatives; quotations are ignored. */
export function GstReportDialog({ documents }: { documents: GstDocument[] }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const monthDocs = useMemo(
    () =>
      documents
        .filter((d) => d.doc_type !== "quotation" && d.doc_date.startsWith(month))
        .sort((a, b) => a.doc_date.localeCompare(b.doc_date)),
    [documents, month],
  );

  const sign = (d: GstDocument) => (d.doc_type === "credit_note" ? -1 : 1);
  const sum = (pick: (d: GstDocument) => number) =>
    monthDocs.reduce((acc, d) => acc + sign(d) * pick(d), 0);
  const totals = {
    taxable: sum((d) => d.taxable_value),
    cgst: sum((d) => d.cgst),
    sgst: sum((d) => d.sgst),
    igst: sum((d) => d.igst),
    total: sum((d) => d.total),
  };

  function handleDownload() {
    const headers = [
      "Section", "Document type", "Document no", "Date", "Customer", "Customer GSTIN",
      "Place of supply", "Taxable value", "GST rate", "CGST", "SGST", "IGST", "Invoice value",
    ];
    const rows = monthDocs.map((d) => [
      d.customer_gstin ? "B2B" : "B2C",
      d.doc_type === "credit_note" ? "Credit note" : "Invoice",
      d.doc_number,
      d.doc_date,
      d.customer_name,
      d.customer_gstin ?? "",
      `${d.customer_state_code}-${stateName(d.customer_state_code)}`,
      sign(d) * d.taxable_value,
      d.gst_rate,
      sign(d) * d.cgst,
      sign(d) * d.sgst,
      sign(d) * d.igst,
      sign(d) * d.total,
    ]);
    rows.push(["", "", "", "", "TOTAL (net of credit notes)", "", "", totals.taxable, "", totals.cgst, totals.sgst, totals.igst, totals.total]);
    downloadCsv(`gst-report-${month}.csv`, headers, rows);
  }

  const tiles: [string, number][] = [
    ["Taxable value", totals.taxable],
    ["CGST", totals.cgst],
    ["SGST", totals.sgst],
    ["IGST", totals.igst],
  ];

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <BarChart3 />
        GST report
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>GST report</DialogTitle>
          <DialogDescription>
            Monthly summary for GSTR-1 / GSTR-3B filing. Credit notes are subtracted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gst-report-month">Month</Label>
            <Input
              id="gst-report-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {tiles.map(([label, value]) => (
              <div key={label} className="rounded-lg border bg-muted/30 p-3 text-center">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-base font-semibold">₹{formatInr(value)}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {monthDocs.length} document{monthDocs.length === 1 ? "" : "s"} · total ₹{formatInr(totals.total)}
          </p>
          <Button onClick={handleDownload} disabled={monthDocs.length === 0} className="w-full">
            Download CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
