import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { VendorsClient } from "@/components/vendors/vendors-client";
import {
  VENDOR_CATEGORY_SELECTIONS_SELECT,
  groupVendorCategorySelections,
} from "@/lib/vendor-categories";
import type { VendorCategoryRow, VendorRow, VendorSubCategoryRow } from "@/types/vendor";

export default async function VendorsPage() {
  const supabase = await createClient();

  // Profile and data queries run together — RLS guards the rows,
  // requireRole still redirects unauthorized roles before rendering.
  const [profile, { data: vendors }, { data: categories }, { data: subCategories }, { data: selections }] =
    await Promise.all([
      getCurrentProfile(),
      supabase.from("vendors").select("*").order("name"),
      supabase.from("vendor_categories").select("*").order("name"),
      supabase.from("vendor_sub_categories").select("*").order("name"),
      supabase.from("vendor_category_selections").select(VENDOR_CATEGORY_SELECTIONS_SELECT),
    ]);

  requireRole(profile, ["admin", "developer", "project_manager", "employee", "accountant", "vendor"]);

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
