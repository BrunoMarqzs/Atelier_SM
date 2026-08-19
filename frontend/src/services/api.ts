import type {
  AppointmentRequest,
  AppointmentStatus,
  Announcement,
  AuditLog,
  NotificationItem,
  RequestTimelineEvent,
  ScheduleConfig,
  ScheduleException,
  Service,
  TimeSlot
} from "@/types/domain";
import { formatSlotDateTime, formatSlotTime, slotKeyFromStart } from "@/utils/scheduleRules";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

let accessToken: string | undefined;
let refreshToken: string | undefined;

type BackendService = {
  id: number;
  name: string;
  description: string;
  category: string;
  duration_minutes: number;
  price_type: "fixed" | "quote";
  fixed_price: string | number | null;
  highlighted: boolean;
};

type BackendAnnouncement = {
  id: number;
  title: string;
  body: string;
  kind: Announcement["kind"];
  cta_label?: string | null;
  cta_action: Announcement["ctaAction"];
  cta_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type BackendSlot = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: TimeSlot["status"];
};

type BackendTimelineEvent = {
  id: number;
  from_status?: AppointmentStatus | null;
  to_status: AppointmentStatus;
  comment?: string | null;
  changed_by: string;
  created_at: string;
};

type BackendRequest = {
  id: number;
  public_code?: string;
  public_url?: string;
  client_id: number;
  service_id: number;
  slot_id: number;
  status: AppointmentRequest["status"];
  notes?: string;
  admin_comment?: string;
  estimated_price?: string | number | null;
  images?: Array<{ url: string; thumbnail_url?: string | null }>;
  status_history?: BackendTimelineEvent[];
  client?: {
    name: string;
    phone: string;
  };
  service?: {
    name: string;
  };
  slot?: {
    starts_at: string;
    id: number;
  };
};

type BackendAuditLog = {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  changed_by: string;
  request_id?: number | null;
  before_snapshot?: Record<string, unknown> | null;
  after_snapshot?: Record<string, unknown> | null;
  created_at: string;
};

type BackendNotification = {
  id: number;
  event_type: string;
  channel: string;
  recipient_type: string;
  recipient?: string | null;
  title: string;
  message: string;
  request_id?: number | null;
  read_at?: string | null;
  created_at: string;
};

type BackendScheduleConfig = {
  id: number;
  opening_time: string;
  closing_time: string;
  lunch_block_hours: number[];
  weekly_hours: Record<string, number[]>;
};

type BackendScheduleException = {
  id: number;
  exception_date: string;
  kind: "closed" | "special_hours";
  hours?: number[] | null;
  reason?: string | null;
};

type AuthResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

function setSession(tokens: AuthResponse) {
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token;
}

export function hasAdminSession() {
  return Boolean(accessToken);
}

function adminHeaders(extra?: Record<string, string>) {
  if (!accessToken) {
    throw new Error("Sessão administrativa não iniciada.");
  }
  return {
    ...extra,
    Authorization: `Bearer ${accessToken}`
  };
}

async function apiErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { detail?: unknown };
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      const messages = data.detail
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            return String(item.msg);
          }
          return undefined;
        })
        .filter(Boolean);
      if (messages.length) {
        return messages.join(" ");
      }
    }
  } catch {
    return fallback;
  }
  return fallback;
}

function mapService(service: BackendService): Service {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    category: service.category,
    durationMinutes: service.duration_minutes,
    priceType: service.price_type,
    fixedPrice: service.fixed_price ? Number(service.fixed_price) : undefined,
    highlighted: service.highlighted
  };
}

function mapAnnouncement(announcement: BackendAnnouncement): Announcement {
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    kind: announcement.kind,
    ctaLabel: announcement.cta_label ?? undefined,
    ctaAction: announcement.cta_action,
    ctaUrl: announcement.cta_url ?? undefined,
    startsAt: announcement.starts_at ?? undefined,
    endsAt: announcement.ends_at ?? undefined,
    priority: announcement.priority,
    isActive: announcement.is_active,
    createdAt: announcement.created_at,
    updatedAt: announcement.updated_at
  };
}

function mapSlot(slot: BackendSlot): TimeSlot {
  return {
    id: slot.id,
    startsAt: slot.starts_at,
    endsAt: slot.ends_at,
    label: formatSlotTime(slot.starts_at),
    slotKey: slotKeyFromStart(slot.starts_at),
    available: slot.status === "available",
    status: slot.status
  };
}

