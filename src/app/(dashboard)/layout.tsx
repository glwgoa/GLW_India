import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { RegionProvider } from "@/lib/region-context";
import { AppSidebar } from "@/components/app-sidebar";
import { RegionSwitcher } from "@/components/region-switcher";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import PixelBlast from "@/components/pixel-blast";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { PageTransition } from "@/components/motion/page-transition";
import type { Profile } from "@/types/profile";
import { isPrivileged } from "@/lib/auth/roles";

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
      <SidebarProvider>
        <AppSidebar profile={profile} />
        <SidebarInset className="bg-transparent">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm font-medium text-muted-foreground">
                GLW India Ops Dashboard
              </span>
            </div>
            <div className="flex items-center gap-3">
              <AnimatedThemeToggler />
              <RegionSwitcher regions={regions ?? []} canViewAll={canViewAllRegions} />
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <PageTransition>{children}</PageTransition>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </RegionProvider>
  );
}
