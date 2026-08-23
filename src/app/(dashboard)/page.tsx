import Link from "next/link";
import {
  BarChart3,
  CalendarCheck,
  Clock3,
  Hourglass,
  KanbanSquare,
  LayoutDashboard,
  Layers,
  Package,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeaderIcon } from "@/components/page-header-icon";
import { Reveal, RevealItem } from "@/components/motion/reveal";

const MODULES = [
  {
    href: "/bookings",
    label: "Bookings",
    description: "Active bookings and booking dates",
    icon: CalendarCheck,
    color: "var(--chart-1)",
  },
  {
    href: "/inventory",
    label: "Inventory",
    description: "Regional stock levels",
    icon: Package,
    color: "var(--chart-2)",
  },
  {
    href: "/projects",
    label: "Projects",
    description: "Vendor and team project board",
    icon: KanbanSquare,
    color: "var(--chart-4)",
  },
  {
    href: "/attendance",
    label: "Attendance",
    description: "Clock-in / clock-out log",
    icon: Clock3,
    color: "var(--chart-5)",
  },
  {
    href: "/mis-reports",
    label: "MIS Reports",
    description: "Region and attendance analytics",
    icon: BarChart3,
    color: "var(--chart-3)",
  },
];

function IconBadge({ icon: Icon, color }: { icon: typeof CalendarCheck; color: string }) {
  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      <Icon className="size-5" style={{ color }} />
    </div>
  );
}

export default async function DashboardOverviewPage() {
  const supabase = await createClient();

  const [{ count: totalBookings }, { count: pendingBookings }, { count: activeProjects }] =
    await Promise.all([
      supabase.from("bookings").select("*", { count: "exact", head: true }),
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PageHeaderIcon icon={LayoutDashboard} color="var(--chart-1)" />
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Scoped to what your role can see — RLS handles the filtering.
          </p>
        </div>
      </div>

      <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <RevealItem>
          <Card className="border-t-2" style={{ borderTopColor: "var(--chart-1)" }}>
            <CardHeader className="flex-row items-center gap-3 pb-2">
              <IconBadge icon={CalendarCheck} color="var(--chart-1)" />
              <div>
                <CardDescription>Bookings visible to you</CardDescription>
                <CardTitle className="text-3xl">{totalBookings ?? 0}</CardTitle>
              </div>
            </CardHeader>
          </Card>
        </RevealItem>
        <RevealItem>
          <Card className="border-t-2" style={{ borderTopColor: "var(--chart-5)" }}>
            <CardHeader className="flex-row items-center gap-3 pb-2">
              <IconBadge icon={Hourglass} color="var(--chart-5)" />
              <div>
                <CardDescription>Pending bookings</CardDescription>
                <CardTitle className="text-3xl">{pendingBookings ?? 0}</CardTitle>
              </div>
            </CardHeader>
          </Card>
        </RevealItem>
        <RevealItem>
          <Card className="border-t-2" style={{ borderTopColor: "var(--chart-2)" }}>
            <CardHeader className="flex-row items-center gap-3 pb-2">
              <IconBadge icon={Layers} color="var(--chart-2)" />
              <div>
                <CardDescription>Active projects</CardDescription>
                <CardTitle className="text-3xl">{activeProjects ?? 0}</CardTitle>
              </div>
            </CardHeader>
          </Card>
        </RevealItem>
      </Reveal>

      <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => (
          <RevealItem key={mod.href}>
            <Link href={mod.href} prefetch={mod.href === "/inventory" ? false : true}>
              <Card className="h-full transition-colors hover:-translate-y-0.5 hover:bg-muted/50 hover:shadow-md active:translate-y-0 active:scale-[0.99]">
                <CardHeader className="flex-row items-center gap-3">
                  <IconBadge icon={mod.icon} color={mod.color} />
                  <div>
                    <CardTitle className="text-base">{mod.label}</CardTitle>
                    <CardDescription>{mod.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </RevealItem>
        ))}
      </Reveal>
    </div>
  );
}
