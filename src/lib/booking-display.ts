import type { BookingRow, BookingStatus, TransportType } from "@/types/booking";

export const BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
  "cancelled_refunded",
];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  cancelled_refunded: "Cancel/Refunded",
};

export const BOOKING_STATUS_DOT: Record<BookingStatus, string> = {
  pending: "bg-amber-500",
  assigned: "bg-blue-500",
  in_progress: "bg-violet-500",
  completed: "bg-emerald-500",
  cancelled: "bg-rose-500",
  cancelled_refunded: "bg-rose-500",
};

export const TRANSPORT_TYPE_LABEL: Record<TransportType, string> = {
  pickup_drop: "Pickup/Drop",
  direct_jetty: "Direct Jetty",
};

export function formatBookingTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Yacht/Dinner-cruise-specific details as a single "·"-joined line. */
export function bookingCategoryDetails(booking: BookingRow) {
  const parts: string[] = [];
  if (booking.start_time && booking.end_time) {
    parts.push(`${formatBookingTime(booking.start_time)}–${formatBookingTime(booking.end_time)}`);
  }
  const duration: string[] = [];
  if (booking.sailing_hours != null) duration.push(`${booking.sailing_hours}h sailing`);
  if (booking.anchorage_hours != null) duration.push(`${booking.anchorage_hours}h anchorage`);
  if (duration.length > 0) parts.push(duration.join(" + "));
  if (booking.guest_count != null) parts.push(`${booking.guest_count} guests`);
  if (booking.kids_count) parts.push(`${booking.kids_count} kids`);
  if (booking.add_ons && booking.add_ons.length > 0) parts.push(booking.add_ons.join(", "));
  if (booking.transport_type) {
    const label = TRANSPORT_TYPE_LABEL[booking.transport_type];
    if (booking.transport_type === "pickup_drop" && booking.pickup_drop_price != null) {
      const total = booking.pickup_drop_price * (booking.guest_count ?? 1);
      parts.push(`${label} (+₹${total.toLocaleString("en-IN")})`);
    } else {
      parts.push(label);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
