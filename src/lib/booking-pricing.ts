import { isPerGuestCategory } from "@/lib/booking-yacht";
import type { BookingRow } from "@/types/booking";

/**
 * For Dinner Cruise and Sunset Cruise bookings, sale price and B2B price
 * are entered per adult guest — multiply by guest_count to get the
 * booking's actual totals. Private Yachts treat sale_price/b2b_price as
 * flat, already-total amounts (guest_count multiplier of 1).
 */
function guestMultiplier(booking: Pick<BookingRow, "item" | "guest_count">) {
  const isPerGuest = isPerGuestCategory(booking.item?.category);
  return isPerGuest && booking.guest_count ? booking.guest_count : 1;
}

export function effectiveSalePrice(
  booking: Pick<BookingRow, "item" | "guest_count" | "sale_price">,
) {
  if (booking.sale_price == null) return null;
  return booking.sale_price * guestMultiplier(booking);
}

/**
 * Base B2B price (per adult guest for Dinner/Sunset Cruise) times guests,
 * plus the Pickup/Drop transport fee (per adult) if any — never written
 * back to the shared catalog_items.b2b_price.
 */
export function effectiveB2bPrice(
  booking: Pick<BookingRow, "item" | "guest_count" | "transport_type" | "pickup_drop_price">,
) {
  if (booking.item?.b2b_price == null) return null;
  const multiplier = guestMultiplier(booking);
  const base = booking.item.b2b_price * multiplier;
  const extra =
    booking.transport_type === "pickup_drop" ? (booking.pickup_drop_price ?? 0) * multiplier : 0;
  return base + extra;
}

/**
 * For Dinner Cruise / Sunset Cruise bookings with kids, profit is
 * Sale price − (B2B price × kids) − (Kids B2B price × kids) — both B2B
 * costs scale with the number of kids, not the adult guest count.
 * Everything else (no kids, or Private Yachts) uses the normal
 * Sale price − B2B price.
 */
export function computeProfit(
  booking: Pick<
    BookingRow,
    "item" | "guest_count" | "kids_count" | "sale_price" | "transport_type" | "pickup_drop_price"
  >,
) {
  const salePrice = effectiveSalePrice(booking);
  if (salePrice == null) return null;

  const kids = isPerGuestCategory(booking.item?.category) ? (booking.kids_count ?? 0) : 0;
  if (kids > 0) {
    const b2bPrice = booking.item?.b2b_price ?? 0;
    const kidsB2bPrice = booking.item?.kids_b2b_price ?? 0;
    return salePrice - kids * b2bPrice - kids * kidsB2bPrice;
  }

  const b2bPrice = effectiveB2bPrice(booking);
  if (b2bPrice == null) return null;
  return salePrice - b2bPrice;
}
