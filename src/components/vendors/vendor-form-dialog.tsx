"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, X } from "lucide-react";
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
import type {
  VendorCategoryRow,
  VendorCategorySelection,
  VendorRow,
  VendorSubCategoryRow,
} from "@/types/vendor";

const PRIORITIES = ["primary", "secondary", "tertiary"] as const;
const PAYMENT_TERMS = ["After Every Booking", "Weekly", "Fortnightly", "Monthly"] as const;

type Selection = { categoryId: string; subCategoryId: string | null };

export function VendorFormDialog({
  vendor,
  categories,
  subCategories,
  categorySelections = [],
  onSaved,
}: {
  /** Omit to render an "Add vendor" trigger; pass an existing vendor to edit it. */
  vendor?: VendorRow;
  categories: VendorCategoryRow[];
  subCategories: VendorSubCategoryRow[];
  /** This vendor's current category selections; omit/empty when adding a new vendor. */
  categorySelections?: VendorCategorySelection[];
  onSaved: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [priority, setPriority] = useState<string>(vendor?.priority ?? "");
  const [paymentTerms, setPaymentTerms] = useState<string>(vendor?.payment_terms ?? "");
  const [selections, setSelections] = useState<Selection[]>(() =>
    categorySelections.map((s) => ({ categoryId: s.categoryId, subCategoryId: s.subCategoryId })),
  );
  const [addCategoryId, setAddCategoryId] = useState("");
  const isEdit = !!vendor;
  const availableToAdd = categories.filter((c) => !selections.some((s) => s.categoryId === c.id));

  function addSelection() {
    if (!addCategoryId) return;
    setSelections((prev) => [...prev, { categoryId: addCategoryId, subCategoryId: null }]);
    setAddCategoryId("");
  }

  function removeSelection(categoryId: string) {
    setSelections((prev) => prev.filter((s) => s.categoryId !== categoryId));
  }

  function setSubCategoryFor(categoryId: string, subCategoryId: string) {
    setSelections((prev) =>
      prev.map((s) => (s.categoryId === categoryId ? { ...s, subCategoryId: subCategoryId || null } : s)),
    );
  }

  async function saveSelections(vendorId: string) {
    const supabase = createClient();
    await supabase.from("vendor_category_selections").delete().eq("vendor_id", vendorId);
    if (selections.length === 0) return null;
    const { error } = await supabase.from("vendor_category_selections").insert(
      selections.map((s) => ({
        vendor_id: vendorId,
        category_id: s.categoryId,
        sub_category_id: s.subCategoryId,
      })),
    );
    return error;
  }

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    const supabase = createClient();

    const str = (key: string) => (formData.get(key) as string) || null;

    const payload = {
      name: str("name"),
      contact_email: str("contactEmail"),
      contact_phone: str("contactPhone"),
      additional_contact_number: str("additionalContactNumber"),
      priority: priority || null,
      city: str("city"),
      location: str("location"),
      bank_account_name: str("bankAccountName"),
      bank_account_number: str("bankAccountNumber"),
      ifsc_code: str("ifscCode"),
      upi_id: str("upiId"),
      payment_terms: paymentTerms || null,
    };

    let vendorId: string | null;
    let error: { message: string } | null;

    if (isEdit) {
      vendorId = vendor.id;
      ({ error } = await supabase.from("vendors").update(payload).eq("id", vendor.id));
    } else {
      const result = await supabase.from("vendors").insert(payload).select("id").single();
      vendorId = result.data?.id ?? null;
      error = result.error;
    }

    if (error || !vendorId) {
      setSubmitting(false);
      toast.error(`Could not save vendor: ${error?.message ?? "unknown error"}`);
      return;
    }

    const selectionsError = await saveSelections(vendorId);
    setSubmitting(false);

    if (selectionsError) {
      toast.error(`Vendor saved, but categories failed: ${selectionsError.message}`);
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
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={vendor?.name ?? ""} required />
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="flex items-center gap-2">
                <Select value={addCategoryId} onValueChange={(v) => setAddCategoryId(v ?? "")}>
                  <SelectTrigger className="flex-1">
                    <SelectValue>
                      {(value: string) => categories.find((c) => c.id === value)?.name ?? "Select category"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={addSelection}
                  disabled={!addCategoryId}
                  aria-label="Add category"
                >
                  <Plus />
                </Button>
              </div>

              {selections.length > 0 && (
                <div className="space-y-2">
                  {selections.map((sel) => {
                    const cat = categories.find((c) => c.id === sel.categoryId);
                    const subs = subCategories.filter((s) => s.category_id === sel.categoryId);
                    return (
                      <div key={sel.categoryId} className="flex items-center gap-2 rounded-lg border p-2">
                        <span className="flex-1 truncate text-sm font-medium">{cat?.name}</span>
                        {subs.length > 0 && (
                          <Select
                            value={sel.subCategoryId ?? ""}
                            onValueChange={(v) => setSubCategoryFor(sel.categoryId, v ?? "")}
                          >
                            <SelectTrigger className="h-7 w-36 text-xs">
                              <SelectValue>
                                {(value: string) => subs.find((s) => s.id === value)?.name ?? "Sub-category"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {subs.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeSelection(sel.categoryId)}
                          aria-label={`Remove ${cat?.name}`}
                        >
                          <X />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
