export type PriceType = "fixed" | "quote";

export type AppointmentStatus =
  | "pending"
  | "under_review"
  | "quote_sent"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled";

export type Service = {
  id: number;
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  priceType: PriceType;
  fixedPrice?: number;
  highlighted: boolean;
};

export type TimeSlot = {
  id: number;
  startsAt: string;
  endsAt: string;
  label: string;
  slotKey: string;
  available: boolean;
  status: "available" | "booked" | "blocked";
  requestId?: number;
};

export type ClientIdentity = {
  name: string;
  phone: string;
};

export type AppointmentRequest = {
  id: number;
  publicCode?: string;
  publicUrl?: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  slotLabel: string;
  slotKey: string;
  status: AppointmentStatus;
  notes?: string;
  adminComment?: string;
  imageUrls: string[];
  estimatedPrice?: number;
  timeline?: RequestTimelineEvent[];
};

export type PaymentStatus = "pending" | "waiting_payment" | "paid" | "expired" | "refunded" | "failed";

export type Payment = {
  id: number;
  orderId: number;
  provider: "mock";
  method: "pix";
  status: PaymentStatus;
  amount: number;
  pixQrCode?: string;
  pixCopyPaste?: string;
  externalPaymentId?: string;
  paidAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type RequestTimelineEvent = {
  id: number;
  fromStatus?: AppointmentStatus;
  toStatus: AppointmentStatus;
  comment?: string;
  changedBy: string;
  createdAt: string;
};

export type AuditLog = {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  changedBy: string;
  requestId?: number;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  createdAt: string;
};

export type NotificationItem = {
  id: number;
  eventType: string;
  channel: string;
  recipientType: string;
  recipient?: string;
  title: string;
  message: string;
  requestId?: number;
  readAt?: string;
  createdAt: string;
};

export type ScheduleConfig = {
  id: number;
  openingTime: string;
  closingTime: string;
  lunchBlockHours: number[];
  weeklyHours: Record<string, number[]>;
};

export type ScheduleException = {
  id: number;
  exceptionDate: string;
  kind: "closed" | "special_hours";
  hours?: number[];
  reason?: string;
};
