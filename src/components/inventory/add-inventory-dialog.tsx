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
import { needsReportingTime } from "@/lib/booking-yacht";

export function AddInventoryDialog({
  vendors,
  regions,
  categories,
  onAdded,
}: {
  vendors: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  onAdded: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vendorId, setVendorId] = useState<string>("");
  const [regionId, setRegionId] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const showReportingTime = needsReportingTime(category);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    const supabase = createClient();

    const sku = formData.get("sku") as string;
    const name = formData.get("name") as string;
    const imageFile = formData.get("imageFile") as File | null;
    const b2bPrice = Number(formData.get("b2bPrice"));
    const salePrice = Number(formData.get("salePrice"));
    const stockQuantity = Number(formData.get("stockQuantity"));
    const jettyName = (formData.get("jettyName") as string) || null;
    const jettyLocationUrl = (formData.get("jettyLocationUrl") as string) || null;
    const reportingTime = (formData.get("reportingTime") as string) || null;

    if (!vendorId || !regionId) {
      toast.error("Select a vendor and a region");
      setSubmitting(false);
      return;
    }

    let imageUrl: string | null = null;
    if (imageFile && imageFile.size > 0) {
      const extension = imageFile.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${extension}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, imageFile, { contentType: imageFile.type });

        if (uploadError) {
          toast.error(`Image upload failed: ${uploadError.message}`);
          setSubmitting(false);
          return;
        }

        imageUrl = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      } catch (err) {
        toast.error(`Image upload failed: ${err instanceof Error ? err.message : "unknown error"}`);
        setSubmitting(false);
        return;
      }
    }

    const { data: item, error: itemError } = await supabase
      .from("catalog_items")
      .insert({
        sku,
        name,
        category: category || null,
        image_url: imageUrl,
        b2b_price: b2bPrice,
        sale_price: salePrice,
        vendor_id: vendorId,
        jetty_name: jettyName,
        jetty_location_url: jettyLocationUrl,
        reporting_time: showReportingTime ? reportingTime : null,
      })
      .select("id")
      .single();

    if (itemError || !item) {
      toast.error(`Could not add product: ${itemError?.message ?? "unknown error"}`);
      setSubmitting(false);
      return;
    }

    const { error: stockError } = await supabase.from("regional_inventory").insert({
      region_id: regionId,
      item_id: item.id,
      stock_quantity: stockQuantity,
      reserved_quantity: 0,
    });

    setSubmitting(false);

    if (stockError) {
      toast.error(`Product created, but stocking it failed: ${stockError.message}`);
      return;
    }

    toast.success("Product added to inventory");
    setOpen(false);
    setVendorId("");
    setRegionId("");
    await onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        Add inventory
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add product to inventory</DialogTitle>
          <DialogDescription>
            Create a new product with its vendor, pricing, and starting stock in a region.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" required />
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
            <p className="text-xs text-muted-foreground">Uploaded to Supabase Storage.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jettyName">Jetty name</Label>
              <Input id="jettyName" name="jettyName" placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jettyLocationUrl">Jetty location (Google Maps link)</Label>
              <Input id="jettyLocationUrl" name="jettyLocationUrl" type="url" placeholder="Optional" />
            </div>
          </div>

          {showReportingTime && (
            <div className="space-y-2">
              <Label htmlFor="reportingTime">Reporting time</Label>
              <Input id="reportingTime" name="reportingTime" type="time" className="max-w-40" />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="b2bPrice">B2B price</Label>
              <Input id="b2bPrice" name="b2bPrice" type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">Sale price</Label>
              <Input id="salePrice" name="salePrice" type="number" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockQuantity">Initial stock</Label>
              <Input id="stockQuantity" name="stockQuantity" type="number" required />
            </div>
          </div>

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

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? "Adding..." : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
