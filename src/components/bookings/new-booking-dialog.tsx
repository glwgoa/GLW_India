"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
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
  BOOKING_CATEGORIES,
  DINNER_CRUISE_CATEGORY_NAME,
  SUNSET_CRUISE_CATEGORY_NAME,
  YACHT_ADD_ONS,
  YACHT_CATEGORY_NAME,
  needsCustomerContact,
} from "@/lib/booking-yacht";
import { BRAND_NAMES } from "@/lib/brands";
import { isPrivileged } from "@/lib/auth/roles";
import { deriveRegionId } from "@/lib/booking-region";
import type { BookingProduct, TransportType } from "@/types/booking";
import type { Profile } from "@/types/profile";

const TRANSPORT_TYPE_LABEL: Record<TransportType, string> = {
  pickup_drop: "Pickup/Drop",
  direct_jetty: "Direct Jetty",
};

export function NewBookingDialog({
  vendors,
  regions,
  products,
  employees,
  profile,
  initialProductId,
  trigger = <Button size="sm" />,
  triggerContent = (
    <>
      <Plus />
      Add booking
    </>
  ),
  onAdded,
}: {
  vendors: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  products: BookingProduct[];
  /** Only admin/developer can assign which employee made the booking. */
  employees?: { id: string; full_name: string }[];
  profile?: Profile;
  /** Pre-select a product (and its sale price) when the dialog opens. */
  initialProductId?: string;
  /** Custom trigger element; defaults to a small "Add booking" button. */
  trigger?: React.ReactElement;
  triggerContent?: React.ReactNode;
  onAdded: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vendorId, setVendorId] = useState<string>("");
  const [regionId, setRegionId] = useState<string>(() =>
    deriveRegionId(
      products.find((p) => p.id === initialProductId),
      profile?.region_id ?? null,
    ),
  );
  const [brand, setBrand] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [category, setCategory] = useState<string>(() => {
    const product = products.find((p) => p.id === initialProductId);
    return product?.category ?? "";
  });
  const [productId, setProductId] = useState<string>(initialProductId ?? "");
  const [salePrice, setSalePrice] = useState<string>(() => {
    const product = products.find((p) => p.id === initialProductId);
    return product?.sale_price != null ? String(product.sale_price) : "";
  });
  const [kidsPrice, setKidsPrice] = useState<string>(() => {
    const product = products.find((p) => p.id === initialProductId);
    return product?.kids_sale_price != null ? String(product.kids_sale_price) : "";
  });
  const [addOns, setAddOns] = useState<string[]>([]);
  const [transportType, setTransportType] = useState<string>("");

  const filteredProducts = category ? products.filter((p) => p.category === category) : products;
  const isYacht = category === YACHT_CATEGORY_NAME;
  const isDinnerCruise = category === DINNER_CRUISE_CATEGORY_NAME;
  const isSunsetCruise = category === SUNSET_CRUISE_CATEGORY_NAME;
  const isPerGuestPricing = isDinnerCruise || isSunsetCruise;
  const showContactNumber = needsCustomerContact(category);
  const isPickupDrop = transportType === "pickup_drop";
  const canAssignEmployee = !!profile && isPrivileged(profile.role);

  function handleCategoryChange(value: string) {
    setCategory(value);
    setProductId("");
    setSalePrice("");
    setKidsPrice("");
    setAddOns([]);
    setTransportType("");
    setRegionId(deriveRegionId(undefined, profile?.region_id ?? null));
  }

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
    setRegionId(deriveRegionId(product, profile?.region_id ?? null));
  }

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
    const startTime = (formData.get("startTime") as string) || null;
    const endTime = (formData.get("endTime") as string) || null;
    const sailingHoursRaw = formData.get("sailingHours") as string;
    const anchorageHoursRaw = formData.get("anchorageHours") as string;
    const guestCountRaw = formData.get("guestCount") as string;
    const kidsCountRaw = formData.get("kidsCount") as string;
    const pickupDropPriceRaw = formData.get("pickupDropPrice") as string;
    const pickupDropGuestCountRaw = formData.get("pickupDropGuestCount") as string;

    const { error } = await supabase.from("bookings").insert({
      customer_name: customerName,
      customer_contact: showContactNumber ? customerContact : null,
      region_id: regionId || null,
      brand: brand || null,
      assigned_vendor_id: vendorId || null,
      assigned_employee_id:
        canAssignEmployee && employeeId
          ? employeeId
          : profile?.role === "employee"
            ? profile.id
            : null,
      created_by: profile?.id ?? null,
      item_id: productId || null,
      sale_price: priceRaw ? Number(priceRaw) : null,
      kids_price: isDinnerCruise && kidsPriceRaw ? Number(kidsPriceRaw) : null,
      kids_below_5_count: isDinnerCruise && kidsBelow5CountRaw ? Number(kidsBelow5CountRaw) : null,
      advance_amount: advanceRaw ? Number(advanceRaw) : null,
      transaction_id: transactionId,
      booking_date: new Date(date).toISOString(),
      enquiry_date: enquiryDate,
      status: "pending",
      guest_count: guestCountRaw ? Number(guestCountRaw) : null,
      kids_count: isPerGuestPricing && kidsCountRaw ? Number(kidsCountRaw) : null,
      ...(isYacht
        ? {
            start_time: startTime,
            end_time: endTime,
            sailing_hours: sailingHoursRaw ? Number(sailingHoursRaw) : null,
            anchorage_hours: anchorageHoursRaw ? Number(anchorageHoursRaw) : null,
            add_ons: addOns.length > 0 ? addOns : null,
          }
        : {}),
      ...(isDinnerCruise
        ? {
            transport_type: transportType || null,
            pickup_drop_price: isPickupDrop && pickupDropPriceRaw ? Number(pickupDropPriceRaw) : null,
            pickup_drop_guest_count:
              isPickupDrop && pickupDropGuestCountRaw ? Number(pickupDropGuestCountRaw) : null,
          }
        : {}),
    });

    setSubmitting(false);

    if (error) {
      toast.error(`Could not create booking: ${error.message}`);
      return;
    }

    toast.success("Booking created");
    setOpen(false);
    setVendorId("");
    setBrand("");
    setEmployeeId("");
    setProductId(initialProductId ?? "");
    const resetProduct = products.find((p) => p.id === initialProductId);
    setCategory(resetProduct?.category ?? "");
    setSalePrice(resetProduct?.sale_price != null ? String(resetProduct.sale_price) : "");
    setKidsPrice(resetProduct?.kids_sale_price != null ? String(resetProduct.kids_sale_price) : "");
    setRegionId(deriveRegionId(resetProduct, profile?.region_id ?? null));
    setAddOns([]);
    setTransportType("");
    await onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger}>{triggerContent}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>
            Create a booking, optionally for a specific product with a sale price.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer name</Label>
              <Input id="customerName" name="customerName" required />
            </div>
            {showContactNumber && (
              <div className="space-y-2">
                <Label htmlFor="customerContact">Customer contact number</Label>
                <Input id="customerContact" name="customerContact" type="tel" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => handleCategoryChange(v ?? "")}>
              <SelectTrigger>
                <SelectValue>{(value: string) => value || "Select category"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BOOKING_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Region</Label>
              <p className="flex h-8 items-center rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">
                {regions.find((r) => r.id === regionId)?.name ?? "Determined from product"}
              </p>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={(v) => handleProductChange(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>
                    {(value: string) => filteredProducts.find((p) => p.id === value)?.name ?? "Optional"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.map((p) => (
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
              <Label htmlFor="guestCount">Number of guests</Label>
              <Input id="guestCount" name="guestCount" type="number" min="0" className="max-w-40" />
            </div>
            {isPerGuestPricing && (
              <div className="space-y-2">
                <Label htmlFor="kidsCount">Number of kids (5-10 yrs)</Label>
                <Input id="kidsCount" name="kidsCount" type="number" min="0" className="max-w-40" />
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
                <Input id="kidsBelow5Count" name="kidsBelow5Count" type="number" min="0" placeholder="Optional" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="enquiryDate">Enquiry date</Label>
              <Input id="enquiryDate" name="enquiryDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingDate">Booking date</Label>
              <Input id="bookingDate" name="bookingDate" type="date" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="advanceAmount">Advance (₹)</Label>
              <Input
                id="advanceAmount"
                name="advanceAmount"
                type="number"
                step="0.01"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionId">Transaction ID</Label>
            <Input id="transactionId" name="transactionId" placeholder="Optional" />
          </div>

          {isYacht && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">Private yacht details</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start time</Label>
                  <Input id="startTime" name="startTime" type="time" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End time</Label>
                  <Input id="endTime" name="endTime" type="time" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sailingHours">Sailing (hours)</Label>
                  <Input id="sailingHours" name="sailingHours" type="number" step="0.5" min="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anchorageHours">Anchorage (hours)</Label>
                  <Input id="anchorageHours" name="anchorageHours" type="number" step="0.5" min="0" />
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
                    <Input id="pickupDropPrice" name="pickupDropPrice" type="number" step="0.01" />
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
                      placeholder="Optional"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? "Creating..." : "Create booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
