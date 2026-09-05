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
import { needsKidsPricing, needsReportingTime } from "@/lib/booking-yacht";
import type { InventoryRow } from "@/hooks/use-realtime-inventory";

export function EditProductDialog({
  itemId,
  item,
  vendors,
  categories,
  onSaved,
}: {
  itemId: string;
  item: NonNullable<InventoryRow["item"]>;
  vendors: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  onSaved: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vendorId, setVendorId] = useState<string>(item.vendor_id ?? "");
  const [category, setCategory] = useState<string>(item.category ?? "");
  const showReportingTime = needsReportingTime(category);
  const showKidsPricing = needsKidsPricing(category);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    const supabase = createClient();

    const sku = formData.get("sku") as string;
    const name = formData.get("name") as string;
    const imageFile = formData.get("imageFile") as File | null;
    const b2bPrice = Number(formData.get("b2bPrice"));
    const salePrice = Number(formData.get("salePrice"));
    const kidsB2bPriceRaw = formData.get("kidsB2bPrice") as string;
    const kidsSalePriceRaw = formData.get("kidsSalePrice") as string;
    const jettyName = (formData.get("jettyName") as string) || null;
    const jettyLocationUrl = (formData.get("jettyLocationUrl") as string) || null;
    const reportingTime = (formData.get("reportingTime") as string) || null;
    const coordinatorName = (formData.get("coordinatorName") as string) || null;
    const coordinatorPhone = (formData.get("coordinatorPhone") as string) || null;

    let imageUrl = item.image_url;
    if (imageFile && imageFile.size > 0) {
      const extension = imageFile.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, imageFile, { contentType: imageFile.type });

      if (uploadError) {
        toast.error(`Image upload failed: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }

      imageUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase
      .from("catalog_items")
      .update({
        sku,
        name,
        category: category || null,
        image_url: imageUrl,
        b2b_price: b2bPrice,
        sale_price: salePrice,
        kids_b2b_price: showKidsPricing && kidsB2bPriceRaw ? Number(kidsB2bPriceRaw) : null,
        kids_sale_price: showKidsPricing && kidsSalePriceRaw ? Number(kidsSalePriceRaw) : null,
        vendor_id: vendorId || null,
        jetty_name: jettyName,
        jetty_location_url: jettyLocationUrl,
        reporting_time: showReportingTime ? reportingTime : null,
        coordinator_name: coordinatorName,
        coordinator_phone: coordinatorPhone,
      })
      .eq("id", itemId);

    setSubmitting(false);

    if (error) {
      toast.error(`Could not update product: ${error.message}`);
      return;
    }

    toast.success("Product updated");
    setOpen(false);
    await onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Edit product"
            className="border border-white/30 bg-white/20 text-white backdrop-blur-md hover:bg-white/30"
          />
        }
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>Update this product&apos;s details, pricing, and vendor.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product name</Label>
              <Input id="name" name="name" defaultValue={item.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" defaultValue={item.sku} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
                <SelectTrigger>
                  <SelectValue>{(value: string) => value || "Select category"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
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
                    {(value: string) => vendors.find((v) => v.id === value)?.name ?? "Select vendor"}
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

          <div className="space-y-2">
            <Label htmlFor="imageFile">Product image</Label>
            <Input id="imageFile" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" />
            <p className="text-xs text-muted-foreground">Leave empty to keep the current image.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jettyName">Jetty name</Label>
              <Input id="jettyName" name="jettyName" defaultValue={item.jetty_name ?? ""} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jettyLocationUrl">Jetty location (Google Maps link)</Label>
              <Input
                id="jettyLocationUrl"
                name="jettyLocationUrl"
                type="url"
                defaultValue={item.jetty_location_url ?? ""}
                placeholder="Optional"
              />
            </div>
          </div>

          {showReportingTime && (
            <div className="space-y-2">
              <Label htmlFor="reportingTime">Reporting time</Label>
              <Input
                id="reportingTime"
                name="reportingTime"
                type="time"
                className="max-w-40"
                defaultValue={item.reporting_time ?? ""}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coordinatorName">Coordinator name</Label>
              <Input
                id="coordinatorName"
                name="coordinatorName"
                defaultValue={item.coordinator_name ?? ""}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coordinatorPhone">Coordinator number</Label>
              <Input
                id="coordinatorPhone"
                name="coordinatorPhone"
                type="tel"
                defaultValue={item.coordinator_phone ?? ""}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="b2bPrice">B2B price</Label>
              <Input
                id="b2bPrice"
                name="b2bPrice"
                type="number"
                step="0.01"
                defaultValue={item.b2b_price ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">Sale price</Label>
              <Input
                id="salePrice"
                name="salePrice"
                type="number"
                step="0.01"
                defaultValue={item.sale_price ?? ""}
                required
              />
            </div>
          </div>

          {showKidsPricing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kidsB2bPrice">Kids (5 yrs - 10 yrs) B2B price</Label>
                <Input
                  id="kidsB2bPrice"
                  name="kidsB2bPrice"
                  type="number"
                  step="0.01"
                  defaultValue={item.kids_b2b_price ?? ""}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kidsSalePrice">Kids (5 yrs - 10 yrs) sale price</Label>
                <Input
                  id="kidsSalePrice"
                  name="kidsSalePrice"
                  type="number"
                  step="0.01"
                  defaultValue={item.kids_sale_price ?? ""}
                  placeholder="Optional"
                />
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
