import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectsClient } from "@/components/projects/projects-client";
import type { Profile } from "@/types/profile";
import type { ProjectRow } from "@/types/project";

export default async function ProjectsPage() {
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

  const canCreateProject = profile.role === "admin" || profile.role === "project_manager";

  const [{ data: projects }, { data: vendors }, { data: regions }] = await Promise.all([
    supabase
      .from("projects")
      .select("*, region:regions(name), vendor:vendors(name)")
      .order("title"),
    canCreateProject
      ? supabase.from("vendors").select("id, name").order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    canCreateProject
      ? supabase.from("regions").select("id, name").order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  return (
    <ProjectsClient
      initialProjects={(projects ?? []) as unknown as ProjectRow[]}
      profile={profile}
      vendors={vendors ?? []}
      regions={regions ?? []}
    />
  );
}
