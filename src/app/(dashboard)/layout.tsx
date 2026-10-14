import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { RegionProvider } from "@/lib/region-context";
import { AppSidebar } from "@/components/app-sidebar";
import { RegionSwitcher } from "@/components/region-switcher";
import { UniversalSearch } from "@/components/universal-search";
import { PageTransition } from "@/components/motion/page-transition";
import { isPrivileged } from "@/lib/auth/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const cookieStore = await cookies();
  const cookieRegion = cookieStore.get("selected_region_id")?.value;
  const canViewAllRegions = isPrivileged(profile.role) || profile.role === "project_manager";
  const initialRegionId =
    cookieRegion ?? (canViewAllRegions ? "all" : (profile.region_id ?? "all"));

  const { data: regions } = await supabase.from("regions").select("id, name").order("name");

  return (
    <RegionProvider initialRegionId={initialRegionId}>
      <div aria-hidden className="app-gradient pointer-events-none fixed inset-0 -z-10" />
      <AppSidebar profile={profile} />
      <div className="flex min-h-svh w-full flex-col pl-[4.5rem] sm:pl-28">
        <div className="flex shrink-0 items-center gap-2 py-2 pr-2 pl-0 sm:gap-4 sm:p-4">
          <div className="flex h-12 min-w-0 flex-1 items-center rounded-2xl bg-card px-3 sm:max-w-xl sm:px-4">
            <UniversalSearch />
          </div>

          <div className="ml-auto flex h-12 shrink-0 items-center gap-3">
            <RegionSwitcher regions={regions ?? []} canViewAll={canViewAllRegions} />
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-medium">{profile.full_name}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {profile.role.replace("_", " ")}
              </div>
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {profile.full_name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </RegionProvider>
  );
}
