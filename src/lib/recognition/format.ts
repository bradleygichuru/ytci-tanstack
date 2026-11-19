/**
 * EAT date and number formatting for recognition surfaces.
 *
 * Absolute times use Africa/Nairobi, matching how operators read the audit log.
 * Relative ages are computed from an explicit `now` so tests stay deterministic.
 */

const EAT = "Africa/Nairobi";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: EAT,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: EAT,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: EAT,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: EAT,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

export function formatShortDateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return shortDateTimeFormatter.format(date);
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return timeFormatter.format(date);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-KE").format(value);
}

export function formatXp(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)} XP`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "12m ago", "3h ago", "6d ago"; future values read "in 2h". */
export function relativeAge(
  value: string | Date,
  now: Date = new Date(),
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const delta = now.getTime() - date.getTime();
  const future = delta < 0;
  const abs = Math.abs(delta);
  let label: string;
  if (abs < MINUTE) label = "now";
  else if (abs < HOUR) label = `${Math.floor(abs / MINUTE)}m`;
  else if (abs < DAY) label = `${Math.floor(abs / HOUR)}h`;
  else label = `${Math.floor(abs / DAY)}d`;
  if (label === "now") return "just now";
  return future ? `in ${label}` : `${label} ago`;
}

/** Hours remaining against a deadline; negative means overdue. */
export function hoursUntil(value: string, now: Date = new Date()): number {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return (date.getTime() - now.getTime()) / HOUR;
}

export function formatDeadline(value: string, now: Date = new Date()): string {
  const hours = hoursUntil(value, now);
  if (hours <= 0) return `${Math.ceil(Math.abs(hours))}h overdue`;
  return `${Math.ceil(hours)}h left`;
}

/** ISO date (yyyy-mm-dd) in Nairobi, for date inputs. */
export function isoDate(value: string | Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: EAT });
}

export function daysFromNow(value: string, now: Date = new Date()): number {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.floor((date.getTime() - now.getTime()) / DAY);
}
