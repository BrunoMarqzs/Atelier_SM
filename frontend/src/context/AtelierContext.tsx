import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  addRemoteRequestComment,
  blockRemoteSlot,
  createRemoteAnnouncement,
  createRemoteRequest,
  createRemoteService,
  deactivateRemoteAnnouncement,
  deactivateRemoteService,
  loadAtelierSnapshot,
  type NewAppointmentRequest,
  releaseRemoteSlot,
  rescheduleRemoteRequest,
  updateRemoteRequestEstimate,
  updateRemoteRequestStatus,
  updateRemoteAnnouncement,
  updateRemoteService
} from "@/services/atelierRepository";
import type { AppointmentRequest, AppointmentStatus, Announcement, Service, TimeSlot } from "@/types/domain";

type AtelierState = {
  announcements: Announcement[];
  blockedSlotIds: string[];
  error?: string;
  loading: boolean;
  requests: AppointmentRequest[];
  services: Service[];
  addRequest: (request: NewAppointmentRequest) => Promise<AppointmentRequest>;
  addRequestComment: (requestId: number, comment: string) => Promise<void>;
  createAnnouncement: (
    announcement: Omit<Announcement, "id" | "createdAt" | "updatedAt">
  ) => Promise<Announcement>;
  createService: (service: Omit<Service, "id">) => Promise<Service>;
  deactivateAnnouncement: (announcementId: number) => Promise<void>;
  deactivateService: (serviceId: number) => Promise<void>;
  refresh: () => Promise<void>;
  rescheduleRequest: (requestId: number, slotId: number, comment?: string) => Promise<void>;
  toggleSlotBlock: (slot: TimeSlot) => Promise<void>;
  updateRequestEstimate: (requestId: number, estimatedPrice: number, comment?: string) => Promise<void>;
  updateRequestStatus: (
    requestId: number,
    status: AppointmentStatus,
    options?: { comment?: string; estimatedPrice?: number }
  ) => Promise<void>;
  updateAnnouncement: (announcement: Announcement) => Promise<void>;
  updateService: (service: Service) => Promise<void>;
};

const AtelierContext = createContext<AtelierState | undefined>(undefined);

export function AtelierProvider({ children }: PropsWithChildren) {
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [blockedSlotIds, setBlockedSlotIds] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const snapshot = await loadAtelierSnapshot();
      setAnnouncements(snapshot.announcements);
      setServices(snapshot.services);
      setRequests(snapshot.requests);
      setBlockedSlotIds(snapshot.blockedSlotIds);
    } catch {
      setError("Não foi possível sincronizar com o backend. Verifique se a API está rodando.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AtelierState>(
    () => ({
      announcements,
      requests,
      blockedSlotIds,
      error,
      loading,
      services,
      addRequest: async (request) => {
        setError(undefined);
        try {
          const created = await createRemoteRequest(request);
          setRequests((current) => [created, ...current.filter((item) => item.id !== created.id)]);
          await refresh();
          return created;
        } catch (caughtError) {
          setError("Não foi possível confirmar a solicitação no backend.");
          throw caughtError;
        }
      },
      createService: async (service) => {
        setError(undefined);
        const created = await createRemoteService(service);
        setServices((current) => [created, ...current.filter((item) => item.id !== created.id)]);
        await refresh();
        return created;
      },
      createAnnouncement: async (announcement) => {
        setError(undefined);
        const created = await createRemoteAnnouncement(announcement);
        setAnnouncements((current) => [created, ...current.filter((item) => item.id !== created.id)]);
        await refresh();
        return created;
      },
      addRequestComment: async (requestId, comment) => {
        setError(undefined);
        const updated = await addRemoteRequestComment(requestId, comment);
        setRequests((current) => current.map((request) => (request.id === requestId ? updated : request)));
      },
      deactivateService: async (serviceId) => {
        setError(undefined);
        await deactivateRemoteService(serviceId);
        setServices((current) => current.filter((service) => service.id !== serviceId));
        await refresh();
      },
      deactivateAnnouncement: async (announcementId) => {
        setError(undefined);
        await deactivateRemoteAnnouncement(announcementId);
        setAnnouncements((current) => current.filter((announcement) => announcement.id !== announcementId));
        await refresh();
      },
      refresh,
      rescheduleRequest: async (requestId, slotId, comment) => {
        setError(undefined);
        const updated = await rescheduleRemoteRequest(requestId, slotId, comment);
        setRequests((current) => current.map((request) => (request.id === requestId ? updated : request)));
        await refresh();
      },
      toggleSlotBlock: async (slot) => {
        setError(undefined);
        if (blockedSlotIds.includes(slot.slotKey)) {
          await releaseRemoteSlot(slot);
        } else {
          await blockRemoteSlot(slot);
        }
        await refresh();
      },
      updateRequestEstimate: async (requestId, estimatedPrice, comment) => {
        setError(undefined);
        const updated = await updateRemoteRequestEstimate(requestId, estimatedPrice, comment);
        setRequests((current) => current.map((request) => (request.id === requestId ? updated : request)));
      },
      updateRequestStatus: async (requestId, status, options) => {
        setError(undefined);
        await updateRemoteRequestStatus(requestId, status, options);
        await refresh();
      },
      updateAnnouncement: async (announcement) => {
        setError(undefined);
        const updated = await updateRemoteAnnouncement(announcement);
        setAnnouncements((current) => current.map((item) => (item.id === announcement.id ? updated : item)));
        await refresh();
      },
      updateService: async (service) => {
        setError(undefined);
        const updated = await updateRemoteService(service);
        setServices((current) => current.map((item) => (item.id === service.id ? updated : item)));
      }
    }),
    [announcements, blockedSlotIds, error, loading, refresh, requests, services]
  );

  return <AtelierContext.Provider value={value}>{children}</AtelierContext.Provider>;
}

export function useAtelier() {
  const context = useContext(AtelierContext);
  if (!context) {
    throw new Error("useAtelier deve ser usado dentro de AtelierProvider.");
  }
  return context;
}
