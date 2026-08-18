"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  regions,
  profile,
  refresh,
}: {
  employees: EmployeeRow[];
  regions: { id: string; name: string }[];
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

  if (employees.length === 0) {
    return <p className="text-sm text-muted-foreground">No employees to show.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {employees.map((employee) => (
        <Card key={employee.id}>
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
              <EditEmployeeDialog
                employee={employee}
                regions={regions}
                actorRole={profile.role}
                onSaved={refresh}
              />
            )}
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {employee.region?.name ?? "No region assigned"}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