function mapTimeline(event: BackendTimelineEvent): RequestTimelineEvent {
  return {
    id: event.id,
    fromStatus: event.from_status ?? undefined,
    toStatus: event.to_status,
    comment: event.comment ?? undefined,
    changedBy: event.changed_by,
    createdAt: event.created_at
  };
}

function mapAuditLog(log: BackendAuditLog): AuditLog {
  return {
    id: log.id,
    entityType: log.entity_type,
    entityId: log.entity_id,
    action: log.action,
    changedBy: log.changed_by,
    requestId: log.request_id ?? undefined,
    beforeSnapshot: log.before_snapshot ?? undefined,
    afterSnapshot: log.after_snapshot ?? undefined,
    createdAt: log.created_at
  };
}

function mapNotification(notification: BackendNotification): NotificationItem {
  return {
    id: notification.id,
    eventType: notification.event_type,
    channel: notification.channel,
    recipientType: notification.recipient_type,
    recipient: notification.recipient ?? undefined,
    title: notification.title,
    message: notification.message,
    requestId: notification.request_id ?? undefined,
    readAt: notification.read_at ?? undefined,
    createdAt: notification.created_at
  };
}

function mapOptionalMoney(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function normalizeImageUrl(url: string | null | undefined) {
  if (!url) {
    return "";
  }
  if (url.startsWith("/")) {
    return `${API_ORIGIN}${url}`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return `${API_ORIGIN}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return url;
  }
  return url;
}

function mapScheduleConfig(config: BackendScheduleConfig): ScheduleConfig {
  return {
    id: config.id,
    openingTime: config.opening_time,
    closingTime: config.closing_time,
    lunchBlockHours: config.lunch_block_hours,
    weeklyHours: config.weekly_hours
  };
}

function mapScheduleException(exception: BackendScheduleException): ScheduleException {
  return {
    id: exception.id,
    exceptionDate: exception.exception_date,
    kind: exception.kind,
    hours: exception.hours ?? undefined,
    reason: exception.reason ?? undefined
  };
}

function mapRequest(request: BackendRequest): AppointmentRequest {
  return {
    id: request.id,
    publicCode: request.public_code,
    publicUrl: request.public_url,
    clientName: request.client?.name ?? `Cliente #${request.client_id}`,
    clientPhone: request.client?.phone ?? "Telefone não carregado",
    serviceName: request.service?.name ?? `Serviço #${request.service_id}`,
    slotLabel: request.slot?.starts_at
      ? formatSlotDateTime(request.slot.starts_at)
      : `Horário #${request.slot_id}`,
    slotKey: request.slot?.starts_at ? slotKeyFromStart(request.slot.starts_at) : `api-${request.slot_id}`,
    status: request.status,
    notes: request.notes,
    adminComment: request.admin_comment,
    imageUrls: request.images?.map((image) => normalizeImageUrl(image.url)).filter(Boolean) ?? [],
    estimatedPrice: mapOptionalMoney(request.estimated_price),
    timeline: request.status_history?.map(mapTimeline) ?? []
  };
}

export async function loginAdmin(payload: { email: string; password: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("E-mail ou senha inválidos.");
  }
  setSession((await response.json()) as AuthResponse);
}

export async function refreshAdminSession() {
  if (!refreshToken) {
    throw new Error("Refresh token não disponível.");
  }
  const response = await fetch(`${API_BASE_URL}/auth/admin/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!response.ok) {
    accessToken = undefined;
    refreshToken = undefined;
    throw new Error("Sessão expirada.");
  }
  setSession((await response.json()) as AuthResponse);
}

export async function logoutAdmin() {
  if (!refreshToken) {
    accessToken = undefined;
    return;
  }
  await fetch(`${API_BASE_URL}/auth/admin/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  accessToken = undefined;
  refreshToken = undefined;
}

export async function fetchServices(): Promise<Service[]> {
  const response = await fetch(`${API_BASE_URL}/services`);
  if (!response.ok) {
    throw new Error("Não foi possível carregar os serviços.");
  }
  const data = (await response.json()) as BackendService[];
  return data.map(mapService);
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const response = await fetch(`${API_BASE_URL}/announcements`);
  if (!response.ok) {
    throw new Error("Não foi possível carregar a vitrine do atelier.");
  }
  const data = (await response.json()) as BackendAnnouncement[];
  return data.map(mapAnnouncement);
}

export async function fetchAvailability(startsAt: string, endsAt: string): Promise<TimeSlot[]> {
  const params = new URLSearchParams({ starts_at: startsAt, ends_at: endsAt });
  const response = await fetch(`${API_BASE_URL}/availability?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Não foi possível carregar a agenda.");
  }
  const data = (await response.json()) as BackendSlot[];
  return data.map(mapSlot);
}

export async function fetchAdminAvailability(startsAt: string, endsAt: string): Promise<TimeSlot[]> {
  const params = new URLSearchParams({ starts_at: startsAt, ends_at: endsAt });
  const response = await fetch(`${API_BASE_URL}/admin/availability?${params.toString()}`, {
    headers: adminHeaders()
  });
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível carregar a agenda administrativa."));
  }
  const data = (await response.json()) as BackendSlot[];
  return data.map(mapSlot);
}

export async function submitAppointmentRequest(payload: {
  client: { name: string; phone: string };
  serviceId: number;
  slotId: number;
  serviceName?: string;
  slotLabel?: string;
  slotKey?: string;
  notes?: string;
}): Promise<AppointmentRequest> {
  const response = await fetch(`${API_BASE_URL}/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client: payload.client,
      service_id: payload.serviceId,
      slot_id: payload.slotId,
      notes: payload.notes,
      image_urls: []
    })
  });

  if (!response.ok) {
    throw new Error("Não foi possível confirmar a solicitação.");
  }

  const data = (await response.json()) as {
    id: number;
    public_code?: string;
    public_url?: string;
    status: AppointmentRequest["status"];
    notes?: string;
    estimated_price?: string | number | null;
  };

  return {
    id: data.id,
    publicCode: data.public_code,
    publicUrl: data.public_url,
    clientName: payload.client.name,
    clientPhone: payload.client.phone,
    serviceName: payload.serviceName ?? "Serviço selecionado",
    slotLabel: payload.slotLabel ?? "Horário selecionado",
    slotKey: payload.slotKey ?? `slot-${payload.slotId}`,
    status: data.status,
    notes: data.notes,
    imageUrls: [],
    estimatedPrice: mapOptionalMoney(data.estimated_price)
  };
}

