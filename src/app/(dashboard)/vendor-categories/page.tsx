import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireRole } from "@/lib/auth/require-role";
import { VendorCategoriesClient } from "@/components/vendor-categories/vendor-categories-client";
import type { VendorCategoryRow, VendorSubCategoryRow } from "@/types/vendor";

export default async function VendorCategoriesPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  requireRole(profile, ["developer"]);

  const [{ data: categories }, { data: subCategories }] = await Promise.all([
    supabase.from("vendor_categories").select("*").order("name"),
    supabase.from("vendor_sub_categories").select("*").order("name"),
  ]);

  return (
    <VendorCategoriesClient
      initialCategories={(categories ?? []) as VendorCategoryRow[]}
      initialSubCategories={(subCategories ?? []) as VendorSubCategoryRow[]}
    />
  );
}
