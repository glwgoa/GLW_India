import type { UserRole } from "./profile";

export type EmployeeRow = {
  id: string;
  full_name: string;
  role: UserRole;
  region_id: string | null;
  vendor_id: string | null;
  created_at: string;
  region: { name: string } | null;
};