export async function fetchAdminRequests(filters?: {
  status?: AppointmentStatus;
  clientName?: string;
  phone?: string;
}): Promise<AppointmentRequest[]> {
  const params = new URLSearchParams();
  if (filters?.status) {
    params.set("status", filters.status);
  }
  if (filters?.clientName) {
    params.set("client_name", filters.clientName);
  }
  if (filters?.phone) {
    params.set("phone", filters.phone);
  }
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/admin/requests${query ? `?${query}` : ""}`, {
    headers: adminHeaders()
  });
  if (!response.ok) {
    throw new Error("Não foi possível carregar os pedidos administrativos.");
  }

  const data = (await response.json()) as BackendRequest[];
  return data.map(mapRequest);
}

export async function fetchAdminAnnouncements(): Promise<Announcement[]> {
  const response = await fetch(`${API_BASE_URL}/admin/announcements`, {
    headers: adminHeaders()
  });
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível carregar os anúncios."));
  }
  const data = (await response.json()) as BackendAnnouncement[];
  return data.map(mapAnnouncement);
}

export async function createAdminAnnouncement(
  announcement: Omit<Announcement, "id" | "createdAt" | "updatedAt">
): Promise<Announcement> {
  const response = await fetch(`${API_BASE_URL}/admin/announcements`, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      title: announcement.title,
      body: announcement.body,
      kind: announcement.kind,
      cta_label: announcement.ctaLabel ?? null,
      cta_action: announcement.ctaAction,
      cta_url: announcement.ctaUrl ?? null,
      starts_at: announcement.startsAt ?? null,
      ends_at: announcement.endsAt ?? null,
      priority: announcement.priority,
      is_active: announcement.isActive
    })
  });
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível criar o anúncio."));
  }
  return mapAnnouncement((await response.json()) as BackendAnnouncement);
}

export async function updateAdminAnnouncement(announcement: Announcement): Promise<Announcement> {
  const response = await fetch(`${API_BASE_URL}/admin/announcements/${announcement.id}`, {
    method: "PATCH",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      title: announcement.title,
      body: announcement.body,
      kind: announcement.kind,
      cta_label: announcement.ctaLabel ?? null,
      cta_action: announcement.ctaAction,
      cta_url: announcement.ctaUrl ?? null,
      starts_at: announcement.startsAt ?? null,
      ends_at: announcement.endsAt ?? null,
      priority: announcement.priority,
      is_active: announcement.isActive
    })
  });
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível atualizar o anúncio."));
  }
  return mapAnnouncement((await response.json()) as BackendAnnouncement);
}

export async function deactivateAdminAnnouncement(announcementId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/announcements/${announcementId}`, {
    method: "DELETE",
    headers: adminHeaders()
  });
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível desativar o anúncio."));
  }
}

