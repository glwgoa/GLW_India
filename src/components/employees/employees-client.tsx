"use client";

import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmployeesGrid } from "./employees-grid";
import { AddEmployeeDialog } from "./add-employee-dialog";
import { HyperText } from "@/components/ui/hyper-text";
import type { EmployeeRow } from "@/types/employee";
import type { Profile } from "@/types/profile";

const SELECT = "*, region:regions(name)";

export function EmployeesClient({
  initialEmployees,
  regions,
  profile,
}: {
  initialEmployees: EmployeeRow[];
  regions: { id: string; name: string }[];
  profile: Profile;
}) {
  const [employees, setEmployees] = useState<EmployeeRow[]>(initialEmployees);
  const [refreshing, setRefreshing] = useState(false);
  const canAdd = profile.role === "admin";

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select(SELECT).order("full_name");
    if (data) setEmployees(data as unknown as EmployeeRow[]);
    setRefreshing(false);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <HyperText as="h1" className="text-2xl font-semibold">Employees</HyperText>
          <p className="text-sm text-muted-foreground">
            Everyone can view — only admins can add or edit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          {canAdd && <AddEmployeeDialog regions={regions} onAdded={refresh} />}
        </div>
      </div>
      <EmployeesGrid employees={employees} regions={regions} profile={profile} refresh={refresh} />
    </div>
  );
}
