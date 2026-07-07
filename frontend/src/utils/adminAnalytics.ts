import type { AppointmentRequest, AppointmentStatus } from "@/types/domain";
import { requestDateFromSlotKey } from "@/utils/calendar";

export const activeStatuses: AppointmentStatus[] = [
  "pending",
  "under_review",
  "quote_sent",
  "approved",
  "in_progress"
];

export function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency"
  });
}

export function isActiveRequest(request: AppointmentRequest) {
  return activeStatuses.includes(request.status);
}

export function isRescheduledRequest(request: AppointmentRequest) {
  return Boolean(
    request.timeline?.some((event) => event.comment?.toLowerCase().includes("remarc"))
  );
}

export function requestScheduledDate(request: AppointmentRequest) {
  return requestDateFromSlotKey(request.slotKey);
}

export function isRequestInPeriod(request: AppointmentRequest, startsAt?: Date, endsAt?: Date) {
  const scheduleDate = requestScheduledDate(request);
  if (!scheduleDate) {
    return false;
  }
  if (startsAt && scheduleDate < startsAt) {
    return false;
  }
  if (endsAt && scheduleDate > endsAt) {
    return false;
  }
  return true;
}

export function statusCounts(requests: AppointmentRequest[]) {
  return requests.reduce<Record<AppointmentStatus, number>>(
    (accumulator, request) => ({
      ...accumulator,
      [request.status]: accumulator[request.status] + 1
    }),
    {
      approved: 0,
      cancelled: 0,
      completed: 0,
      in_progress: 0,
      pending: 0,
      quote_sent: 0,
      rejected: 0,
      under_review: 0
    }
  );
}

export function estimatedRevenue(requests: AppointmentRequest[]) {
  return requests.reduce((total, request) => {
    const estimatedPrice = Number(request.estimatedPrice ?? 0);
    return total + (Number.isFinite(estimatedPrice) ? estimatedPrice : 0);
  }, 0);
}

export function completedRevenue(requests: AppointmentRequest[]) {
  return estimatedRevenue(requests.filter((request) => request.status === "completed"));
}

export function averageTicket(requests: AppointmentRequest[]) {
  const pricedRequests = requests.filter((request) => {
    const estimatedPrice = Number(request.estimatedPrice ?? 0);
    return Number.isFinite(estimatedPrice) && estimatedPrice > 0;
  });
  if (!pricedRequests.length) {
    return 0;
  }
  return estimatedRevenue(pricedRequests) / pricedRequests.length;
}

export function completionRate(requests: AppointmentRequest[]) {
  const finishedRequests = requests.filter((request) =>
    ["completed", "cancelled", "rejected"].includes(request.status)
  );
  if (!finishedRequests.length) {
    return 0;
  }
  const completed = finishedRequests.filter((request) => request.status === "completed").length;
  return Math.round((completed / finishedRequests.length) * 100);
}

export function cancellationRate(requests: AppointmentRequest[]) {
  const decidedRequests = requests.filter((request) =>
    ["completed", "cancelled", "rejected"].includes(request.status)
  );
  if (!decidedRequests.length) {
    return 0;
  }
  const cancelled = decidedRequests.filter((request) =>
    ["cancelled", "rejected"].includes(request.status)
  ).length;
  return Math.round((cancelled / decidedRequests.length) * 100);
}

export function currentMonthRequests(requests: AppointmentRequest[]) {
  const now = new Date();
  const startsAt = new Date(now.getFullYear(), now.getMonth(), 1);
  const endsAt = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return requests.filter((request) => isRequestInPeriod(request, startsAt, endsAt));
}

export function mostRequestedServices(requests: AppointmentRequest[]) {
  const counts = requests.reduce<Record<string, number>>((accumulator, request) => {
    accumulator[request.serviceName] = (accumulator[request.serviceName] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([serviceName, total]) => ({ serviceName, total }))
    .sort((left, right) => right.total - left.total);
}

export function busiestHours(requests: AppointmentRequest[]) {
  const counts = requests.reduce<Record<string, number>>((accumulator, request) => {
    const scheduleDate = requestScheduledDate(request);
    if (!scheduleDate) {
      return accumulator;
    }
    const hour = `${String(scheduleDate.getHours()).padStart(2, "0")}:00`;
    accumulator[hour] = (accumulator[hour] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([hour, total]) => ({ hour, total }))
    .sort((left, right) => right.total - left.total);
}

export function upcomingRequests(requests: AppointmentRequest[], limit = 5) {
  const now = new Date();
  return requests
    .filter(isActiveRequest)
    .map((request) => ({ request, date: requestScheduledDate(request) }))
    .filter((item) => item.date && item.date >= now)
    .sort((left, right) => left.date!.getTime() - right.date!.getTime())
    .slice(0, limit)
    .map((item) => item.request);
}

export function operationalAlerts(requests: AppointmentRequest[]) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const overduePending = requests.filter((request) => {
    const scheduleDate = requestScheduledDate(request);
    return Boolean(
      scheduleDate &&
        scheduleDate <= tomorrow &&
        ["pending", "under_review", "quote_sent"].includes(request.status)
    );
  }).length;

  return {
    approvedWithoutBudget: requests.filter(
      (request) => request.status === "approved" && !request.estimatedPrice
    ).length,
    dueTomorrow: requests.filter((request) => {
      const scheduleDate = requestScheduledDate(request);
      return Boolean(scheduleDate && isActiveRequest(request) && scheduleDate <= tomorrow);
    }).length,
    withoutBudget: requests.filter(
      (request) => isActiveRequest(request) && !request.estimatedPrice
    ).length,
    withImage: requests.filter((request) => request.imageUrls.length > 0).length,
    overduePending,
    rescheduled: requests.filter(isRescheduledRequest).length
  };
}
