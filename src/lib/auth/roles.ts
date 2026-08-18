import type { UserRole } from "@/types/profile";

/** Developer outranks admin — same access everywhere admin has it. */
export function isPrivileged(role: UserRole) {
  return role === "admin" || role === "developer";
}
