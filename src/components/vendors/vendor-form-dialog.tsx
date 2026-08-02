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
import type { VendorRow } from "@/types/vendor";

export function VendorFormDialog({
  vendor,
  onSaved,
}: {
  /** Omit to render an "Add vendor" trigger; pass an existing vendor to edit it. */
  vendor?: VendorRow;
  onSaved: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!vendor;

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    const supabase = createClient();

    const name = formData.get("name") as string;
    const contactEmail = formData.get("contactEmail") as string;
    const contactPhone = (formData.get("contactPhone") as string) || null;
    const ratingRaw = formData.get("rating") as string;
    const rating = ratingRaw ? Number(ratingRaw) : null;

    const payload = { name, contact_email: contactEmail, contact_phone: contactPhone, rating };

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit vendor" : "Add vendor"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this vendor's details." : "Add a new vendor to the directory."}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={vendor?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={vendor?.contact_email}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact phone</Label>
              <Input id="contactPhone" name="contactPhone" defaultValue={vendor?.contact_phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Rating (0-5)</Label>
              <Input
                id="rating"
                name="rating"
                type="number"
                step="0.1"
                min="0"
                max="5"
                defaultValue={vendor?.rating ?? ""}
              />
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
