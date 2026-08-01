export type UserRole = "admin" | "vendor" | "project_manager" | "hr" | "employee";

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  region_id: string | null;
  vendor_id: string | null;
  created_at: string;
};
