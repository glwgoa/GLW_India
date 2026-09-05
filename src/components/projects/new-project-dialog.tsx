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

export function NewProjectDialog({
  vendors,
  regions,
  employees,
  onAdded,
}: {
  vendors: { id: string; name: string }[];
  regions: { id: string; name: string }[];
  employees: { id: string; full_name: string }[];
  onAdded: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vendorId, setVendorId] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [regionId, setRegionId] = useState<string>("");

  async function handleSubmit(formData: FormData) {
    if (!regionId) {
      toast.error("Select a region");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();

    const title = formData.get("title") as string;
    const budget = formData.get("budget") ? Number(formData.get("budget")) : null;
    const deadline = (formData.get("deadline") as string) || null;

    const { error } = await supabase.from("projects").insert({
      title,
      region_id: regionId,
      assigned_vendor_id: vendorId || null,
      assigned_employee_id: employeeId || null,
      budget,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      status: "active",
    });

    setSubmitting(false);

    if (error) {
      toast.error(`Could not create project: ${error.message}`);
      return;
    }

    toast.success("Project created");
    setOpen(false);
    setVendorId("");
    setEmployeeId("");
    setRegionId("");
    await onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        New project
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Assign a project to a vendor, employee, and region.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? "")}>
              <SelectTrigger>
                <SelectValue>
                  {(value: string) => employees.find((e) => e.id === value)?.full_name ?? "Optional"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (₹)</Label>
              <Input id="budget" name="budget" type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" name="deadline" type="date" />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
