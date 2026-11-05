export const YACHT_CATEGORY_NAME = "Private Yachts";
export const DINNER_CRUISE_CATEGORY_NAME = "Dinner Cruise";
export const SUNSET_CRUISE_CATEGORY_NAME = "Sunset Cruise";
export const GOA_TRIP_CATEGORY_NAME = "Goa Trip";
/** Sub-category of "Goa Trip" — a road trip, so its products have no jetty/location details. */
export const DUDHSAGAR_SUB_CATEGORY_NAME = "Dudhsagar";

/** The core booking categories, shown as a dropdown when adding a booking. */
export const BOOKING_CATEGORIES = [
  DINNER_CRUISE_CATEGORY_NAME,
  SUNSET_CRUISE_CATEGORY_NAME,
  YACHT_CATEGORY_NAME,
  GOA_TRIP_CATEGORY_NAME,
] as const;

/** Where guests of a Goa Trip are picked up. */
export const GOA_TRIP_PICKUP_LOCATIONS = ["Calangute", "Candolim", "Baga", "Arpora"] as const;

export const YACHT_ADD_ONS = ["Decor", "Catering", "Dancers", "Drone", "Music", "Bar Setup"] as const;

/** Private Yacht, Dinner Cruise, and Sunset Cruise bookings collect a customer contact number. */
export function needsCustomerContact(category: string | null | undefined) {
  return (
    category === YACHT_CATEGORY_NAME ||
    category === DINNER_CRUISE_CATEGORY_NAME ||
    category === SUNSET_CRUISE_CATEGORY_NAME ||
    category === GOA_TRIP_CATEGORY_NAME
  );
}

/**
 * Dinner Cruise, Sunset Cruise and Goa Trip price per person (adult + a separate
 * kids rate) rather than a flat per-booking amount.
 */
export function isPerGuestCategory(category: string | null | undefined) {
  return (
    category === DINNER_CRUISE_CATEGORY_NAME ||
    category === SUNSET_CRUISE_CATEGORY_NAME ||
    category === GOA_TRIP_CATEGORY_NAME
  );
}

/** Cruise products carry a fixed guest reporting time (Goa Trips use a pick-up time instead). */
export function needsReportingTime(category: string | null | undefined) {
  return category === DINNER_CRUISE_CATEGORY_NAME || category === SUNSET_CRUISE_CATEGORY_NAME;
}

/** Bookings for these categories take a kids (5-10 yrs) price and a below-5 head count. */
export function hasKidsPriceFields(category: string | null | undefined) {
  return category === DINNER_CRUISE_CATEGORY_NAME || category === GOA_TRIP_CATEGORY_NAME;
}

/** Kids (5-10 yrs) get a separate B2B/sale price for these categories. */
export function needsKidsPricing(category: string | null | undefined) {
  return isPerGuestCategory(category);
}

/** Every product has a jetty name and location link except Dudhsagar trips. */
export function needsJettyDetails(subCategory: string | null | undefined) {
  return subCategory !== DUDHSAGAR_SUB_CATEGORY_NAME;
}
