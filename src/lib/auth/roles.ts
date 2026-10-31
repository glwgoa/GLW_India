import type { UserRole } from "@/types/profile";

/** Developer outranks admin — same access everywhere admin has it. */
export function isPrivileged(role: UserRole) {
  return role === "admin" || role === "developer";
}

/** Employee-level staff: employees plus accountants, who have every employee permission. */
export function isStaffRole(role: UserRole) {
  return role === "employee" || role === "accountant";
}

/** Accountants get full access to Transactions (payments, reconcile, GST billing) and booking downloads. */
export function isAccountant(role: UserRole) {
  return role === "accountant";
}
