import {
  addAdminRequestComment,
  blockAdminSlot,
  createAdminService,
  deactivateAdminService,
  fetchAdminRequests,
  fetchServices,
  hasAdminSession,
  releaseAdminSlot,
  rescheduleAdminRequest,
  submitAppointmentRequest,
  updateAdminRequestEstimate,
  updateAdminRequestStatus,
  updateAdminService,
  uploadRequestImage
} from "@/services/api";
import type { AppointmentRequest, AppointmentStatus, Service, TimeSlot } from "@/types/domain";

export type NewAppointmentRequest = Omit<AppointmentRequest, "id" | "status"> & {
  serviceId?: number;
  slotId?: number;
};

export async function loadAtelierSnapshot() {
  const [services, requests] = await Promise.all([
    fetchServices(),
    hasAdminSession() ? fetchAdminRequests() : Promise.resolve([])
  ]);

  return {
    services,
    requests,
    blockedSlotIds: []
  };
}

export async function createRemoteRequest(request: NewAppointmentRequest) {
  if (!request.serviceId || !request.slotId) {
    throw new Error("Pedido sem identificadores remotos de serviço ou horário.");
  }

  const createdRequest = await submitAppointmentRequest({
    client: {
      name: request.clientName,
      phone: request.clientPhone
    },
    serviceId: request.serviceId,
    serviceName: request.serviceName,
    slotId: request.slotId,
    slotKey: request.slotKey,
    slotLabel: request.slotLabel,
    notes: request.notes
  });

  if (!request.imageUrls.length) {
    return createdRequest;
  }

  const uploadedUrls = await Promise.all(
    request.imageUrls.map((imageUri) => uploadRequestImage(createdRequest.id, imageUri))
  );

  return {
    ...createdRequest,
    imageUrls: uploadedUrls
  };
}

export async function updateRemoteRequestStatus(
  requestId: number,
  status: AppointmentStatus,
  options?: { comment?: string; estimatedPrice?: number }
) {
  await updateAdminRequestStatus(requestId, status, options);
}

export async function addRemoteRequestComment(requestId: number, comment: string) {
  return addAdminRequestComment(requestId, comment);
}

export async function updateRemoteRequestEstimate(
  requestId: number,
  estimatedPrice: number,
  comment?: string
) {
  return updateAdminRequestEstimate(requestId, estimatedPrice, comment);
}

export async function rescheduleRemoteRequest(requestId: number, slotId: number, comment?: string) {
  return rescheduleAdminRequest(requestId, slotId, comment);
}

export async function createRemoteService(service: Omit<Service, "id">) {
  return createAdminService(service);
}

export async function updateRemoteService(service: Service) {
  return updateAdminService(service);
}

export async function deactivateRemoteService(serviceId: number) {
  await deactivateAdminService(serviceId);
}

export async function blockRemoteSlot(slot: TimeSlot) {
  await blockAdminSlot({
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    reason: "Bloqueio administrativo"
  });
}

export async function releaseRemoteSlot(slot: TimeSlot) {
  await releaseAdminSlot({
    startsAt: slot.startsAt,
    endsAt: slot.endsAt
  });
}
