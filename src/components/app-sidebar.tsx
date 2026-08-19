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
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UniversalSearch } from "@/components/universal-search";
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

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(profile.role as never));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 overflow-hidden px-2 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-semibold">
            GI
          </div>
          <span className="truncate text-sm font-semibold whitespace-nowrap group-data-[collapsible=icon]:hidden">
            GLW India Ops
          </span>
        </div>
        <div className="px-1 pb-1 group-data-[collapsible=icon]:hidden">
          <UniversalSearch />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 overflow-hidden px-2 py-1.5">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-xs">{initials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-xs font-medium">{profile.full_name}</span>
            <span className="truncate text-xs capitalize text-muted-foreground">
              {profile.role.replace("_", " ")}
            </span>
          </div>
        </div>
        <form action={signOut}>
          <SidebarMenuButton type="submit" className="w-full">
            <LogOut />
            <span>Sign out</span>
          </SidebarMenuButton>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
