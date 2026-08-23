import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { ProjectsClient } from "@/components/projects/projects-client";
import type { ProjectRow } from "@/types/project";
import { isPrivileged } from "@/lib/auth/roles";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const canCreateProject = isPrivileged(profile.role) || profile.role === "project_manager";

  const [{ data: projects }, { data: vendors }, { data: regions }, { data: employees }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("*, region:regions(name), vendor:vendors(name), employee:profiles!projects_assigned_employee_id_fkey(full_name)")
        .order("title"),
      canCreateProject
        ? supabase.from("vendors").select("id, name").order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      canCreateProject
        ? supabase.from("regions").select("id, name").order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      canCreateProject
        ? supabase.from("profiles").select("id, full_name").order("full_name")
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    ]);

  return (
    <ProjectsClient
      initialProjects={(projects ?? []) as unknown as ProjectRow[]}
      profile={profile}
      vendors={(vendors ?? []).map((v) => ({ ...v, name: v.name ?? "Unnamed vendor" }))}
      regions={regions ?? []}
      employees={employees ?? []}
    />
  );
}
