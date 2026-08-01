import type { BookingStatus } from "@/types/booking";

export type SlaHint = "on_track" | "due_soon" | "overdue";

const DUE_SOON_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Purely informational hint derived from the deadline — never written back to
 * the database. sla_status itself is set manually by staff.
 */
export function computeSlaHint(deadlineIso: string, status: BookingStatus): SlaHint {
  if (status === "completed" || status === "cancelled") return "on_track";

  const msLeft = new Date(deadlineIso).getTime() - Date.now();
  if (msLeft <= 0) return "overdue";
  if (msLeft <= DUE_SOON_WINDOW_MS) return "due_soon";
  return "on_track";
}

export function formatCountdown(deadlineIso: string): string {
  const ms = new Date(deadlineIso).getTime() - Date.now();
  const abs = Math.abs(ms);

  const minutes = Math.floor(abs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let label: string;
  if (days > 0) label = `${days}d ${hours % 24}h`;
  else if (hours > 0) label = `${hours}h ${minutes % 60}m`;
  else label = `${minutes}m`;

  return ms < 0 ? `${label} overdue` : `${label} left`;
}
