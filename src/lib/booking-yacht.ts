export const YACHT_CATEGORY_NAME = "Private Yachts";
export const DINNER_CRUISE_CATEGORY_NAME = "Dinner Cruise";

export const YACHT_ADD_ONS = ["Decor", "Catering", "Dancers", "Drone", "Music", "Bar Setup"] as const;

/** Private Yacht and Dinner Cruise bookings collect a customer contact number. */
export function needsCustomerContact(category: string | null | undefined) {
  return category === YACHT_CATEGORY_NAME || category === DINNER_CRUISE_CATEGORY_NAME;
}
