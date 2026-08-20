"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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

type Product = { id: string; name: string; sale_price: number | null };

export function NewBookingDialog({
  vendors,
  regions,
  products,
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
  products: Product[];
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
  const [regionId, setRegionId] = useState<string>("");
  const [productId, setProductId] = useState<string>(initialProductId ?? "");
  const [salePrice, setSalePrice] = useState<string>(() => {
    const product = products.find((p) => p.id === initialProductId);
    return product?.sale_price != null ? String(product.sale_price) : "";
  });

  function handleProductChange(id: string) {
    setProductId(id);
    const product = products.find((p) => p.id === id);
    if (product?.sale_price != null) {
      setSalePrice(String(product.sale_price));
    }
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
    const priceRaw = formData.get("salePrice") as string;
    const advanceRaw = formData.get("advanceAmount") as string;

    const { error } = await supabase.from("bookings").insert({
      customer_name: customerName,
      region_id: regionId,
      assigned_vendor_id: vendorId || null,
      item_id: productId || null,
      sale_price: priceRaw ? Number(priceRaw) : null,
      advance_amount: advanceRaw ? Number(advanceRaw) : null,
      booking_date: new Date(date).toISOString(),
      status: "pending",
    });

    setSubmitting(false);

    if (error) {
      toast.error(`Could not create booking: ${error.message}`);
      return;
    }

    toast.success("Booking created");
    setOpen(false);
    setVendorId("");
    setRegionId("");
    setProductId(initialProductId ?? "");
    const resetProduct = products.find((p) => p.id === initialProductId);
    setSalePrice(resetProduct?.sale_price != null ? String(resetProduct.sale_price) : "");
    await onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger}>{triggerContent}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>
            Create a booking, optionally for a specific product with a sale price.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer name</Label>
            <Input id="customerName" name="customerName" required />
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
              <Label htmlFor="salePrice">Sale price (₹)</Label>
              <Input
                id="salePrice"
                name="salePrice"
                type="number"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="Manually set or overridden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bookingDate">Booking date</Label>
              <Input id="bookingDate" name="bookingDate" type="datetime-local" required />
            </div>
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

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
