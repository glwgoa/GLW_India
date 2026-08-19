import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { VendorCategoriesClient } from "@/components/vendor-categories/vendor-categories-client";
import type { Profile } from "@/types/profile";
import type { VendorCategoryRow, VendorSubCategoryRow } from "@/types/vendor";

export default async function VendorCategoriesPage() {
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
