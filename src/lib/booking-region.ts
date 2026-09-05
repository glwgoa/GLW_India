import type { BookingProduct } from "@/types/booking";

/**
 * A vendor has no single region of its own — regions attach to a product via
 * regional_inventory, and a product can be stocked in more than one region.
 * When a product maps to exactly one region, use it; otherwise (no stock
 * rows, or stocked in multiple regions) fall back to the creating
 * employee's own region rather than leaving the booking unregioned.
 */
export function deriveRegionId(product: BookingProduct | undefined, employeeRegionId: string | null): string {
  if (!product) return employeeRegionId ?? "";
  const regionIds = Array.from(
    new Set((product.regional_inventory ?? []).map((r) => r.region_id).filter((id): id is string => !!id)),
  );
  if (regionIds.length === 1) return regionIds[0];
  return employeeRegionId ?? "";
}
