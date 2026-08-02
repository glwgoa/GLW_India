import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { RegionProvider } from "@/lib/region-context";
import { AppSidebar } from "@/components/app-sidebar";
import { RegionSwitcher } from "@/components/region-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import type { Profile } from "@/types/profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const cookieRegion = cookieStore.get("selected_region_id")?.value;
  const canViewAllRegions = profile.role === "admin" || profile.role === "project_manager";
  const initialRegionId =
    cookieRegion ?? (canViewAllRegions ? "all" : (profile.region_id ?? "all"));

  const { data: regions } = await supabase.from("regions").select("id, name").order("name");

  return (
    <RegionProvider initialRegionId={initialRegionId}>
      <SidebarProvider>
        <AppSidebar profile={profile} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm font-medium text-muted-foreground">
                GLW India Ops Dashboard
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <RegionSwitcher regions={regions ?? []} canViewAll={canViewAllRegions} />
            </div>
          </header>
          <div className="flex-1 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </RegionProvider>
  );
}
