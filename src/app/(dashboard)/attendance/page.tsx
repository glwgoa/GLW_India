import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AttendanceClient } from "@/components/attendance/attendance-client";
import type { Profile } from "@/types/profile";
import type { AttendanceRow } from "@/types/attendance";

export default async function AttendancePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect("/login");

  const isAdminHr = profile.role === "admin" || profile.role === "hr";
  const isAdmin = profile.role === "admin";

  const [{ data: ownRows }, { data: orgRows }] = await Promise.all([
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .order("clock_in", { ascending: false }),
    isAdminHr
      ? supabase
          .from("attendance")
          .select("*, profile:profiles(full_name)")
          .order("clock_in", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] as AttendanceRow[] }),
  ]);

  const own = (ownRows ?? []) as unknown as AttendanceRow[];
  const openRecord = own.find((r) => r.clock_out === null) ?? null;

  return (
    <AttendanceClient
      userId={user.id}
      initialOpenRecord={openRecord}
      initialOwnRows={own}
      orgRows={(orgRows ?? []) as unknown as AttendanceRow[]}
      isAdminHr={isAdminHr}
      isAdmin={isAdmin}
    />
  );
}
