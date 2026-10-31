import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { EmployeesClient } from "@/components/employees/employees-client";
import type { EmployeeRow } from "@/types/employee";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: employees } = await supabase.from("profiles").select("*").order("full_name");

  return (
    <EmployeesClient
      initialEmployees={(employees ?? []) as unknown as EmployeeRow[]}
      profile={profile}
    />
  );
}
