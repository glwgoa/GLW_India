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
import { isMobileApp } from "@/lib/platform";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard, roles: null },
  { href: "/bookings", label: "Bookings", icon: CalendarClock, roles: null },
  { href: "/inventory", label: "Inventory", icon: Boxes, roles: null },
  {
    href: "/vendors",
    label: "Vendors",
    icon: Building2,
    roles: ["admin", "developer", "project_manager", "employee", "accountant", "vendor"] as const,
  },
  { href: "/projects", label: "Projects", icon: FolderKanban, roles: null },
  { href: "/employees", label: "Employees", icon: Users, roles: null },
  { href: "/attendance", label: "Attendance", icon: Clock, roles: null },
  {
    href: "/transactions",
    label: "Transactions",
    icon: Receipt,
    roles: ["admin", "developer", "project_manager", "accountant"] as const,
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

/** Bottom tab bar shown only inside the Capacitor mobile app. */
export function MobileBottomNav({ profile }: { profile: Profile }) {
  if (!isMobileApp()) return null;

  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(profile.role as never));

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-white/10 bg-[#0b49a6]/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-md"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={item.href === "/inventory" ? false : true}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
              active ? "text-white" : "text-white/60 hover:text-white/90"
            }`}
          >
            <Icon className={`size-5 transition-transform ${active ? "scale-110" : ""}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}

      <form action={signOut} className="flex flex-col items-center">
        <button
          type="submit"
          aria-label="Sign out"
          className="flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-white/60 transition-colors hover:text-white/90"
        >
          <LogOut className="size-5" />
          <span className="text-[10px] font-medium">Exit</span>
        </button>
      </form>
    </nav>
  );
}