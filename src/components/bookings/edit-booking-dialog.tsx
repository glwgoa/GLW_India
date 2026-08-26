"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DINNER_CRUISE_CATEGORY_NAME,
  SUNSET_CRUISE_CATEGORY_NAME,
  YACHT_ADD_ONS,
  YACHT_CATEGORY_NAME,
  needsCustomerContact,
} from "@/lib/booking-yacht";
import { BRAND_NAMES } from "@/lib/brands";
import type { BookingProduct, BookingRow, BookingStatus, TransportType } from "@/types/booking";

const TRANSPORT_TYPE_LABEL: Record<TransportType, string> = {
  pickup_drop: "Pickup/Drop",
  direct_jetty: "Direct Jetty",
};

const BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
  "cancelled_refunded",
];
const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  cancelled_refunded: "Cancel/Refunded",
};

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditBookingDialog({
  booking,
  vendors,
  regions,
  products,
  onSaved,
}: {
  booking: BookingRow;
  vendors: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  products: BookingProduct[];
  onSaved: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vendorId, setVendorId] = useState(booking.assigned_vendor_id ?? "");
  const [regionId, setRegionId] = useState(booking.region_id ?? "");
  const [brand, setBrand] = useState(booking.brand ?? "");
  const [productId, setProductId] = useState(booking.item_id ?? "");
  const [salePrice, setSalePrice] = useState(booking.sale_price != null ? String(booking.sale_price) : "");
  const [kidsPrice, setKidsPrice] = useState(booking.kids_price != null ? String(booking.kids_price) : "");
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [addOns, setAddOns] = useState<string[]>(booking.add_ons ?? []);
  const [transportType, setTransportType] = useState<string>(booking.transport_type ?? "");

  const selectedProduct = products.find((p) => p.id === productId);
  const isYacht = selectedProduct?.category === YACHT_CATEGORY_NAME;
  const isDinnerCruise = selectedProduct?.category === DINNER_CRUISE_CATEGORY_NAME;
  const isSunsetCruise = selectedProduct?.category === SUNSET_CRUISE_CATEGORY_NAME;
  const isPerGuestPricing = isDinnerCruise || isSunsetCruise;
  const showContactNumber = needsCustomerContact(selectedProduct?.category);
  const isPickupDrop = transportType === "pickup_drop";

  function handleProductChange(id: string) {
    setProductId(id);
    const product = products.find((p) => p.id === id);
    if (product?.sale_price != null) {
      setSalePrice(String(product.sale_price));
    }
    setKidsPrice(product?.kids_sale_price != null ? String(product.kids_sale_price) : "");
    if (product?.vendor_id) {
      setVendorId(product.vendor_id);
    }
    if (product?.category !== YACHT_CATEGORY_NAME) {
      setAddOns([]);
    }
    if (product?.category !== DINNER_CRUISE_CATEGORY_NAME) {
      setTransportType("");
    }
  }

  function toggleAddOn(addOn: string) {
    setAddOns((prev) => (prev.includes(addOn) ? prev.filter((a) => a !== addOn) : [...prev, addOn]));
  }

  async function handleSubmit(formData: FormData) {
    if (!regionId) {
      toast.error("Select a region");
      return;
    }
    const date = formData.get("bookingDate") as string;
    if (!date) {
      toast.error("Set a booking date");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const customerName = formData.get("customerName") as string;
    const customerContact = (formData.get("customerContact") as string) || null;
    const priceRaw = formData.get("salePrice") as string;
    const kidsPriceRaw = formData.get("kidsPrice") as string;
    const kidsBelow5CountRaw = formData.get("kidsBelow5Count") as string;
    const advanceRaw = formData.get("advanceAmount") as string;
    const transactionId = (formData.get("transactionId") as string) || null;
    const startTime = (formData.get("startTime") as string) || null;
    const endTime = (formData.get("endTime") as string) || null;
    const sailingHoursRaw = formData.get("sailingHours") as string;
    const anchorageHoursRaw = formData.get("anchorageHours") as string;
    const guestCountRaw = formData.get("guestCount") as string;
    const kidsCountRaw = formData.get("kidsCount") as string;
    const pickupDropPriceRaw = formData.get("pickupDropPrice") as string;

    const { error } = await supabase
      .from("bookings")
      .update({
        customer_name: customerName,
        customer_contact: showContactNumber ? customerContact : null,
        region_id: regionId,
        brand: brand || null,
        assigned_vendor_id: vendorId || null,
        item_id: productId || null,
        sale_price: priceRaw ? Number(priceRaw) : null,
        kids_price: isDinnerCruise && kidsPriceRaw ? Number(kidsPriceRaw) : null,
        kids_below_5_count: isDinnerCruise && kidsBelow5CountRaw ? Number(kidsBelow5CountRaw) : null,
        advance_amount: advanceRaw ? Number(advanceRaw) : null,
        transaction_id: transactionId,
        booking_date: new Date(date).toISOString(),
        status,
        start_time: isYacht ? startTime : null,
        end_time: isYacht ? endTime : null,
        sailing_hours: isYacht && sailingHoursRaw ? Number(sailingHoursRaw) : null,
        anchorage_hours: isYacht && anchorageHoursRaw ? Number(anchorageHoursRaw) : null,
        add_ons: isYacht && addOns.length > 0 ? addOns : null,
        guest_count: guestCountRaw ? Number(guestCountRaw) : null,
        kids_count: isPerGuestPricing && kidsCountRaw ? Number(kidsCountRaw) : null,
        transport_type: isDinnerCruise ? transportType || null : null,
        pickup_drop_price:
          isDinnerCruise && isPickupDrop && pickupDropPriceRaw ? Number(pickupDropPriceRaw) : null,
      })
      .eq("id", booking.id);

    setSubmitting(false);

    if (error) {
      toast.error(`Could not update booking: ${error.message}`);
      return;
    }

    toast.success("Booking updated");
    setOpen(false);
    await onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit booking" />}>
        <Pencil />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit booking</DialogTitle>
          <DialogDescription>Update this booking&apos;s details.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer name</Label>
              <Input id="customerName" name="customerName" defaultValue={booking.customer_name} required />
            </div>
            {showContactNumber && (
              <div className="space-y-2">
                <Label htmlFor="customerContact">Customer contact number</Label>
                <Input
                  id="customerContact"
                  name="customerContact"
                  type="tel"
                  defaultValue={booking.customer_contact ?? ""}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={regionId} onValueChange={(v) => setRegionId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>
                    {(value: string) => regions.find((r) => r.id === value)?.name ?? "Select region"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={(v) => setVendorId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>
                    {(value: string) => vendors.find((v) => v.id === value)?.name ?? "Optional"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select value={brand} onValueChange={(v) => setBrand(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>{(value: string) => value || "Select brand"}</SelectValue>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={(v) => handleProductChange(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>
                    {(value: string) => products.find((p) => p.id === value)?.name ?? "Optional"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">{isPerGuestPricing ? "Sale price per guest (₹)" : "Sale price (₹)"}</Label>
              <Input
                id="salePrice"
                name="salePrice"
                type="number"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="Manually set or overridden"
              />
              {isPerGuestPricing && (
                <p className="text-xs text-muted-foreground">Multiplied by number of guests below.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bookingDate">Booking date</Label>
              <Input
                id="bookingDate"
                name="bookingDate"
                type="datetime-local"
                defaultValue={toDatetimeLocal(booking.booking_date)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="advanceAmount">Advance (₹)</Label>
              <Input
                id="advanceAmount"
                name="advanceAmount"
                type="number"
                step="0.01"
                defaultValue={booking.advance_amount ?? ""}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionId">Transaction ID</Label>
            <Input
              id="transactionId"
              name="transactionId"
              defaultValue={booking.transaction_id ?? ""}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as BookingStatus)}>
              <SelectTrigger>
                <SelectValue>{(value: string) => BOOKING_STATUS_LABEL[value as BookingStatus]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BOOKING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {BOOKING_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guestCount">Number of guests</Label>
              <Input
                id="guestCount"
                name="guestCount"
                type="number"
                min="0"
                className="max-w-40"
                defaultValue={booking.guest_count ?? ""}
              />
            </div>
            {isPerGuestPricing && (
              <div className="space-y-2">
                <Label htmlFor="kidsCount">Number of kids (5-10 yrs)</Label>
                <Input
                  id="kidsCount"
                  name="kidsCount"
                  type="number"
                  min="0"
                  className="max-w-40"
                  defaultValue={booking.kids_count ?? ""}
                />
              </div>
            )}
          </div>

          {isDinnerCruise && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kidsPrice">Kids price (5yrs to 10yrs) (₹)</Label>
                <Input
                  id="kidsPrice"
                  name="kidsPrice"
                  type="number"
                  step="0.01"
                  value={kidsPrice}
                  onChange={(e) => setKidsPrice(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kidsBelow5Count">Kids Below 5yrs</Label>
                <Input
                  id="kidsBelow5Count"
                  name="kidsBelow5Count"
                  type="number"
                  min="0"
                  defaultValue={booking.kids_below_5_count ?? ""}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          {isYacht && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">Private yacht details</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start time</Label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="time"
                    defaultValue={booking.start_time ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End time</Label>
                  <Input id="endTime" name="endTime" type="time" defaultValue={booking.end_time ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sailingHours">Sailing (hours)</Label>
                  <Input
                    id="sailingHours"
                    name="sailingHours"
                    type="number"
                    step="0.5"
                    min="0"
                    defaultValue={booking.sailing_hours ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anchorageHours">Anchorage (hours)</Label>
                  <Input
                    id="anchorageHours"
                    name="anchorageHours"
                    type="number"
                    step="0.5"
                    min="0"
                    defaultValue={booking.anchorage_hours ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Add-ons</Label>
                <div className="flex flex-wrap gap-2">
                  {YACHT_ADD_ONS.map((addOn) => (
                    <Button
                      key={addOn}
                      type="button"
                      size="sm"
                      variant={addOns.includes(addOn) ? "default" : "outline"}
                      onClick={() => toggleAddOn(addOn)}
                    >
                      {addOn}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isDinnerCruise && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">Dinner cruise details</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Transport</Label>
                  <Select value={transportType} onValueChange={(v) => setTransportType(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue>
                        {(value: string) => TRANSPORT_TYPE_LABEL[value as TransportType] ?? "Select transport"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TRANSPORT_TYPE_LABEL) as TransportType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {TRANSPORT_TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isPickupDrop && (
                  <div className="space-y-2">
                    <Label htmlFor="pickupDropPrice">Pickup/Drop price per guest (₹)</Label>
                    <Input
                      id="pickupDropPrice"
                      name="pickupDropPrice"
                      type="number"
                      step="0.01"
                      defaultValue={booking.pickup_drop_price ?? ""}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
