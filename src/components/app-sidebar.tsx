"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarClock,
  Boxes,
  FolderKanban,
  Clock,
  BarChart3,
  Building2,
  Users,
  LogOut,
  Tags,
  Receipt,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import type { Profile } from "@/types/profile";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard, roles: null },
  { href: "/bookings", label: "Bookings", icon: CalendarClock, roles: null },
  { href: "/inventory", label: "Inventory", icon: Boxes, roles: null },
  {
    href: "/vendors",
    label: "Vendors",
    icon: Building2,
    roles: ["admin", "developer", "project_manager", "employee", "vendor"] as const,
  },
  { href: "/projects", label: "Projects", icon: FolderKanban, roles: null },
  { href: "/employees", label: "Employees", icon: Users, roles: null },
  { href: "/attendance", label: "Attendance", icon: Clock, roles: null },
  {
    href: "/transactions",
    label: "Transactions",
    icon: Receipt,
    roles: ["admin", "developer", "project_manager"] as const,
  },
  {
    href: "/mis-reports",
    label: "MIS Reports",
    icon: BarChart3,
    roles: ["admin", "developer", "project_manager"] as const,
  },
  {
    href: "/vendor-categories",
    label: "Vendor Categories",
    icon: Tags,
    roles: ["developer"] as const,
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(profile.role as never));
  const activeIndex = items.findIndex((item) => isActive(pathname, item.href));

  return (
    <nav
      aria-label="Primary"
      className="sidebar-shell fixed inset-y-2 left-2 z-40 flex w-14 flex-col items-center py-3 [--item-h:clamp(2rem,calc((100svh-9.5rem)/var(--nav-count)),3rem)] [--nav-top:4rem] sm:inset-y-3 sm:left-3 sm:w-[4.5rem] sm:py-4 sm:[--item-h:clamp(2rem,calc((100svh-10.5rem)/var(--nav-count)),3.25rem)] sm:[--nav-top:4.75rem]"
      style={{ ["--tab-index" as string]: Math.max(activeIndex, 0), ["--nav-count" as string]: items.length }}
    >
      {/* Black bar with a notch cut out at the active item, so the page background shows through. */}
      <div aria-hidden className="sidebar-bar absolute inset-0 -z-10 rounded-[1.75rem] bg-sidebar sm:rounded-[2rem]" />

      <Link
        href="/"
        aria-label="GLW India home"
        className="mb-3 flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold tracking-tight text-black transition-transform duration-300 hover:rotate-12 sm:size-12 sm:text-sm"
      >
        GLW
      </Link>

      <div className="relative min-h-0 w-full flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="relative flex flex-col">
          {items.map((item, i) => {
            const active = i === activeIndex;
            const Icon = item.icon;
            return (
              <li key={item.href} style={{ height: "var(--item-h)" }}>
                <Link
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`group flex size-full items-center justify-center transition-colors duration-300 ${
                    active
                      ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon className="size-5 transition-transform duration-300 group-hover:scale-110" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <form action={signOut} className="mt-3">
        <button
          type="submit"
          title="Sign out"
          aria-label="Sign out"
          className="flex size-10 items-center justify-center rounded-full text-sidebar-foreground/60 transition-colors hover:bg-white/10 hover:text-sidebar-foreground"
        >
          <LogOut className="size-5" />
        </button>
      </form>
    </nav>
  );
}
