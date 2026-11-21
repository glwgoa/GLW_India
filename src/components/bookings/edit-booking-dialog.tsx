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
  GOA_TRIP_CATEGORY_NAME,
  DUDHSAGAR_SUB_CATEGORY_NAME,
  GOA_TRIP_PICKUP_LOCATIONS,
  SUNSET_CRUISE_CATEGORY_NAME,
  YACHT_ADD_ONS,
  YACHT_CATEGORY_NAME,
  hasKidsPriceFields,
  needsCustomerContact,
} from "@/lib/booking-yacht";
import {
  YACHT_PACKAGES,
  computeYachtB2b,
  packageKey,
  packageLabel,
  parsePackageKey,
} from "@/lib/yacht-packages";
import { BRAND_NAMES } from "@/lib/brands";
import { ADV_PAID_TO_OPTIONS } from "@/lib/booking-display";
import { isPrivileged } from "@/lib/auth/roles";
import type { BookingProduct, BookingRow, BookingStatus, TransportType } from "@/types/booking";
import type { Profile } from "@/types/profile";

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

function toDateOnly(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function EditBookingDialog({
  booking,
  vendors,
  products,
  employees,
  profile,
  onSaved,
}: {
  booking: BookingRow;
  vendors: { id: string; name: string }[];
  products: BookingProduct[];
  /** Only admin/developer can assign which employee made the booking. */
  employees?: { id: string; full_name: string }[];
  profile?: Profile;
  onSaved: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vendorId, setVendorId] = useState(booking.assigned_vendor_id ?? "");
  const [brand, setBrand] = useState(booking.brand ?? "");
  const [employeeId, setEmployeeId] = useState<string>(booking.assigned_employee_id ?? "");
  const [productId, setProductId] = useState(booking.item_id ?? "");
  const [salePrice, setSalePrice] = useState(booking.sale_price != null ? String(booking.sale_price) : "");
  const [kidsPrice, setKidsPrice] = useState(booking.kids_price != null ? String(booking.kids_price) : "");
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [addOns, setAddOns] = useState<string[]>(booking.add_ons ?? []);
  const [transportType, setTransportType] = useState<string>(booking.transport_type ?? "");
  const [advPaidTo, setAdvPaidTo] = useState<string>(booking.adv_paid_to ?? "");
  const [yachtPackage, setYachtPackage] = useState<string>(
    booking.sailing_hours != null
      ? packageKey({ sailing: booking.sailing_hours, anchorage: booking.anchorage_hours ?? 0 })
      : "",
  );
  const [pickupLocation, setPickupLocation] = useState<string>(booking.pickup_location ?? "");

  const selectedProduct = products.find((p) => p.id === productId);
  const isYacht = selectedProduct?.category === YACHT_CATEGORY_NAME;
  const isDinnerCruise = selectedProduct?.category === DINNER_CRUISE_CATEGORY_NAME;
  const isSunsetCruise = selectedProduct?.category === SUNSET_CRUISE_CATEGORY_NAME;
  const isGoaTrip = selectedProduct?.category === GOA_TRIP_CATEGORY_NAME;
  const isPerGuestPricing = isDinnerCruise || isSunsetCruise || isGoaTrip;
  // Dudhsagar trips only take kids below 5yrs — no 5-10yrs count or price.
  const showOlderKids = !(isGoaTrip && selectedProduct?.sub_category === DUDHSAGAR_SUB_CATEGORY_NAME);
  const showKidsPriceFields = hasKidsPriceFields(selectedProduct?.category);
  const showContactNumber = needsCustomerContact(selectedProduct?.category);
  const isPickupDrop = transportType === "pickup_drop";
  const canAssignEmployee = !!profile && isPrivileged(profile.role);

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

  const savedPackage =
    booking.sailing_hours != null
      ? { sailing: booking.sailing_hours, anchorage: booking.anchorage_hours ?? 0 }
      : null;
  // Older bookings with hours outside the 12 presets keep showing as an extra option.
  const packageOptions =
    savedPackage && !YACHT_PACKAGES.some((p) => packageKey(p) === packageKey(savedPackage))
      ? [savedPackage, ...YACHT_PACKAGES]
      : YACHT_PACKAGES;

  function toggleAddOn(addOn: string) {
    setAddOns((prev) => (prev.includes(addOn) ? prev.filter((a) => a !== addOn) : [...prev, addOn]));
  }

  async function handleSubmit(formData: FormData) {
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
    const enquiryDate = (formData.get("enquiryDate") as string) || null;
    const advanceRaw = formData.get("advanceAmount") as string;
    const transactionId = (formData.get("transactionId") as string) || null;
    const agentName = ((formData.get("agentName") as string) || "").trim() || null;
    const agentCommissionRaw = formData.get("agentCommission") as string;
    const gstRateRaw = formData.get("gstRate") as string;
    const gstStatus = (formData.get("gstStatus") as string) || null;
    const agentNumber = ((formData.get("agentNumber") as string) || "").trim() || null;
    const startTime = (formData.get("startTime") as string) || null;
    const endTime = (formData.get("endTime") as string) || null;
    const guestCountRaw = formData.get("guestCount") as string;
    const kidsCountRaw = formData.get("kidsCount") as string;
    const pickupDropPriceRaw = formData.get("pickupDropPrice") as string;
    const pickupDropGuestCountRaw = formData.get("pickupDropGuestCount") as string;

    const pkg = isYacht ? parsePackageKey(yachtPackage) : null;
    let yachtB2b: number | undefined;
    if (isYacht && pkg && startTime) {
      const changed =
        productId !== (booking.item_id ?? "") ||
        startTime !== (booking.start_time ?? "") ||
        pkg.sailing !== booking.sailing_hours ||
        pkg.anchorage !== (booking.anchorage_hours ?? 0);
      if (changed) {
        const result = computeYachtB2b(
          products.find((p) => p.id === productId),
          startTime,
          pkg,
        );
        if ("error" in result) {
          toast.error(result.error);
          setSubmitting(false);
          return;
        }
        yachtB2b = result.b2b;
      }
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        ...(yachtB2b !== undefined ? { b2b_price: yachtB2b } : {}),
        customer_name: customerName,
        customer_contact: showContactNumber ? customerContact : null,
        brand: brand || null,
        assigned_vendor_id: vendorId || null,
        assigned_employee_id: canAssignEmployee ? employeeId || null : booking.assigned_employee_id,
        item_id: productId || null,
        sale_price: priceRaw ? Number(priceRaw) : null,
        kids_price: showKidsPriceFields && showOlderKids && kidsPriceRaw ? Number(kidsPriceRaw) : null,
        kids_below_5_count: showKidsPriceFields && kidsBelow5CountRaw ? Number(kidsBelow5CountRaw) : null,
        advance_amount: advanceRaw ? Number(advanceRaw) : null,
        adv_paid_to: advPaidTo || null,
        transaction_id: transactionId,
        agent_name: agentName,
        agent_number: agentNumber,
        agent_commission: agentCommissionRaw ? Number(agentCommissionRaw) : null,
        gst_rate: gstRateRaw ? Number(gstRateRaw) : null,
        gst_status: gstRateRaw ? gstStatus : null,
        booking_date: new Date(date).toISOString(),
        enquiry_date: enquiryDate,
        status,
        start_time: isYacht ? startTime : null,
        end_time: isYacht ? endTime : null,
        sailing_hours: pkg?.sailing ?? null,
        anchorage_hours: pkg?.anchorage ?? null,
        add_ons: isYacht && addOns.length > 0 ? addOns : null,
        guest_count: guestCountRaw ? Number(guestCountRaw) : null,
        pickup_location: isGoaTrip || (isDinnerCruise && isPickupDrop) ? pickupLocation || null : null,
        kids_count: isPerGuestPricing && showOlderKids && kidsCountRaw ? Number(kidsCountRaw) : null,
        transport_type: isDinnerCruise ? transportType || null : null,
        pickup_drop_price:
          isDinnerCruise && isPickupDrop && pickupDropPriceRaw ? Number(pickupDropPriceRaw) : null,
        pickup_drop_guest_count:
          isDinnerCruise && isPickupDrop && pickupDropGuestCountRaw
            ? Number(pickupDropGuestCountRaw)
            : null,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit booking</DialogTitle>
          <DialogDescription>Update this booking&apos;s details.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            {canAssignEmployee && (
              <div className="space-y-2">
                <Label>Booked by employee</Label>
                <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) =>
                        (employees ?? []).find((e) => e.id === value)?.full_name ?? "Optional"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(employees ?? []).map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            {isPerGuestPricing && showOlderKids && (
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

          {showKidsPriceFields && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {showOlderKids && (
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
              )}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="enquiryDate">Enquiry date</Label>
              <Input
                id="enquiryDate"
                name="enquiryDate"
                type="date"
                defaultValue={booking.enquiry_date ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingDate">Booking date</Label>
              <Input
                id="bookingDate"
                name="bookingDate"
                type="date"
                defaultValue={toDateOnly(booking.booking_date)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <Label>ADV PAID TO</Label>
              <Select value={advPaidTo} onValueChange={(v) => setAdvPaidTo(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>{(value: string) => value || "Select account"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ADV_PAID_TO_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Name</Label>
              <Input id="agentName" name="agentName" placeholder="Optional" defaultValue={booking.agent_name ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agentNumber">Agent Number</Label>
              <Input id="agentNumber" name="agentNumber" type="tel" placeholder="Optional" defaultValue={booking.agent_number ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="agentCommission">Agent Commission (₹)</Label>
              <Input id="agentCommission" name="agentCommission" type="number" min="0" step="any" placeholder="Optional" defaultValue={booking.agent_commission ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstRate">GST</Label>
              <select id="gstRate" name="gstRate" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" defaultValue={String(booking.gst_rate ?? "")}>
                <option value="">No GST</option>
                <option value="5">5%</option>
                <option value="18">18%</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstStatus">GST Status</Label>
              <select id="gstStatus" name="gstStatus" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" defaultValue={booking.gst_status ?? ""}>
                <option value="">—</option>
                <option value="Filed">Filed</option>
                <option value="Not filed">Not filed</option>
              </select>
            </div>
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

          {isYacht && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">Private yacht details</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start time</Label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="time"
                    className="max-w-40"
                    defaultValue={booking.start_time ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End time</Label>
                  <Input id="endTime" name="endTime" type="time" className="max-w-40" defaultValue={booking.end_time ?? ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sailing + Anchorage</Label>
                <Select value={yachtPackage} onValueChange={(v) => setYachtPackage(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) => {
                        const p = parsePackageKey(value);
                        return p ? packageLabel(p) : "Select package";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {packageOptions.map((p) => (
                      <SelectItem key={packageKey(p)} value={packageKey(p)}>
                        {packageLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <Label>Pickup/Drop location</Label>
                    <Select value={pickupLocation} onValueChange={(v) => setPickupLocation(v ?? "")}>
                      <SelectTrigger>
                        <SelectValue>{(value: string) => value || "Select location"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {GOA_TRIP_PICKUP_LOCATIONS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                {isPickupDrop && (
                  <div className="space-y-2">
                    <Label htmlFor="pickupDropGuestCount">Number of guests for pickup/drop</Label>
                    <Input
                      id="pickupDropGuestCount"
                      name="pickupDropGuestCount"
                      type="number"
                      min="0"
                      defaultValue={booking.pickup_drop_guest_count ?? ""}
                      placeholder="Optional"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {isGoaTrip && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">Goa trip details</p>
              <div className="space-y-2">
                <Label>Pickup location</Label>
                <Select value={pickupLocation} onValueChange={(v) => setPickupLocation(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>{(value: string) => value || "Select pickup location"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {GOA_TRIP_PICKUP_LOCATIONS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
