import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { RegionProvider } from "@/lib/region-context";
import { LayoutDashboard } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { RegionSwitcher } from "@/components/region-switcher";
import { UniversalSearch } from "@/components/universal-search";
import PixelBlast from "@/components/pixel-blast";
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
      <div className="pointer-events-none fixed inset-0 z-0">
        <PixelBlast
          color="#8f8b93"
          pixelSize={4}
          patternScale={3}
          patternDensity={0.6}
          edgeFade={0.6}
          speed={0.35}
          enableRipples={false}
          liquid={false}
          antialias={false}
          transparent
        />
      </div>
      <AppSidebar profile={profile} />
      <div className="flex min-h-svh w-full flex-col pl-14 sm:pl-24">
        <div className="flex shrink-0 items-center gap-2 py-2 pr-2 pl-0 sm:gap-3 sm:p-3">
          <header className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg shadow-black/10 ring-1 ring-black/5 sm:h-14 sm:w-auto sm:justify-start sm:gap-2 sm:px-4">
            <LayoutDashboard className="size-4 shrink-0 text-neutral-400" />
            <span className="hidden text-sm font-semibold whitespace-nowrap sm:inline">GLW India Ops</span>
          </header>

          <div className="flex h-14 min-w-0 flex-1 items-center rounded-full bg-white px-3 shadow-lg shadow-black/10 ring-1 ring-black/5 sm:px-4">
            <UniversalSearch />
          </div>

          <header className="flex h-14 shrink-0 items-center gap-2 rounded-full bg-white px-3 shadow-lg shadow-black/10 ring-1 ring-black/5 sm:gap-3 sm:px-4">
            <RegionSwitcher regions={regions ?? []} canViewAll={canViewAllRegions} />
          </header>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </RegionProvider>
  );
}
