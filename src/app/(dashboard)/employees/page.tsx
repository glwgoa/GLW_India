import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployeesClient } from "@/components/employees/employees-client";
import type { Profile } from "@/types/profile";
import type { EmployeeRow } from "@/types/employee";

export default async function EmployeesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect("/login");

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
