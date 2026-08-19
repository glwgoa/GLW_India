"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
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
import type { VendorCategoryRow, VendorRow, VendorSubCategoryRow } from "@/types/vendor";

const PRIORITIES = ["primary", "secondary", "tertiary"] as const;
const PAYMENT_TERMS = ["After Every Booking", "Weekly", "Fortnightly", "Monthly"] as const;

export function VendorFormDialog({
  vendor,
  categories,
  subCategories,
  onSaved,
}: {
  /** Omit to render an "Add vendor" trigger; pass an existing vendor to edit it. */
  vendor?: VendorRow;
  categories: VendorCategoryRow[];
  subCategories: VendorSubCategoryRow[];
  onSaved: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [priority, setPriority] = useState<string>(vendor?.priority ?? "");
  const [paymentTerms, setPaymentTerms] = useState<string>(vendor?.payment_terms ?? "");
  const [category, setCategory] = useState<string>(vendor?.category ?? "");
  const [subCategory, setSubCategory] = useState<string>(vendor?.sub_category ?? "");
  const isEdit = !!vendor;
  const selectedCategoryId = categories.find((c) => c.name === category)?.id;
  const subCategoryOptions = subCategories.filter((s) => s.category_id === selectedCategoryId);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    const supabase = createClient();

    const str = (key: string) => (formData.get(key) as string) || null;

    const payload = {
      name: str("name"),
      contact_email: str("contactEmail"),
      contact_phone: str("contactPhone"),
      additional_contact_number: str("additionalContactNumber"),
      category: category || null,
      sub_category: (subCategoryOptions.length > 0 ? subCategory : "") || null,
      priority: priority || null,
      city: str("city"),
      location: str("location"),
      bank_account_name: str("bankAccountName"),
      bank_account_number: str("bankAccountNumber"),
      ifsc_code: str("ifscCode"),
      upi_id: str("upiId"),
      payment_terms: paymentTerms || null,
    };

    const { error } = isEdit
      ? await supabase.from("vendors").update(payload).eq("id", vendor.id)
      : await supabase.from("vendors").insert(payload);

    setSubmitting(false);

    if (error) {
      toast.error(`Could not save vendor: ${error.message}`);
      return;
    }

    toast.success(isEdit ? "Vendor updated" : "Vendor added");
    setOpen(false);
    await onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size={isEdit ? "icon-sm" : "sm"}
            variant={isEdit ? "outline" : "default"}
            aria-label={isEdit ? "Edit vendor" : undefined}
          />
        }
      >
        {isEdit ? (
          <Pencil />
        ) : (
          <>
            <Plus />
            Add vendor
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit vendor" : "Add vendor"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this vendor's details." : "Add a new vendor to the directory."}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={vendor?.name ?? ""} required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    const next = v ?? "";
                    setCategory(next);
                    const nextId = categories.find((c) => c.name === next)?.id;
                    if (!subCategories.some((s) => s.category_id === nextId)) setSubCategory("");
                  }}
                >
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
            </div>

            {subCategoryOptions.length > 0 && (
              <div className="space-y-2">
                <Label>Sub-category</Label>
                <Select value={subCategory} onValueChange={(v) => setSubCategory(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>{(value: string) => value || "Select sub-category"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {subCategoryOptions.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email ID</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={vendor?.contact_email ?? ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact number</Label>
                <Input id="contactPhone" name="contactPhone" defaultValue={vendor?.contact_phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="additionalContactNumber">Additional contact number</Label>
                <Input
                  id="additionalContactNumber"
                  name="additionalContactNumber"
                  defaultValue={vendor?.additional_contact_number ?? ""}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Vendor priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) =>
                        PRIORITIES.includes(value as (typeof PRIORITIES)[number])
                          ? value[0].toUpperCase() + value.slice(1)
                          : "Select priority"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={vendor?.city ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" defaultValue={vendor?.location ?? ""} />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">Payment details</p>
            <div className="space-y-2">
              <Label htmlFor="bankAccountName">Account name</Label>
              <Input
                id="bankAccountName"
                name="bankAccountName"
                defaultValue={vendor?.bank_account_name ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Bank account number</Label>
                <Input
                  id="bankAccountNumber"
                  name="bankAccountNumber"
                  defaultValue={vendor?.bank_account_number ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC code</Label>
                <Input id="ifscCode" name="ifscCode" defaultValue={vendor?.ifsc_code ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="upiId">UPI ID</Label>
                <Input id="upiId" name="upiId" defaultValue={vendor?.upi_id ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Payment terms</Label>
                <Select value={paymentTerms} onValueChange={(v) => setPaymentTerms(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue>{(value: string) => value || "Select terms"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add vendor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
