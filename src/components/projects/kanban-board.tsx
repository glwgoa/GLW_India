"use client";

import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_STATUSES } from "@/lib/constants";
import { HyperText } from "@/components/ui/hyper-text";
import type { ProjectRow } from "@/types/project";
import type { Profile } from "@/types/profile";
import type { TablesUpdate } from "@/types/supabase";

type ProjectUpdate = TablesUpdate<"projects">;

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

function toDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function KanbanBoard({
  projects,
  setProjects,
  profile,
  employees,
}: {
  projects: ProjectRow[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectRow[]>>;
  profile: Profile;
  employees: { id: string; full_name: string }[];
}) {
  function canModify(project: ProjectRow) {
    if (profile.role === "admin") return true;
    if (profile.role === "project_manager") return project.region_id === profile.region_id;
    return false;
  }

  const canDelete = profile.role === "admin";

  async function updateProject(project: ProjectRow, patch: ProjectUpdate) {
    const supabase = createClient();
    const { error } = await supabase.from("projects").update(patch).eq("id", project.id);
    if (error) {
      toast.error(`Update failed: ${error.message}`);
      return;
    }
    setProjects((prev) =>
      prev.map((p) => (p.id === project.id ? ({ ...p, ...patch } as ProjectRow) : p)),
    );
  }

  async function deleteProject(project: ProjectRow) {
    if (!window.confirm(`Delete project "${project.title}"? This cannot be undone.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) {
      toast.error(`Delete failed: ${error.message}`);
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    toast.success("Project deleted");
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PROJECT_STATUSES.map((status) => {
        const columnProjects = projects.filter((p) => p.status === status);
        return (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <HyperText as="h2" className="overflow-visible py-0 text-sm font-semibold">
                {COLUMN_LABEL[status]}
              </HyperText>
              <span className="text-xs text-muted-foreground">{columnProjects.length}</span>
            </div>
            <div className="space-y-3">
              {columnProjects.map((project) => {
                const editable = canModify(project);
                return (
                  <Card key={project.id}>
                    <CardHeader className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm">{project.title}</CardTitle>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete project"
                          onClick={() => deleteProject(project)}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="text-muted-foreground">{project.region?.name ?? "—"}</p>
                      <p className="text-muted-foreground">
                        {project.vendor?.name ?? "Unassigned vendor"}
                      </p>
                      {project.budget != null && (
                        <p>₹{Number(project.budget).toLocaleString("en-IN")}</p>
                      )}

                      {editable ? (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Employee</Label>
                          <Select
                            value={project.assigned_employee_id ?? "unassigned"}
                            onValueChange={(value) =>
                              updateProject(project, {
                                assigned_employee_id: value === "unassigned" ? null : value,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {(value: string) =>
                                  value === "unassigned"
                                    ? "Unassigned"
                                    : (employees.find((e) => e.id === value)?.full_name ?? "Unassigned")
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {employees.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          {project.employee?.full_name ?? "Unassigned employee"}
                        </p>
                      )}

                      {editable ? (
                        <div className="space-y-1">
                          <Label htmlFor={`deadline-${project.id}`} className="text-xs text-muted-foreground">
                            Deadline
                          </Label>
                          <Input
                            id={`deadline-${project.id}`}
                            type="date"
                            defaultValue={toDateInputValue(project.deadline)}
                            onBlur={(e) => {
                              const value = e.target.value;
                              const iso = value ? new Date(value).toISOString() : null;
                              if (iso !== project.deadline) {
                                updateProject(project, { deadline: iso });
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{formatDate(project.deadline)}</p>
                      )}

                      {editable ? (
                        <Select
                          value={project.status}
                          onValueChange={(value) =>
                            value && updateProject(project, { status: value })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>{(value: string) => COLUMN_LABEL[value] ?? value}</SelectValue>
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
