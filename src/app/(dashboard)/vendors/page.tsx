import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { VendorsClient } from "@/components/vendors/vendors-client";
import {
  VENDOR_CATEGORY_SELECTIONS_SELECT,
  groupVendorCategorySelections,
} from "@/lib/vendor-categories";
import type { Profile } from "@/types/profile";
import type { VendorCategoryRow, VendorRow, VendorSubCategoryRow } from "@/types/vendor";

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

  const [{ data: vendors }, { data: categories }, { data: subCategories }, { data: selections }] =
    await Promise.all([
      supabase.from("vendors").select("*").order("name"),
      supabase.from("vendor_categories").select("*").order("name"),
      supabase.from("vendor_sub_categories").select("*").order("name"),
      supabase.from("vendor_category_selections").select(VENDOR_CATEGORY_SELECTIONS_SELECT),
    ]);

  return (
    <VendorsClient
      initialVendors={(vendors ?? []) as VendorRow[]}
      categories={(categories ?? []) as VendorCategoryRow[]}
      subCategories={(subCategories ?? []) as VendorSubCategoryRow[]}
      initialCategorySelections={groupVendorCategorySelections(
        (selections ?? []) as unknown as Parameters<typeof groupVendorCategorySelections>[0],
      )}
      profile={profile}
    />
  );
}
