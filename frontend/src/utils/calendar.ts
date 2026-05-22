import type { AppointmentRequest } from "@/types/domain";
import { isAllowedScheduleDate } from "@/utils/scheduleRules";

export type CalendarDay = {
  id: string;
  date: Date;
  weekday: string;
  day: string;
  month: string;
  label: string;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function toDateId(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toLocalDateTimeInput(date: Date) {
  return `${toDateId(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function buildCalendarDays(monthsAhead = 6): CalendarDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  end.setMonth(end.getMonth() + monthsAhead);

  const days: CalendarDay[] = [];
  const cursor = new Date(today);

  while (cursor <= end) {
    if (isAllowedScheduleDate(cursor)) {
      days.push({
        id: toDateId(cursor),
        date: new Date(cursor),
        weekday: cursor.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        day: pad(cursor.getDate()),
        month: cursor.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        label: cursor.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long"
        })
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function formatSelectedDay(day: CalendarDay) {
  return day.label.charAt(0).toUpperCase() + day.label.slice(1);
}

export function requestDateFromSlotKey(slotKey: string): Date | undefined {
  const match = slotKey.match(/^(\d{4}-\d{2}-\d{2})-(\d{2}):(\d{2})$/);
  if (!match) {
    return undefined;
  }
  const [, date, hour, minute] = match;
  return new Date(`${date}T${hour}:${minute}:00`);
}

export function sortUpcomingRequests(requests: AppointmentRequest[]) {
  const now = new Date();
  return requests
    .filter((request) => !["completed", "cancelled", "rejected"].includes(request.status))
    .map((request) => ({
      request,
      date: requestDateFromSlotKey(request.slotKey)
    }))
    .filter((item) => item.date && item.date >= now)
    .sort((left, right) => left.date!.getTime() - right.date!.getTime())
    .map((item) => item.request);
}

export function sortRequestsBySchedule(requests: AppointmentRequest[]) {
  return [...requests].sort((left, right) => {
    const leftDate = requestDateFromSlotKey(left.slotKey)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightDate = requestDateFromSlotKey(right.slotKey)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftDate - rightDate;
  });
}
