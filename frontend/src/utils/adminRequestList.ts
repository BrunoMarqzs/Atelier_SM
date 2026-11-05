import type { AppointmentRequest, AppointmentStatus } from "@/types/domain";
import { requestDateFromSlotKey } from "@/utils/calendar";

export function visibleInRequestTab(request: AppointmentRequest, status?: AppointmentStatus) {
  return status ? request.status === status : request.status !== "completed";
}

export function groupAdminRequests(requests: AppointmentRequest[]) {
  const sorted = [...requests].sort((a, b) =>
    (requestDateFromSlotKey(b.slotKey)?.getTime() ?? 0) -
    (requestDateFromSlotKey(a.slotKey)?.getTime() ?? 0) || b.id - a.id);
  const groups = new Map<string, { key: string; label: string; requests: AppointmentRequest[] }>();
  for (const request of sorted) {
    const date = requestDateFromSlotKey(request.slotKey);
    const key = date ? request.slotKey.slice(0, 10) : "unknown";
    if (!groups.has(key)) groups.set(key, { key, label: date
      ? date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
      : "Data não disponível", requests: [] });
    groups.get(key)!.requests.push(request);
  }
  return [...groups.values()];
}
