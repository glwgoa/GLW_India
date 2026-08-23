import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { AttendanceClient } from "@/components/attendance/attendance-client";
import type { AttendanceRow } from "@/types/attendance";
import { isPrivileged } from "@/lib/auth/roles";

export default async function AttendancePage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const isAdminHr = isPrivileged(profile.role) || profile.role === "hr";
  const isAdmin = isPrivileged(profile.role);
  const isDeveloper = profile.role === "developer";

  const [{ data: ownRows }, { data: orgRows }, { data: employees }] = await Promise.all([
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", profile.id)
      .order("clock_in", { ascending: false }),
    isAdminHr
      ? supabase
          .from("attendance")
          .select("*, profile:profiles(full_name)")
          .order("clock_in", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] as AttendanceRow[] }),
    isDeveloper
      ? supabase.from("profiles").select("id, full_name").order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);

  const own = (ownRows ?? []) as unknown as AttendanceRow[];
  const openRecord = own.find((r) => r.clock_out === null) ?? null;

  return (
    <AttendanceClient
      userId={profile.id}
      initialOpenRecord={openRecord}
      initialOwnRows={own}
      orgRows={(orgRows ?? []) as unknown as AttendanceRow[]}
      isAdminHr={isAdminHr}
      isAdmin={isAdmin}
      isDeveloper={isDeveloper}
      employees={employees ?? []}
    />
  );
}
