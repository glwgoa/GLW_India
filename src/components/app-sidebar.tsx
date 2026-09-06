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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    roles: ["admin", "developer", "project_manager", "vendor"] as const,
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

const NAVY = "#0B1B3F";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** One frosted-glass, fully-rounded "island" — the building block every group below is made of. */
function Pill({
  children,
  flowBottomLeft = false,
}: {
  children: React.ReactNode;
  /** Lets the pill's bottom-left corner flare into a wide organic curve instead of a plain cap. */
  flowBottomLeft?: boolean;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 bg-white/70 px-1.5 py-3 shadow-lg shadow-black/10 ring-1 ring-black/5 backdrop-blur-xl sm:gap-4 sm:px-2 sm:py-4"
      style={{
        borderRadius: flowBottomLeft ? "9999px 9999px 9999px 2.75rem" : "9999px",
        paddingBottom: flowBottomLeft ? "1.75rem" : undefined,
      }}
    >
      {children}
    </div>
  );
}

function IconSlot({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-all sm:size-10 ${
        active ? "bg-white shadow-md" : "bg-black/5 hover:bg-black/10"
      }`}
    >
      <Icon className={`size-4 sm:size-4.5 ${active ? "" : "opacity-70"}`} style={{ color: NAVY }} />
    </Link>
  );
}

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(profile.role as never));

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-y-0 left-2 z-40 flex max-h-screen flex-col items-center justify-center gap-4 overflow-y-auto py-4 sm:left-4 sm:gap-6 sm:py-6"
    >
      <Pill>
        {items.map((item) => (
          <IconSlot
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href}
          />
        ))}
      </Pill>

      <Pill>
        <div className="flex size-10 items-center justify-center rounded-full bg-white p-0.5 shadow-md sm:size-11">
          <Avatar className="size-full">
            <AvatarFallback className="bg-transparent text-xs font-semibold" style={{ color: NAVY }}>
              {initials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </Pill>

      <Pill flowBottomLeft>
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black/5 transition-all sm:size-10 hover:bg-black/10"
          >
            <LogOut className="size-4 opacity-70 sm:size-4.5" style={{ color: NAVY }} />
          </button>
        </form>
      </Pill>
    </nav>
  );
}
