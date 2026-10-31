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
import {
  DEFAULT_GST_RATE,
  DEFAULT_HSN_SAC,
  GST_DOC_LABEL,
  GST_RATES,
  GST_SELLERS,
  INDIAN_STATES,
} from "@/lib/gst-config";
import type { BookingRow } from "@/types/booking";
import type { GstDocType, GstDocument } from "@/types/gst-document";
import type { Profile } from "@/types/profile";

type BookingOption = Pick<
  BookingRow,
  "id" | "customer_name" | "customer_contact" | "brand" | "sale_price" | "guest_count" | "kids_count" | "kids_price" | "booking_date"
> & { item: { name: string; category: string | null } | null };

const todayInput = () => new Date().toLocaleDateString("en-CA");

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
  const [description, setDescription] = useState("");
  const [hsnSac, setHsnSac] = useState(DEFAULT_HSN_SAC);
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState<number>(DEFAULT_GST_RATE);
  const [inclusive, setInclusive] = useState(true);
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
  const amountNumber = Number(amount);
  const gst = useMemo(
    () =>
      amountNumber > 0
        ? computeGst({ amount: amountNumber, rate, inclusive, intraState: stateCode === sellerStateCode })
        : null,
    [amountNumber, rate, inclusive, stateCode, sellerStateCode],
  );

  function pickBooking(id: string) {
    setBookingId(id);
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    setCustomerName(b.customer_name);
    if (b.brand && (BRAND_NAMES as readonly string[]).includes(b.brand)) setBrand(b.brand);
    // Only item.category is read by the pricing helper, and that is part of what we selected.
    const price = effectiveSalePrice(b as unknown as BookingRow);
    if (price != null) setAmount(String(price));
    setDescription(
      `${b.item?.name ?? "Booking"} on ${new Date(b.booking_date).toLocaleDateString("en-GB")}`,
    );
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
    setDescription(`Credit against ${inv.doc_number}: ${inv.description}`);
    setHsnSac(inv.hsn_sac ?? "");
    setRate(inv.gst_rate);
    setInclusive(false);
    setAmount(String(inv.taxable_value));
    setBookingId(inv.booking_id ?? "");
  }

  async function handleSubmit() {
    if (!customerName.trim() || !description.trim()) {
      toast.error("Enter the customer name and a description");
      return;
    }
    if (!gst) {
      toast.error("Enter a valid amount");
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
        description: description.trim(),
        hsn_sac: hsnSac.trim() || null,
        taxable_value: gst.taxable,
        gst_rate: rate,
        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,
        total: gst.total,
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
    setDescription("");
    setAmount("");
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_9rem]">
            <div className="space-y-2">
              <Label htmlFor="gst-description">Description</Label>
              <Input id="gst-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst-hsn">HSN / SAC</Label>
              <Input id="gst-hsn" value={hsnSac} onChange={(e) => setHsnSac(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="gst-amount">Amount (₹)</Label>
              <Input
                id="gst-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>GST rate</Label>
              <Select value={String(rate)} onValueChange={(v) => v && setRate(Number(v))}>
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
            </div>
            <div className="space-y-2">
              <Label>Amount includes GST?</Label>
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
                <span className="text-muted-foreground">Taxable value</span>
                <span>₹{formatInr(gst.taxable)}</span>
              </div>
              {gst.igst > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGST ({rate}%)</span>
                  <span>₹{formatInr(gst.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CGST ({rate / 2}%)</span>
                    <span>₹{formatInr(gst.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SGST ({rate / 2}%)</span>
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
