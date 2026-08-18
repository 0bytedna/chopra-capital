export const REPORTING_TIME_ZONE = "Asia/Kolkata";

const INDIA_UTC_OFFSET = "+05:30";
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function reportingDayKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORTING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

function dayKeyDate(day: string): Date {
  if (!DAY_KEY_PATTERN.test(day)) throw new Error("Invalid reporting day.");
  return new Date(`${day}T00:00:00Z`);
}

export function shiftReportingDay(day: string, days: number): string {
  const date = dayKeyDate(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function reportingDayStart(day: string): Date {
  if (!DAY_KEY_PATTERN.test(day)) throw new Error("Invalid reporting day.");
  return new Date(`${day}T00:00:00${INDIA_UTC_OFFSET}`);
}

export function reportingDayEnd(day: string): Date {
  return new Date(reportingDayStart(shiftReportingDay(day, 1)).getTime() - 1);
}

export function reportingWeekStart(day: string): string {
  const date = dayKeyDate(day);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return shiftReportingDay(day, -daysSinceMonday);
}

export function reportingMonthStart(day: string, monthsBack = 0): string {
  const date = dayKeyDate(day);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - monthsBack, 1),
  )
    .toISOString()
    .slice(0, 10);
}
