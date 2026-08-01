"use client";

import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "./kanban-board";
import { NewProjectDialog } from "./new-project-dialog";
import type { ProjectRow } from "@/types/project";
import type { Profile } from "@/types/profile";

const SELECT = "*, region:regions(name), vendor:vendors(name)";

export function ProjectsClient({
  initialProjects,
  profile,
  vendors,
  regions,
}: {
  initialProjects: ProjectRow[];
  profile: Profile;
  vendors: { id: string; name: string }[];
  regions: { id: string; name: string }[];
}) {
  const [projects, setProjects] = useState<ProjectRow[]>(initialProjects);
  const [refreshing, setRefreshing] = useState(false);
  const canCreateProject = profile.role === "admin" || profile.role === "project_manager";

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const supabase = createClient();
    const { data } = await supabase.from("projects").select(SELECT).order("title");
    if (data) setProjects(data as unknown as ProjectRow[]);
    setRefreshing(false);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Drag isn&apos;t wired up — move a card by changing its status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          {canCreateProject && (
            <NewProjectDialog vendors={vendors} regions={regions} onAdded={refresh} />
          )}
        </div>
      </div>
      <KanbanBoard projects={projects} setProjects={setProjects} profile={profile} />
    </div>
  );
}
