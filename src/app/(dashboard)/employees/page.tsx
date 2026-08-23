import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { EmployeesClient } from "@/components/employees/employees-client";
import type { EmployeeRow } from "@/types/employee";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: employees }, { data: regions }] = await Promise.all([
    supabase.from("profiles").select("*, region:regions(name)").order("full_name"),
    supabase.from("regions").select("id, name").order("name"),
  ]);

  return (
    <EmployeesClient
      initialEmployees={(employees ?? []) as unknown as EmployeeRow[]}
      regions={regions ?? []}
      profile={profile}
    />
  );
}
