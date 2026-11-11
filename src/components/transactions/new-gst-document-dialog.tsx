"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FilePlus2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRAND_NAMES } from "@/lib/brands";
import { effectiveSalePrice } from "@/lib/booking-pricing";
import { computeGst, formatInr } from "@/lib/gst";
import { lineItemsOf } from "@/lib/gst-pdf";
import {
  DEFAULT_GST_RATE,
  DEFAULT_HSN_SAC,
  GST_DOC_LABEL,
  GST_RATES,
  GST_SELLERS,
  INDIAN_STATES,
} from "@/lib/gst-config";
import { Plus, Trash2 } from "lucide-react";
import type { BookingRow } from "@/types/booking";
import type { GstDocType, GstDocument, GstLineItem } from "@/types/gst-document";
import type { Profile } from "@/types/profile";

type BookingOption = Pick<
  BookingRow,
  "id" | "customer_name" | "customer_contact" | "brand" | "sale_price" | "guest_count" | "kids_count" | "kids_price" | "booking_date"
> & { item: { name: string; category: string | null } | null };

const todayInput = () => new Date().toLocaleDateString("en-CA");
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type ItemDraft = { description: string; qty: string; price: string; rate: number };
const newItem = (): ItemDraft => ({ description: "", qty: "1", price: "", rate: DEFAULT_GST_RATE });

/** Turns the drafted rows into stored line items plus the aggregate columns. */
function buildDocument(items: ItemDraft[], inclusive: boolean, intraState: boolean) {
  const lines: GstLineItem[] = [];
  for (const it of items) {
    const qty = Number(it.qty);
    const price = Number(it.price);
    if (!it.description.trim() || !(qty > 0) || !(price > 0)) continue;
    const g = computeGst({ amount: qty * price, rate: it.rate, inclusive, intraState });
    lines.push({ description: it.description.trim(), qty, rate: round2(g.taxable / qty), gst_rate: it.rate });
  }
  if (lines.length === 0) return null;
  const taxable = round2(lines.reduce((s, l) => s + l.qty * l.rate, 0));
  const tax = round2(lines.reduce((s, l) => s + round2((l.qty * l.rate * l.gst_rate) / 100), 0));
  const cgst = intraState ? round2(tax / 2) : 0;
  const sgst = intraState ? round2(tax - cgst) : 0;
  const igst = intraState ? 0 : tax;
  return { lines, taxable, tax, cgst, sgst, igst, total: round2(taxable + tax) };
}

