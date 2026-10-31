"use client";

import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EditEmployeeDialog } from "./edit-employee-dialog";
import type { EmployeeRow } from "@/types/employee";
import type { Profile } from "@/types/profile";
import { isPrivileged } from "@/lib/auth/roles";

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  developer: "destructive",
  admin: "destructive",
  project_manager: "default",
  hr: "secondary",
  employee: "outline",
  accountant: "secondary",
  vendor: "outline",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function EmployeesGrid({
  employees,
  profile,
  refresh,
}: {
  employees: EmployeeRow[];
  profile: Profile;
  refresh: () => void | Promise<void>;
}) {
  const canEdit = isPrivileged(profile.role);
  // Admins can manage everyone except developers — only a developer can edit a developer's profile.
  function canEditRow(employee: EmployeeRow) {
    if (!canEdit) return false;
    if (employee.role === "developer") return profile.role === "developer";
    return true;
  }

  async function removeEmployee(employee: EmployeeRow) {
    if (
      !window.confirm(
        `Remove ${employee.full_name}? They will no longer be able to sign in, and their attendance records will be deleted. Bookings they added or were assigned keep existing but lose the name. This cannot be undone.`,
      )
    ) {
      return;
    }
    const res = await fetch("/api/admin/delete-employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: employee.id }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.error ?? "Could not remove employee");
      return;
    }
    toast.success(`${employee.full_name} removed`);
    await refresh();
  }

  if (employees.length === 0) {
    return <p className="text-sm text-muted-foreground">No employees to show.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {employees.map((employee, index) => (
        <Card
          key={employee.id}
          className="animate-in fade-in-0 zoom-in-95 fill-mode-both duration-500 transition-shadow hover:shadow-md"
          style={{ animationDelay: `${Math.min(index, 16) * 45}ms` }}
        >
          <CardHeader className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs">{initials(employee.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">{employee.full_name}</CardTitle>
                <Badge variant={ROLE_VARIANT[employee.role] ?? "outline"} className="mt-1 capitalize">
                  {employee.role.replace("_", " ")}
                </Badge>
              </div>
            </div>
            {canEditRow(employee) && (
              <div className="flex items-center gap-1">
                <EditEmployeeDialog
                  employee={employee}
                  actorRole={profile.role}
                  onSaved={refresh}
                />
                {employee.id !== profile.id && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${employee.full_name}`}
                    onClick={() => removeEmployee(employee)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
