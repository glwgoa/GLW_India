"use client";

import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_STATUSES } from "@/lib/constants";
import type { ProjectRow } from "@/types/project";
import type { Profile } from "@/types/profile";

const COLUMN_LABEL: Record<string, string> = {
  active: "Active",
  in_progress: "In progress",
  completed: "Completed",
  on_hold: "On hold",
};

function formatDate(value: string | null) {
  if (!value) return "No deadline";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function KanbanBoard({
  projects,
  setProjects,
  profile,
}: {
  projects: ProjectRow[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectRow[]>>;
  profile: Profile;
}) {
  function canModify(project: ProjectRow) {
    if (profile.role === "admin") return true;
    if (profile.role === "project_manager") return project.region_id === profile.region_id;
    return false;
  }

  async function updateStatus(project: ProjectRow, status: string) {
    const supabase = createClient();
    const { error } = await supabase.from("projects").update({ status }).eq("id", project.id);
    if (error) {
      toast.error(`Update failed: ${error.message}`);
      return;
    }
    setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, status } : p)));
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PROJECT_STATUSES.map((status) => {
        const columnProjects = projects.filter((p) => p.status === status);
        return (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold">{COLUMN_LABEL[status]}</h2>
              <span className="text-xs text-muted-foreground">{columnProjects.length}</span>
            </div>
            <div className="space-y-3">
              {columnProjects.map((project) => {
                const editable = canModify(project);
                return (
                  <Card key={project.id}>
                    <CardHeader>
                      <CardTitle className="text-sm">{project.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="text-muted-foreground">{project.region?.name ?? "—"}</p>
                      <p className="text-muted-foreground">
                        {project.vendor?.name ?? "Unassigned"}
                      </p>
                      {project.budget != null && (
                        <p>₹{Number(project.budget).toLocaleString("en-IN")}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatDate(project.deadline)}</p>
                      {editable ? (
                        <Select
                          value={project.status}
                          onValueChange={(value) => value && updateStatus(project, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {COLUMN_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
              {columnProjects.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">No projects</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
