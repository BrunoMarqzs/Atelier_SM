import type { TimeSlot } from "@/types/domain";

const ATELIER_TIME_ZONE = "America/Sao_Paulo";
const BLOCKED_STANDARD_HOURS = new Set([11, 12, 13]);
const SATURDAY_HOURS = new Set([14, 15, 16]);
const BASE_WEEKDAY_HOURS = new Set([8, 9, 10, 14, 15, 16, 17]);
const EXTENDED_WEEKDAYS = new Set([2, 4, 5]);

export function allowedHoursForDate(date: Date) {
  const weekday = date.getDay();
  if (weekday === 0) {
    return new Set<number>();
  }
  if (weekday === 6) {
    return SATURDAY_HOURS;
  }

  const hours = new Set(BASE_WEEKDAY_HOURS);
  if (EXTENDED_WEEKDAYS.has(weekday)) {
    hours.add(18);
    hours.add(19);
  }

  BLOCKED_STANDARD_HOURS.forEach((hour) => hours.delete(hour));
  return hours;
}

export function isAllowedScheduleDate(date: Date) {
  return allowedHoursForDate(date).size > 0;
}

export function isAllowedTimeSlot(slot: TimeSlot) {
  const date = parseAtelierSlotDate(slot.startsAt);
  return allowedHoursForDate(date).has(date.getHours());
}

export function filterAllowedTimeSlots(slots: TimeSlot[]) {
  return slots.filter(isAllowedTimeSlot).sort((left, right) => {
    return parseAtelierSlotDate(left.startsAt).getTime() - parseAtelierSlotDate(right.startsAt).getTime();
  });
}

export function slotKeyFromStart(startsAt: string) {
  const date = parseAtelierSlotDate(startsAt);
  return `${dateIdFromDate(date)}-${pad(date.getHours())}:00`;
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

function pad(value: number) {
  return String(value).padStart(2, "0");
}
