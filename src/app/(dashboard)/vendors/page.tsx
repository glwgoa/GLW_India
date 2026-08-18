import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { VendorsClient } from "@/components/vendors/vendors-client";
import type { Profile } from "@/types/profile";
import type { VendorRow } from "@/types/vendor";

export default async function VendorsPage() {
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

  requireRole(profile, ["admin", "developer", "project_manager", "vendor"]);

  const { data: vendors } = await supabase.from("vendors").select("*").order("name");

  return <VendorsClient initialVendors={(vendors ?? []) as VendorRow[]} profile={profile} />;
}
