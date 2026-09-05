import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { RegionProvider } from "@/lib/region-context";
import { AppSidebar } from "@/components/app-sidebar";
import { RegionSwitcher } from "@/components/region-switcher";
import { UniversalSearch } from "@/components/universal-search";
import PixelBlast from "@/components/pixel-blast";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
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
      <SidebarProvider defaultOpen={false}>
        <AppSidebar profile={profile} />
        <SidebarInset className="bg-transparent">
          <div className="flex shrink-0 items-center gap-3 p-3 pb-0">
            <header className="flex h-14 shrink-0 items-center gap-2 rounded-full border border-white/15 bg-background/55 px-4 shadow-lg shadow-black/[0.04] backdrop-blur-2xl dark:shadow-black/30">
              <SidebarTrigger className="rounded-full" />
              <Separator orientation="vertical" className="h-4" />
              <span className="hidden text-sm font-medium text-muted-foreground whitespace-nowrap sm:inline">
                GLW India Ops
              </span>
            </header>

            <div className="flex h-14 min-w-0 flex-1 items-center rounded-full border border-white/15 bg-background/55 px-4 shadow-lg shadow-black/[0.04] backdrop-blur-2xl dark:shadow-black/30">
              <UniversalSearch />
            </div>

            <header className="flex h-14 shrink-0 items-center gap-3 rounded-full border border-white/15 bg-background/55 px-4 shadow-lg shadow-black/[0.04] backdrop-blur-2xl dark:shadow-black/30">
              <RegionSwitcher regions={regions ?? []} canViewAll={canViewAllRegions} />
            </header>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <PageTransition>{children}</PageTransition>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </RegionProvider>
  );
}
