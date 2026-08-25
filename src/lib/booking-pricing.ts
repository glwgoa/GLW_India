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

/** Kids (5-10 yrs) are only priced separately for per-guest categories. */
function kidsMultiplier(booking: Pick<BookingRow, "item" | "kids_count">) {
  return isPerGuestCategory(booking.item?.category) ? (booking.kids_count ?? 0) : 0;
}

export function effectiveSalePrice(
  booking: Pick<BookingRow, "item" | "guest_count" | "kids_count" | "sale_price">,
) {
  const kids = kidsMultiplier(booking);
  const kidsSalePrice = kids > 0 ? (booking.item?.kids_sale_price ?? 0) * kids : 0;
  if (booking.sale_price == null) return kidsSalePrice > 0 ? kidsSalePrice : null;
  return booking.sale_price * guestMultiplier(booking) + kidsSalePrice;
}

/**
 * Base B2B price (per adult guest for Dinner/Sunset Cruise) times guests,
 * plus the kids B2B price times kids, plus the Pickup/Drop transport fee
 * (per adult) if any — never written back to the shared catalog_items
 * b2b_price/kids_b2b_price.
 */
export function effectiveB2bPrice(
  booking: Pick<
    BookingRow,
    "item" | "guest_count" | "kids_count" | "transport_type" | "pickup_drop_price"
  >,
) {
  const kids = kidsMultiplier(booking);
  const kidsB2bPrice = kids > 0 ? (booking.item?.kids_b2b_price ?? 0) * kids : 0;
  if (booking.item?.b2b_price == null) return kidsB2bPrice > 0 ? kidsB2bPrice : null;
  const multiplier = guestMultiplier(booking);
  const base = booking.item.b2b_price * multiplier;
  const extra =
    booking.transport_type === "pickup_drop" ? (booking.pickup_drop_price ?? 0) * multiplier : 0;
  return base + extra + kidsB2bPrice;
}

export function computeProfit(
  booking: Pick<
    BookingRow,
    "item" | "guest_count" | "kids_count" | "sale_price" | "transport_type" | "pickup_drop_price"
  >,
) {
  const salePrice = effectiveSalePrice(booking);
  const b2bPrice = effectiveB2bPrice(booking);
  if (salePrice == null || b2bPrice == null) return null;
  return salePrice - b2bPrice;
}
