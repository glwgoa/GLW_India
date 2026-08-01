import { redirect } from "next/navigation";
import type { Profile, UserRole } from "@/types/profile";

export function requireRole(profile: Profile, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(profile.role)) {
    redirect("/?denied=1");
  }
}
