"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    const supabase = createClient();

    const sku = formData.get("sku") as string;
    const name = formData.get("name") as string;
    const imageFile = formData.get("imageFile") as File | null;
    const b2bPrice = Number(formData.get("b2bPrice"));
    const salePrice = Number(formData.get("salePrice"));

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
        vendor_id: vendorId || null,
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
      <DialogTrigger render={<Button variant="secondary" size="icon-sm" aria-label="Edit product" />}>
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

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
