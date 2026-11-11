/** One brand's bookings in one month (month is "YYYY-MM", by booking date). */
export type MonthlyBrandRow = {
  month: string;
  brand: string;
  bookings: number;
  revenue: number;
  earnings: number;
};

/** Bookings added by one person in one month. */
export type MonthlyCreatorRow = {
  month: string;
  creator: string;
  bookings: number;
  revenue: number;
};
