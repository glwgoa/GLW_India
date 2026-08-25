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
