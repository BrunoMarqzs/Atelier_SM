import type { AppointmentRequest } from "@/types/domain";

const DEFAULT_PUBLIC_BASE_URL = "https://atelier-sm.vercel.app";

export function normalizeBrazilianWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  return undefined;
}

export function publicRequestUrl(request: AppointmentRequest) {
  if (request.publicUrl) {
    return request.publicUrl;
  }
  if (request.publicCode) {
    return `${DEFAULT_PUBLIC_BASE_URL}/pedido/${request.publicCode}`;
  }
  return DEFAULT_PUBLIC_BASE_URL;
}

export function buildWhatsAppNotificationMessage(request: AppointmentRequest) {
  const firstName = request.clientName.trim().split(/\s+/)[0] || "cliente";
  const link = publicRequestUrl(request);

  const lines = [
    `Olá, ${firstName}! Seu pedido no Atelier Sibele Marques recebeu uma atualização.`,
    "",
    "Para visualizar os detalhes, acompanhar o status e consultar as informações do atendimento, acesse:",
    link,
    "",
    "Atelier Sibele Marques - Um toque de classe"
  ];

  return lines.join("\n");
}

export function buildWhatsAppUrl(request: AppointmentRequest) {
  const phone = normalizeBrazilianWhatsAppPhone(request.clientPhone);
  if (!phone) {
    return undefined;
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppNotificationMessage(request))}`;
}
