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

export function NewBookingDialog({
  vendors,
  regions,
  onAdded,
}: {
  vendors: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  onAdded: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vendorId, setVendorId] = useState<string>("");
  const [regionId, setRegionId] = useState<string>("");

  async function handleSubmit(formData: FormData) {
    if (!regionId) {
      toast.error("Select a region");
      return;
    }
    const deadline = formData.get("slaDeadline") as string;
    if (!deadline) {
      toast.error("Set an SLA deadline");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const customerName = formData.get("customerName") as string;

    const { error } = await supabase.from("bookings").insert({
      customer_name: customerName,
      region_id: regionId,
      assigned_vendor_id: vendorId || null,
      sla_deadline: new Date(deadline).toISOString(),
      status: "pending",
      sla_status: "on_track",
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
    await onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        Add booking
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>Create a booking and optionally assign a vendor.</DialogDescription>
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

          <div className="space-y-2">
            <Label htmlFor="slaDeadline">SLA deadline</Label>
            <Input id="slaDeadline" name="slaDeadline" type="datetime-local" required />
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
