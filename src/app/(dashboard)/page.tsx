import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MODULES = [
  { href: "/bookings", label: "Bookings", description: "Active bookings and booking dates" },
  { href: "/inventory", label: "Inventory", description: "Regional stock levels" },
  { href: "/projects", label: "Projects", description: "Vendor and team project board" },
  { href: "/attendance", label: "Attendance", description: "Clock-in / clock-out log" },
  { href: "/mis-reports", label: "MIS Reports", description: "Region and attendance analytics" },
];

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
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Scoped to what your role can see — RLS handles the filtering.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bookings visible to you</CardDescription>
            <CardTitle className="text-3xl">{totalBookings ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending bookings</CardDescription>
            <CardTitle className="text-3xl">{pendingBookings ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active projects</CardDescription>
            <CardTitle className="text-3xl">{activeProjects ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{mod.label}</CardTitle>
                <CardDescription>{mod.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
