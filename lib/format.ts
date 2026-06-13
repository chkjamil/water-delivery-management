/**
 * Shared formatting helpers — single source of truth.
 * Prevents PKR formatting being inlined differently in every component.
 */

/**
 * Format a number as Pakistani Rupees.
 * Returns "PKR 1,500" for normal amounts, "PKR 1.5k" for >= 1,000 in compact mode.
 *
 * @example
 *   formatPKR(1500)          // "PKR 1,500"
 *   formatPKR(1500, true)    // "PKR 1.5k"
 */
export function formatPKR(amount: number, compact = false): string {
  if (compact && amount >= 1_000_000) return `PKR ${(amount / 1_000_000).toFixed(1)}M`;
  if (compact && amount >= 1_000)     return `PKR ${(amount / 1_000).toFixed(1)}k`;
  return `PKR ${amount.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

/**
 * Format a date string or Date object for display.
 * @example
 *   formatDate("2024-05-11")  // "May 11, 2024"
 */
export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Format a datetime string for display with time.
 * @example
 *   formatDateTime("2024-05-11T14:30:00Z")  // "May 11, 2024, 2:30 PM"
 */
export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-PK", {
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

/**
 * Format a time string (HH:mm or HH:mm:ss) as 12-hour.
 * @example
 *   formatTime("14:30")  // "2:30 PM"
 */
export function formatTime(value: string): string {
  const [h, m] = value.split(":");
  const date = new Date();
  date.setHours(parseInt(h, 10), parseInt(m, 10), 0);
  return date.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * Returns a relative time label ("2 hours ago", "just now", etc.)
 */
export function timeAgo(value: string | Date): string {
  const d    = typeof value === "string" ? new Date(value) : value;
  const diff = (Date.now() - d.getTime()) / 1000; // seconds

  if (diff < 60)     return "just now";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(d);
}
