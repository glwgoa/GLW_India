import { DINNER_CRUISE_CATEGORY_NAME, isPerGuestCategory } from "@/lib/booking-yacht";
import type { BookingRow } from "@/types/booking";

/**
 * For Dinner Cruise and Sunset Cruise bookings, sale price and B2B price
 * are entered per guest — multiply by guest_count to get the booking's
 * actual totals. Private Yachts treat sale_price/b2b_price as flat,
 * already-total amounts (guest_count multiplier of 1).
 */
function guestMultiplier(booking: Pick<BookingRow, "item" | "guest_count">) {
  const isPerGuest = isPerGuestCategory(booking.item?.category);
  return isPerGuest && booking.guest_count ? booking.guest_count : 1;
}

/**
 * Kids (5-10 yrs) pricing is live for Dinner Cruise bookings first —
 * Sunset Cruise keeps the plain guest-only math until this is rolled
 * out there too.
 */
function hasKidsPricing(booking: Pick<BookingRow, "item">) {
  return booking.item?.category === DINNER_CRUISE_CATEGORY_NAME;
}

/**
 * Total sale price = (sale price x number of guests) + (kids price x
 * number of kids). The kids price is entered per booking (kids_price),
 * separate from the adult sale_price.
 */
export function effectiveSalePrice(
  booking: Pick<BookingRow, "item" | "guest_count" | "kids_count" | "kids_price" | "sale_price">,
) {
  const kidsTotal =
    hasKidsPricing(booking) && booking.kids_count && booking.kids_price != null
      ? booking.kids_price * booking.kids_count
      : 0;
  if (booking.sale_price == null) return kidsTotal > 0 ? kidsTotal : null;
  return booking.sale_price * guestMultiplier(booking) + kidsTotal;
}

/**
 * Base B2B price (per guest for Dinner Cruise) times guests, plus the
 * Pickup/Drop transport fee (also per guest) if any — never written back
 * to the shared catalog_items.b2b_price. This is the plain adult-only
 * figure shown as the "B2B price" column.
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
 * Profit = total sale price - [(kids B2B price x number of kids) +
 * (adult B2B price x number of guests)] for Dinner Cruise bookings with
 * kids. Everything else uses the plain sale price - B2B price.
 */
export function computeProfit(
  booking: Pick<
    BookingRow,
    | "item"
    | "guest_count"
    | "kids_count"
    | "kids_price"
    | "sale_price"
    | "transport_type"
    | "pickup_drop_price"
  >,
) {
  const salePrice = effectiveSalePrice(booking);
  if (salePrice == null) return null;

  if (hasKidsPricing(booking) && booking.kids_count) {
    const kidsB2bCost = (booking.item?.kids_b2b_price ?? 0) * booking.kids_count;
    const adultB2bCost = (booking.item?.b2b_price ?? 0) * guestMultiplier(booking);
    return salePrice - (kidsB2bCost + adultB2bCost);
  }

  const b2bPrice = effectiveB2bPrice(booking);
  if (b2bPrice == null) return null;
  return salePrice - b2bPrice;
}
