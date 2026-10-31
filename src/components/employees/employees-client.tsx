"use client";

import { useCallback, useState } from "react";
import { RefreshCw, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmployeesGrid } from "./employees-grid";
import { AddEmployeeDialog } from "./add-employee-dialog";
import { PageHeaderIcon } from "@/components/page-header-icon";
import type { EmployeeRow } from "@/types/employee";
import type { Profile } from "@/types/profile";
import { isPrivileged } from "@/lib/auth/roles";

const SELECT = "*";

export function EmployeesClient({
  initialEmployees,
  profile,
}: {
  initialEmployees: EmployeeRow[];
  profile: Profile;
}) {
  const [employees, setEmployees] = useState<EmployeeRow[]>(initialEmployees);
  const [refreshing, setRefreshing] = useState(false);
  const canAdd = isPrivileged(profile.role);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select(SELECT).order("full_name");
    if (data) setEmployees(data as unknown as EmployeeRow[]);
    setRefreshing(false);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <PageHeaderIcon icon={Users} color="var(--chart-5)" />
          <div>
            <h1 className="text-2xl font-semibold">Employees</h1>
            <p className="text-sm text-muted-foreground">
              Everyone can view — only admins can add, edit or remove.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          {canAdd && (
            <AddEmployeeDialog actorRole={profile.role} onAdded={refresh} />
          )}
        </div>
      </div>
      <EmployeesGrid employees={employees} profile={profile} refresh={refresh} />
    </div>
  );
}
