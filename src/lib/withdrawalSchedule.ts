import "server-only";

import { prisma } from "@/lib/prisma";
import {
  WITHDRAWAL_TIME_ZONE,
  withdrawalWindowTestMode,
} from "@/lib/config";

export const WITHDRAWAL_WEEKDAYS = [
  { value: "Sun", label: "Sunday" },
  { value: "Mon", label: "Monday" },
  { value: "Tue", label: "Tuesday" },
  { value: "Wed", label: "Wednesday" },
  { value: "Thu", label: "Thursday" },
  { value: "Fri", label: "Friday" },
  { value: "Sat", label: "Saturday" },
] as const;

export type WithdrawalWeekday = (typeof WITHDRAWAL_WEEKDAYS)[number]["value"];

export type WithdrawalSchedule = {
  weekday: WithdrawalWeekday;
  startTime: string;
  endTime: string;
};

export const WITHDRAWAL_SCHEDULE_SETTING_KEYS = {
  weekday: "WITHDRAWAL_REQUEST_WEEKDAY",
  startTime: "WITHDRAWAL_REQUEST_START_TIME",
  endTime: "WITHDRAWAL_REQUEST_END_TIME",
} as const;

const DEFAULT_SCHEDULE: WithdrawalSchedule = {
  weekday: "Sun",
  startTime: "00:00",
  endTime: "12:00",
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function isWithdrawalWeekday(value: string): value is WithdrawalWeekday {
  return WITHDRAWAL_WEEKDAYS.some((day) => day.value === value);
}

export function timeToMinutes(value: string): number | null {
  if (!TIME_PATTERN.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function validateWithdrawalSchedule(schedule: WithdrawalSchedule): string | null {
  const start = timeToMinutes(schedule.startTime);
  const end = timeToMinutes(schedule.endTime);
  if (!isWithdrawalWeekday(schedule.weekday)) return "Choose a valid weekday.";
  if (start === null || end === null) return "Choose valid start and end times.";
  if (end <= start) return "The end time must be later than the start time.";
  return null;
}

export async function getWithdrawalSchedule(): Promise<WithdrawalSchedule> {
  const keys = Object.values(WITHDRAWAL_SCHEDULE_SETTING_KEYS);
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const settings = new Map(rows.map((row) => [row.key, row.value]));
  const candidate: WithdrawalSchedule = {
    weekday: isWithdrawalWeekday(
      settings.get(WITHDRAWAL_SCHEDULE_SETTING_KEYS.weekday) ?? "",
    )
      ? (settings.get(
          WITHDRAWAL_SCHEDULE_SETTING_KEYS.weekday,
        ) as WithdrawalWeekday)
      : DEFAULT_SCHEDULE.weekday,
    startTime:
      settings.get(WITHDRAWAL_SCHEDULE_SETTING_KEYS.startTime) ??
      DEFAULT_SCHEDULE.startTime,
    endTime:
      settings.get(WITHDRAWAL_SCHEDULE_SETTING_KEYS.endTime) ??
      DEFAULT_SCHEDULE.endTime,
  };
  return validateWithdrawalSchedule(candidate) ? DEFAULT_SCHEDULE : candidate;
}

function formatTime(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours < 12 ? "AM" : "PM";
  const clockHour = hours % 12 || 12;
  return `${clockHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function withdrawalScheduleLabel(schedule: WithdrawalSchedule): string {
  const day =
    WITHDRAWAL_WEEKDAYS.find((item) => item.value === schedule.weekday)?.label ??
    schedule.weekday;
  return `${day}, ${formatTime(schedule.startTime)}–${formatTime(schedule.endTime)} IST`;
}

export function withdrawalRequestWindowMessage(
  schedule: WithdrawalSchedule,
): string {
  return `Withdrawal requests are open ${withdrawalScheduleLabel(schedule)}. Withdrawals are processed on Mondays.`;
}

function timeParts(date: Date): {
  weekday: string;
  minutes: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WITHDRAWAL_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hours = Number(parts.find((part) => part.type === "hour")?.value ?? -1);
  const minutes = Number(
    parts.find((part) => part.type === "minute")?.value ?? -1,
  );
  return {
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
    minutes: hours * 60 + minutes,
  };
}

export function withdrawalsOpenNow(
  schedule: WithdrawalSchedule,
  date = new Date(),
): boolean {
  if (withdrawalWindowTestMode()) return true;
  const start = timeToMinutes(schedule.startTime);
  const end = timeToMinutes(schedule.endTime);
  if (start === null || end === null) return false;
  const current = timeParts(date);
  return (
    current.weekday === schedule.weekday &&
    current.minutes >= start &&
    current.minutes < end
  );
}