export async function fetchAdminAuditLogs(options?: { requestId?: number; limit?: number }): Promise<AuditLog[]> {
  const params = new URLSearchParams();
  if (options?.requestId) {
    params.set("request_id", String(options.requestId));
  }
  if (options?.limit) {
    params.set("limit", String(options.limit));
  }
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/admin/audit${query ? `?${query}` : ""}`, {
    headers: adminHeaders()
  });
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível carregar a auditoria."));
  }

  const data = (await response.json()) as BackendAuditLog[];
  return data.map(mapAuditLog);
}

export async function fetchAdminNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationItem[]> {
  const params = new URLSearchParams();
  if (options?.unreadOnly) {
    params.set("unread_only", "true");
  }
  if (options?.limit) {
    params.set("limit", String(options.limit));
  }
  const query = params.toString();
  const response = await fetch(`${API_BASE_URL}/admin/notifications${query ? `?${query}` : ""}`, {
    headers: adminHeaders()
  });
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível carregar notificações."));
  }

  const data = (await response.json()) as BackendNotification[];
  return data.map(mapNotification);
}

export async function markAdminNotificationRead(notificationId: number): Promise<NotificationItem> {
  const response = await fetch(`${API_BASE_URL}/admin/notifications/${notificationId}/read`, {
    method: "POST",
    headers: adminHeaders()
  });
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível marcar a notificação como lida."));
  }
  return mapNotification((await response.json()) as BackendNotification);
}

export async function fetchAdminScheduleConfig(): Promise<ScheduleConfig> {
  const response = await fetch(`${API_BASE_URL}/admin/schedule/config`, {
    headers: adminHeaders()
  });
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível carregar as regras da agenda."));
  }
  return mapScheduleConfig((await response.json()) as BackendScheduleConfig);
}

export async function fetchAdminScheduleExceptions(): Promise<ScheduleException[]> {
  const response = await fetch(`${API_BASE_URL}/admin/schedule/exceptions`, {
    headers: adminHeaders()
  });
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível carregar exceções da agenda."));
  }
  const data = (await response.json()) as BackendScheduleException[];
  return data.map(mapScheduleException);
}

export async function saveAdminScheduleException(payload: {
  exceptionDate: string;
  kind: ScheduleException["kind"];
  hours?: number[];
  reason?: string;
}): Promise<ScheduleException> {
  const response = await fetch(`${API_BASE_URL}/admin/schedule/exceptions`, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      exception_date: payload.exceptionDate,
      kind: payload.kind,
      hours: payload.hours,
      reason: payload.reason
    })
  });
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível salvar a exceção da agenda."));
  }
  return mapScheduleException((await response.json()) as BackendScheduleException);
}

export async function deleteAdminScheduleException(exceptionId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/schedule/exceptions/${exceptionId}`, {
    method: "DELETE",
    headers: adminHeaders()
  });
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível remover a exceção da agenda."));
  }
}

export async function fetchClientRequestHistory(phone: string): Promise<AppointmentRequest[]> {
  const params = new URLSearchParams({ phone });
  const response = await fetch(`${API_BASE_URL}/requests/history?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Não foi possível carregar o histórico de pedidos.");
  }

  const data = (await response.json()) as BackendRequest[];
  return data.map(mapRequest);
}

export async function fetchPublicRequest(publicCode: string): Promise<AppointmentRequest> {
  const response = await fetch(`${API_BASE_URL}/requests/public/${encodeURIComponent(publicCode)}`);
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível carregar o pedido público."));
  }

  return mapRequest((await response.json()) as BackendRequest);
}

export async function updateAdminRequestStatus(
  requestId: number,
  status: AppointmentStatus,
  options?: { comment?: string; estimatedPrice?: number }
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/requests/${requestId}/status`, {
    method: "PATCH",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      status,
      comment: options?.comment,
      estimated_price: options?.estimatedPrice
    })
  });
  if (!response.ok) {
    throw new Error(await apiErrorMessage(response, "Não foi possível atualizar o status do pedido."));
  }
}

export async function addAdminRequestComment(requestId: number, comment: string): Promise<AppointmentRequest> {
  const response = await fetch(`${API_BASE_URL}/admin/requests/${requestId}/comments`, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ comment })
  });
  if (!response.ok) {
    throw new Error("Não foi possível salvar o comentário.");
  }
  return mapRequest((await response.json()) as BackendRequest);
}

