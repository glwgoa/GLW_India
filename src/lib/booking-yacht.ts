export const YACHT_CATEGORY_NAME = "Private Yachts";
export const DINNER_CRUISE_CATEGORY_NAME = "Dinner Cruise";
export const SUNSET_CRUISE_CATEGORY_NAME = "Sunset Cruise";

/** The 3 core booking categories, shown as a dropdown when adding a booking. */
export const BOOKING_CATEGORIES = [
  DINNER_CRUISE_CATEGORY_NAME,
  SUNSET_CRUISE_CATEGORY_NAME,
  YACHT_CATEGORY_NAME,
] as const;

export const YACHT_ADD_ONS = ["Decor", "Catering", "Dancers", "Drone", "Music", "Bar Setup"] as const;

/** Private Yacht, Dinner Cruise, and Sunset Cruise bookings collect a customer contact number. */
export function needsCustomerContact(category: string | null | undefined) {
  return (
    category === YACHT_CATEGORY_NAME ||
    category === DINNER_CRUISE_CATEGORY_NAME ||
    category === SUNSET_CRUISE_CATEGORY_NAME
  );
}

/**
 * Dinner Cruise and Sunset Cruise price per person (adult + a separate kids
 * rate) rather than a flat per-booking amount, and their products carry a
 * fixed guest reporting time.
 */
export function isPerGuestCategory(category: string | null | undefined) {
  return category === DINNER_CRUISE_CATEGORY_NAME || category === SUNSET_CRUISE_CATEGORY_NAME;
}

export function needsReportingTime(category: string | null | undefined) {
  return isPerGuestCategory(category);
}

/** Kids (5-10 yrs) get a separate B2B/sale price for these categories. */
export function needsKidsPricing(category: string | null | undefined) {
  return isPerGuestCategory(category);
}
