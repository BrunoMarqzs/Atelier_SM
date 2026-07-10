import type { TimeSlot } from "@/types/domain";

const ATELIER_TIME_ZONE = "America/Sao_Paulo";
const BLOCKED_STANDARD_MINUTES = new Set([660, 690, 720, 750, 780, 810]);
const SATURDAY_SLOT_MINUTES = new Set([840, 870, 900, 930, 960]);
const BASE_WEEKDAY_SLOT_MINUTES = new Set([
  480,
  510,
  540,
  570,
  600,
  630,
  840,
  870,
  900,
  930,
  960,
  990,
  1020
]);
const EXTENDED_SLOT_MINUTES = [1050, 1080, 1110, 1140];
const EXTENDED_WEEKDAYS = new Set([2, 4, 5]);

export function allowedHoursForDate(date: Date) {
  const weekday = date.getDay();
  if (weekday === 0) {
    return new Set<number>();
  }
  if (weekday === 6) {
    return SATURDAY_SLOT_MINUTES;
  }

  const hours = new Set(BASE_WEEKDAY_SLOT_MINUTES);
  if (EXTENDED_WEEKDAYS.has(weekday)) {
    EXTENDED_SLOT_MINUTES.forEach((minute) => hours.add(minute));
  }

  BLOCKED_STANDARD_MINUTES.forEach((minute) => hours.delete(minute));
  return hours;
}

export function isAllowedScheduleDate(date: Date) {
  return allowedHoursForDate(date).size > 0;
}

export function isAllowedTimeSlot(slot: TimeSlot) {
  const date = parseAtelierSlotDate(slot.startsAt);
  return allowedHoursForDate(date).has(minutesFromDate(date));
}

export function filterAllowedTimeSlots(slots: TimeSlot[]) {
  return slots.filter(isAllowedTimeSlot).sort((left, right) => {
    return parseAtelierSlotDate(left.startsAt).getTime() - parseAtelierSlotDate(right.startsAt).getTime();
  });
}

export function slotKeyFromStart(startsAt: string) {
  const date = parseAtelierSlotDate(startsAt);
  return `${dateIdFromDate(date)}-${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatSlotTime(startsAt: string) {
  const date = parseAtelierSlotDate(startsAt);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatSlotDateTime(startsAt: string) {
  const date = parseAtelierSlotDate(startsAt);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}, ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

export function parseAtelierSlotDate(value: string) {
  if (hasExplicitTimeZone(value)) {
    return dateInAtelierTimeZone(value);
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) {
    return new Date(value);
  }

  const [, year, month, day, hour, minute, second = "0"] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

function hasExplicitTimeZone(value: string) {
  return /(Z|[+-]\d{2}:?\d{2})$/i.test(value);
}

function dateInAtelierTimeZone(value: string) {
  const sourceDate = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ATELIER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(sourceDate);
  const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return new Date(
    Number(mapped.year),
    Number(mapped.month) - 1,
    Number(mapped.day),
    Number(mapped.hour),
    Number(mapped.minute),
    Number(mapped.second)
  );
}

function dateIdFromDate(date: Date) {
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-");
}

function minutesFromDate(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
