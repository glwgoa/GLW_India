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
import type { UserRole } from "@/types/profile";
import type { EmployeeRow } from "@/types/employee";

const ROLES: UserRole[] = ["employee", "accountant", "developer", "hr", "project_manager", "admin", "vendor"];

export function EditEmployeeDialog({
  employee,
  actorRole,
  onSaved,
}: {
  employee: EmployeeRow;
  actorRole: UserRole;
  onSaved: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<string>(employee.role);
  const availableRoles = actorRole === "developer" ? ROLES : ROLES.filter((r) => r !== "developer");

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.get("fullName") as string,
        role: role as UserRole,
      })
      .eq("id", employee.id);

    setSubmitting(false);

    if (error) {
      toast.error(`Could not update employee: ${error.message}`);
      return;
    }

    toast.success("Employee updated");
    setOpen(false);
    await onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size="icon-sm" variant="outline" aria-label="Edit employee" />}
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit employee</DialogTitle>
          <DialogDescription>Update role or name.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" defaultValue={employee.full_name} required />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v ?? "employee")}>
                <SelectTrigger>
                  <SelectValue className="capitalize">
                    {(value: string) => value.replace("_", " ")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
