import { effectiveSalePrice } from "@/lib/booking-pricing";
import { formatBookingTime } from "@/lib/booking-display";
import {
  DINNER_CRUISE_CATEGORY_NAME,
  SUNSET_CRUISE_CATEGORY_NAME,
  YACHT_CATEGORY_NAME,
} from "@/lib/booking-yacht";
import type { BookingRow, TransportType } from "@/types/booking";

const TRANSPORT_TYPE_LABEL: Record<TransportType, string> = {
  pickup_drop: "Pickup/Drop",
  direct_jetty: "Direct Jetty",
};

const PARKING_LINK = "https://maps.app.goo.gl/h6pamAGVpvWhRLs39";

const PLEASE_NOTE = `📣 Please Note:

▪️ Guests are requested to settle their balance payment before the trip.

▪️ We require at least 48 hours prior notice for any cancellations

▪️ Cancellations received less than the above stated period will incur 100% cancellation fee.

▪️ 100% charge will apply to all no-shows.

▪️ Any refunds due will be processed after the trip date and will incur a 20% admin fee on the total billed amount.

▪️ Refunds can take 5-7 working days to show back into the account.

▪️ Refund requests are accepted only via email and will be processed thereafter.

Thanks, Have a nice day 🙏😊🛥️`;

function formatCurrency(value: number | null) {
  return value != null ? `₹${value.toLocaleString("en-IN")}` : "₹0";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

/** "HH:MM" minus N minutes, still "HH:MM" (wraps across midnight). */
function subtractMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m - minutes + 24 * 60) % (24 * 60);
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function dinnerOrSunsetConfirmation(booking: BookingRow, isSunset: boolean) {
  const salePrice = effectiveSalePrice(booking);
  const advance = booking.advance_amount ?? 0;
  const balance = salePrice != null ? salePrice - advance : null;
  const transportLabel = booking.transport_type ? TRANSPORT_TYPE_LABEL[booking.transport_type] : null;

  const cruiseName = isSunset ? `${booking.item?.name ?? "—"} (Sunset Cruise)` : (booking.item?.name ?? "—");

  return `🛥️ ${isSunset ? "Sunset" : "Dinner"} Cruise Reservation Confirmation

Thank you for choosing ${booking.brand ?? "—"}. We are pleased to confirm your reservation as under:

Cruise Name: ${cruiseName}${!isSunset ? `\nDinner Cruise${transportLabel ? ` (${transportLabel})` : ""}` : ""}

Date: ${formatDate(booking.booking_date)}

Name: ${booking.customer_name}
Contact Number: ${booking.customer_contact ?? "—"}

Number of Guests: ${booking.guest_count ?? "—"}

Price: ${formatCurrency(salePrice)}
Advance: ${formatCurrency(booking.advance_amount)}
${isSunset ? "Balance Amount:" : "*Balance Amount:*"} ${formatCurrency(balance)}
${!isSunset && booking.transport_type === "pickup_drop" ? "\n📍 Pick-up Time: 7:00 PM onwards\n" : ""}
📍 Reporting Time: ${booking.item?.reporting_time ? formatBookingTime(booking.item.reporting_time) : "—"}

📍 Reporting Location:
${booking.item?.jetty_name ?? "—"}
Google map Link: ${booking.item?.jetty_location_url ?? "—"}

🅿️ Multi-Level Car Parking:
${PARKING_LINK}

Contact Person:
${booking.vendor?.name ?? "—"}
${booking.vendor?.contact_phone ?? "—"}

${PLEASE_NOTE}`;
}

function yachtConfirmation(booking: BookingRow) {
  const salePrice = effectiveSalePrice(booking);
  const advance = booking.advance_amount ?? 0;
  const balance = salePrice != null ? salePrice - advance : null;

  const time =
    booking.start_time && booking.end_time
      ? `${formatBookingTime(booking.start_time)} to ${formatBookingTime(booking.end_time)}`
      : "—";

  const durationParts: string[] = [];
  if (booking.sailing_hours != null) durationParts.push(`${booking.sailing_hours} hour Sailing`);
  if (booking.anchorage_hours != null) durationParts.push(`${booking.anchorage_hours} hour Anchorage`);
  const duration = durationParts.length > 0 ? durationParts.join(" + ") : "—";

  const addOns = booking.add_ons && booking.add_ons.length > 0 ? booking.add_ons.join(", ") : "—";

  const reportingTime =
    booking.start_time != null ? formatBookingTime(subtractMinutes(booking.start_time, 15)) : "—";

  const reportingLocation = [booking.item?.jetty_name, booking.item?.jetty_location_url]
    .filter(Boolean)
    .join("\n") || "—";

  return `🛥️ Private Yacht Charter Reservation Confirmation

Thank you for choosing ${booking.brand ?? "—"}. We are pleased to confirm your reservation as under:

Yacht/Boat Name: ${booking.item?.name ?? "—"}

Date: ${formatDate(booking.booking_date)}

Name: ${booking.customer_name}
Contact Number: ${booking.customer_contact ?? "—"}

Time: ${time}
Duration: ${duration}

Number of Guests: ${booking.guest_count ?? "—"}

Price: ${formatCurrency(salePrice)}
Advance: ${formatCurrency(booking.advance_amount)}
Balance Amount: ${formatCurrency(balance)}

Add-Ons
${addOns}

📍 Reporting Time: ${reportingTime} (15 mins prior to the sailing time)

📍 Reporting Location:
${reportingLocation}

Contact Person:
Lloyd: +91 7498 419454

${PLEASE_NOTE}`;
}

/** Builds the copy-paste confirmation text for a booking, or null if its category has no template. */
export function generateBookingConfirmation(booking: BookingRow): string | null {
  const category = booking.item?.category;
  if (category === DINNER_CRUISE_CATEGORY_NAME) return dinnerOrSunsetConfirmation(booking, false);
  if (category === SUNSET_CRUISE_CATEGORY_NAME) return dinnerOrSunsetConfirmation(booking, true);
  if (category === YACHT_CATEGORY_NAME) return yachtConfirmation(booking);
  return null;
}
