/** One brand's bookings in one month (month is "YYYY-MM", by booking date). */
export type MonthlyBrandRow = {
  month: string;
  brand: string;
  bookings: number;
  revenue: number;
  earnings: number;
};