export function NewGstDocumentDialog({
  profile,
  documents,
  onAdded,
}: {
  profile: Profile;
  documents: GstDocument[];
  onAdded: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookings, setBookings] = useState<BookingOption[]>([]);

  const [docType, setDocType] = useState<GstDocType>("invoice");
  const [brand, setBrand] = useState<string>(BRAND_NAMES[0]);
  const [bookingId, setBookingId] = useState("");
  const [refDocId, setRefDocId] = useState("");
  const [docDate, setDocDate] = useState(todayInput());
  const [customerName, setCustomerName] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [stateCode, setStateCode] = useState(GST_SELLERS[BRAND_NAMES[0]].stateCode);
  const [items, setItems] = useState<ItemDraft[]>([newItem()]);
  const [hsnSac, setHsnSac] = useState(DEFAULT_HSN_SAC);
  const [inclusive, setInclusive] = useState(true);
  const [paidAmount, setPaidAmount] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [notes, setNotes] = useState("");

  // Bookings are only needed to prefill a document, so load them when the dialog first opens.
  useEffect(() => {
    if (!open || bookings.length > 0) return;
    createClient()
      .from("bookings")
      .select(
        "id, customer_name, customer_contact, brand, sale_price, guest_count, kids_count, kids_price, booking_date, item:catalog_items(name, category)",
      )
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => data && setBookings(data as unknown as BookingOption[]));
  }, [open, bookings.length]);

  const invoices = useMemo(() => documents.filter((d) => d.doc_type === "invoice"), [documents]);
  const sellerStateCode = GST_SELLERS[brand]?.stateCode ?? "30";
  const gst = useMemo(
    () => buildDocument(items, inclusive, stateCode === sellerStateCode),
    [items, inclusive, stateCode, sellerStateCode],
  );
  const updateItem = (i: number, patch: Partial<ItemDraft>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  function pickBooking(id: string) {
    setBookingId(id);
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    setCustomerName(b.customer_name);
    if (b.brand && (BRAND_NAMES as readonly string[]).includes(b.brand)) setBrand(b.brand);
    // Only item.category is read by the pricing helper, and that is part of what we selected.
    const price = effectiveSalePrice(b as unknown as BookingRow);
    setItems([
      {
        description: `${b.item?.name ?? "Booking"} on ${new Date(b.booking_date).toLocaleDateString("en-GB")}`,
        qty: "1",
        price: price != null ? String(price) : "",
        rate: DEFAULT_GST_RATE,
      },
    ]);
  }

  function pickRefInvoice(id: string) {
    setRefDocId(id);
    const inv = invoices.find((x) => x.id === id);
    if (!inv) return;
    setBrand(inv.brand);
    setCustomerName(inv.customer_name);
    setCustomerGstin(inv.customer_gstin ?? "");
    setCustomerAddress(inv.customer_address ?? "");
    setStateCode(inv.customer_state_code);
    setHsnSac(inv.hsn_sac ?? "");
    setInclusive(false);
    setItems(
      lineItemsOf(inv).map((l) => ({
        description: `Credit against ${inv.doc_number}: ${l.description}`,
        qty: String(l.qty),
        price: String(l.rate),
        rate: l.gst_rate,
      })),
    );
    setBookingId(inv.booking_id ?? "");
  }

  async function handleSubmit() {
    if (!customerName.trim()) {
      toast.error("Enter the customer name");
      return;
    }
    if (!gst) {
      toast.error("Add at least one item with a description, quantity and price");
      return;
    }
    const paid = docType === "invoice" ? Number(paidAmount) || 0 : 0;
    if (paid < 0 || paid > gst.total) {
      toast.error("Paid amount must be between 0 and the total");
      return;
    }
    if (docType === "credit_note" && !refDocId) {
      toast.error("Pick the invoice this credit note is against");
      return;
    }
    setSubmitting(true);
    const { error } = await createClient()
      .from("gst_documents")
      .insert({
        doc_type: docType,
        doc_date: docDate,
        brand,
        booking_id: bookingId || null,
        ref_document_id: docType === "credit_note" ? refDocId : null,
        customer_name: customerName.trim(),
        customer_gstin: customerGstin.trim().toUpperCase() || null,
        customer_address: customerAddress.trim() || null,
        customer_state_code: stateCode,
        description: gst.lines.map((l) => l.description).join("; "),
        hsn_sac: hsnSac.trim() || null,
        taxable_value: gst.taxable,
        gst_rate: gst.lines[0].gst_rate,
        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,
        total: gst.total,
        line_items: gst.lines,
        paid_amount: paid,
        paid_date: paid > 0 && paidDate ? paidDate : null,
        notes: notes.trim() || null,
        created_by: profile.id,
      });
    setSubmitting(false);
    if (error) {
      toast.error(`Could not create document: ${error.message}`);
      return;
    }
    toast.success(`${GST_DOC_LABEL[docType]} created`);
    setOpen(false);
    setBookingId("");
    setRefDocId("");
    setCustomerName("");
    setCustomerGstin("");
    setCustomerAddress("");
    setItems([newItem()]);
    setPaidAmount("");
    setPaidDate("");
    setNotes("");
    await onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <FilePlus2 />
        New GST document
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New GST document</DialogTitle>
          <DialogDescription>Create an invoice, quotation or credit note and download it as a PDF.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Document</Label>
              <Select value={docType} onValueChange={(v) => v && setDocType(v as GstDocType)}>
                <SelectTrigger>
                  <SelectValue>{(v: string) => GST_DOC_LABEL[v as GstDocType]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(GST_DOC_LABEL) as GstDocType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {GST_DOC_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select value={brand} onValueChange={(v) => v && setBrand(v)}>
                <SelectTrigger>
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {BRAND_NAMES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst-doc-date">Date</Label>
              <Input id="gst-doc-date" type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
            </div>
          </div>

          {docType === "credit_note" ? (
            <div className="space-y-2">
              <Label>Against invoice</Label>
              <Select value={refDocId} onValueChange={(v) => v && pickRefInvoice(v)}>
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) => {
                      const inv = invoices.find((i) => i.id === v);
                      return inv ? `${inv.doc_number} · ${inv.customer_name}` : "Select invoice";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.doc_number} · {i.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Fill from booking (optional)</Label>
              <Select value={bookingId} onValueChange={(v) => v && pickBooking(v)}>
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) => {
                      const b = bookings.find((x) => x.id === v);
                      return b ? `${b.customer_name} · ${b.item?.name ?? "—"}` : "Select booking";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {bookings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.customer_name} · {b.item?.name ?? "—"} ·{" "}
                      {new Date(b.booking_date).toLocaleDateString("en-GB")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gst-customer">Customer name</Label>
              <Input id="gst-customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst-customer-gstin">Customer GSTIN</Label>
              <Input
                id="gst-customer-gstin"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value)}
                placeholder="Optional (B2B)"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gst-address">Customer address</Label>
              <Input
                id="gst-address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Place of supply</Label>
              <Select value={stateCode} onValueChange={(v) => v && setStateCode(v)}>
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) => INDIAN_STATES.find((s) => s.code === v)?.name ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Items</Label>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_4rem_6.5rem_5rem_2rem] items-center gap-2">
                <Input
                  aria-label="Description"
                  placeholder="Description"
                  value={it.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                />
                <Input
                  aria-label="Quantity"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Qty"
                  value={it.qty}
                  onChange={(e) => updateItem(i, { qty: e.target.value })}
                />
                <Input
                  aria-label="Price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Price ₹"
                  value={it.price}
                  onChange={(e) => updateItem(i, { price: e.target.value })}
                />
                <Select value={String(it.rate)} onValueChange={(v) => v && updateItem(i, { rate: Number(v) })}>
                  <SelectTrigger>
                    <SelectValue>{(v: string) => `${v}%`}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {GST_RATES.map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove item"
                  disabled={items.length === 1}
                  onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, newItem()])}>
              <Plus />
              Add item
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gst-hsn">HSN / SAC</Label>
              <Input id="gst-hsn" value={hsnSac} onChange={(e) => setHsnSac(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Price includes GST?</Label>
              <Select value={inclusive ? "yes" : "no"} onValueChange={(v) => setInclusive(v === "yes")}>
                <SelectTrigger>
                  <SelectValue>{(v: string) => (v === "yes" ? "Yes, inclusive" : "No, add GST")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes, inclusive</SelectItem>
                  <SelectItem value="no">No, add GST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {gst && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{formatInr(gst.taxable)}</span>
              </div>
              {gst.igst > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGST</span>
                  <span>₹{formatInr(gst.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CGST</span>
                    <span>₹{formatInr(gst.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SGST</span>
                    <span>₹{formatInr(gst.sgst)}</span>
                  </div>
                </>
              )}
              <div className="mt-1 flex justify-between border-t pt-1 font-semibold">
                <span>Total</span>
                <span>₹{formatInr(gst.total)}</span>
              </div>
            </div>
          )}

          {docType === "invoice" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gst-paid">Paid amount (₹)</Label>
                <div className="flex gap-2">
                  <Input
                    id="gst-paid"
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!gst}
                    onClick={() => gst && setPaidAmount(String(gst.total))}
                  >
                    Full
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst-paid-date">Paid date</Label>
                <Input id="gst-paid-date" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="gst-notes">Notes</Label>
            <Textarea id="gst-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {submitting ? "Creating..." : `Create ${GST_DOC_LABEL[docType].toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
