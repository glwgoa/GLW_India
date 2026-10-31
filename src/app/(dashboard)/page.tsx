import Link from "next/link";
import {
  BarChart3,
  CalendarCheck,
  Clock3,
  Hourglass,
  KanbanSquare,
  Layers,
  Package,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { Reveal, RevealItem } from "@/components/motion/reveal";

const MODULE_TINT: Record<string, string> = {"/bookings": "from-sky-500/90 to-blue-600/90", "/inventory": "from-emerald-500/90 to-teal-600/90", "/projects": "from-violet-500/90 to-purple-600/90", "/attendance": "from-amber-400/95 to-orange-500/95", "/mis-reports": "from-rose-500/90 to-pink-600/90"};

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
    description: "Live stock levels",
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
    description: "Brand and attendance analytics",
    icon: BarChart3,
    color: "var(--chart-3)",
  },
];

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

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

  const stats = [
    { label: "Bookings visible to you", value: totalBookings ?? 0, icon: CalendarCheck, tint: "bg-orange-500 text-white", href: "/bookings" },
    { label: "Pending bookings", value: pendingBookings ?? 0, icon: Hourglass, tint: "bg-indigo-500 text-white", href: "/bookings" },
    { label: "Active projects", value: activeProjects ?? 0, icon: Layers, tint: "bg-emerald-500 text-white", href: "/projects" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
      <div className="space-y-6">
        <Reveal>
          <RevealItem>
            <section className="rounded-lg bg-gradient-to-br from-blue-600 via-sky-500 to-orange-400 p-6 text-white shadow-xl shadow-black/[0.14] sm:p-8">
              <h1 className="text-3xl font-semibold">Hi {profile.full_name.split(" ")[0]}.</h1>
              <p className="mt-3 max-w-md text-sm text-white/85">
                Welcome back, {profile.full_name}. Here is what is happening across GLW India today.
              </p>
              <Link
                href="/bookings"
                className="mt-6 inline-flex h-10 items-center rounded-lg bg-white px-5 text-sm font-medium text-neutral-900 transition-transform hover:-translate-y-0.5 active:translate-y-0"
              >
                View Details
              </Link>
            </section>
          </RevealItem>
        </Reveal>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Modules</h2>
          <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {MODULES.map((mod) => (
              <RevealItem key={mod.href}>
                <Link
                  href={mod.href}
                  prefetch={mod.href === "/inventory" ? false : true}
                  className={`group flex h-full flex-col gap-4 rounded-lg bg-gradient-to-br ${MODULE_TINT[mod.href]} p-5 text-white shadow-xl shadow-black/[0.14] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
                >
                  <mod.icon className="size-6" />
                  <div>
                    <div className="text-base font-medium">{mod.label}</div>
                    <p className="mt-1 text-xs text-white/80">
                      {mod.description}
                    </p>
                  </div>
                </Link>
              </RevealItem>
            ))}
          </Reveal>
        </div>
      </div>

      <aside className="rounded-lg bg-card/80 shadow-xl shadow-black/[0.14] backdrop-blur-md p-4">
        <Reveal className="space-y-4">
          {stats.map((stat) => (
            <RevealItem key={stat.label}>
              <Link
                href={stat.href}
                className="flex items-center gap-3 rounded-md bg-background p-4 shadow-sm shadow-black/[0.05] ring-1 ring-black/[0.03] dark:ring-white/5 transition-transform hover:-translate-y-0.5"
              >
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-md ${stat.tint}`}>
                  <stat.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-muted-foreground">{stat.label}</div>
                  <div className="text-2xl font-semibold">{stat.value}</div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </RevealItem>
          ))}
        </Reveal>
      </aside>
    </div>
  );
}
