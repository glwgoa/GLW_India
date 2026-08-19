import type { VendorCategorySelection } from "@/types/vendor";

type RawSelection = {
  vendor_id: string;
  category: { id: string; name: string } | null;
  sub_category: { id: string; name: string } | null;
};

export const VENDOR_CATEGORY_SELECTIONS_SELECT =
  "vendor_id, category:vendor_categories(id, name), sub_category:vendor_sub_categories(id, name)";

/** Groups the raw joined rows from vendor_category_selections by vendor_id. */
export function groupVendorCategorySelections(
  rows: RawSelection[],
): Record<string, VendorCategorySelection[]> {
  const map: Record<string, VendorCategorySelection[]> = {};
  for (const row of rows) {
    if (!row.category) continue;
    const entry: VendorCategorySelection = {
      categoryId: row.category.id,
      categoryName: row.category.name,
      subCategoryId: row.sub_category?.id ?? null,
      subCategoryName: row.sub_category?.name ?? null,
    };
    (map[row.vendor_id] ??= []).push(entry);
  }
  return map;
}