export async function updateAdminRequestEstimate(
  requestId: number,
  estimatedPrice: number,
  comment?: string
): Promise<AppointmentRequest> {
  const response = await fetch(`${API_BASE_URL}/admin/requests/${requestId}/estimate`, {
    method: "PATCH",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ estimated_price: estimatedPrice, comment })
  });
  if (!response.ok) {
    throw new Error("Não foi possível salvar o orçamento.");
  }
  return mapRequest((await response.json()) as BackendRequest);
}

export async function rescheduleAdminRequest(
  requestId: number,
  slotId: number,
  comment?: string
): Promise<AppointmentRequest> {
  const response = await fetch(`${API_BASE_URL}/admin/requests/${requestId}/reschedule`, {
    method: "PATCH",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ slot_id: slotId, comment })
  });
  if (!response.ok) {
    throw new Error("Não foi possível remarcar o pedido.");
  }
  return mapRequest((await response.json()) as BackendRequest);
}

export async function rescheduleClientRequest(
  requestId: number,
  phone: string,
  slotId: number,
  comment?: string
): Promise<AppointmentRequest> {
  const response = await fetch(`${API_BASE_URL}/requests/${requestId}/reschedule`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, slot_id: slotId, comment })
  });
  if (!response.ok) {
    throw new Error("Não foi possível remarcar o pedido.");
  }
  return mapRequest((await response.json()) as BackendRequest);
}

export async function createAdminService(service: Omit<Service, "id">): Promise<Service> {
  const response = await fetch(`${API_BASE_URL}/admin/services`, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      name: service.name,
      description: service.description,
      category: service.category,
      duration_minutes: service.durationMinutes,
      price_type: service.priceType,
      fixed_price: service.fixedPrice ?? null,
      highlighted: service.highlighted,
      is_active: true
    })
  });
  if (!response.ok) {
    throw new Error("Não foi possível criar o serviço.");
  }
  return mapService((await response.json()) as BackendService);
}

export async function updateAdminService(service: Service): Promise<Service> {
  const response = await fetch(`${API_BASE_URL}/admin/services/${service.id}`, {
    method: "PATCH",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      name: service.name,
      description: service.description,
      category: service.category,
      duration_minutes: service.durationMinutes,
      price_type: service.priceType,
      fixed_price: service.fixedPrice ?? null,
      highlighted: service.highlighted,
      is_active: true
    })
  });
  if (!response.ok) {
    throw new Error("Não foi possível atualizar o serviço.");
  }
  return mapService((await response.json()) as BackendService);
}

export async function deactivateAdminService(serviceId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/services/${serviceId}`, {
    method: "DELETE",
    headers: adminHeaders()
  });
  if (!response.ok) {
    throw new Error("Não foi possível remover o serviço.");
  }
}

export async function blockAdminSlot(payload: {
  startsAt: string;
  endsAt: string;
  reason: string;
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/availability/block`, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      starts_at: payload.startsAt,
      ends_at: payload.endsAt,
      reason: payload.reason
    })
  });
  if (!response.ok) {
    throw new Error("Não foi possível bloquear o horário.");
  }
}

export async function releaseAdminSlot(payload: { startsAt: string; endsAt: string }): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/availability/release`, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      starts_at: payload.startsAt,
      ends_at: payload.endsAt
    })
  });
  if (!response.ok) {
    throw new Error("Não foi possível liberar o horário.");
  }
}

export async function uploadRequestImage(requestId: number, imageUri: string): Promise<string> {
  const formData = new FormData();
  const fileName = imageUri.split("/").pop()?.split("?")[0] || `pedido-${requestId}.jpg`;
  const extension = fileName.split(".").pop()?.toLowerCase();
  const type = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";

  if (imageUri.startsWith("data:") || imageUri.startsWith("blob:")) {
    const blob = await fetch(imageUri).then((response) => response.blob());
    formData.append("file", blob, fileName);
  } else {
    formData.append("file", {
      uri: imageUri,
      name: fileName,
      type
    } as unknown as Blob);
  }

  const response = await fetch(`${API_BASE_URL}/requests/${requestId}/images`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    throw new Error("Não foi possível enviar a imagem.");
  }
  const data = (await response.json()) as { url: string; thumbnail_url?: string | null };
  return normalizeImageUrl(data.thumbnail_url ?? data.url);
}

