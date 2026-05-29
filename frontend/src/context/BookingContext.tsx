import { createContext, type PropsWithChildren, useContext, useMemo, useState } from "react";

import type { ClientIdentity, Service, TimeSlot } from "@/types/domain";

type BookingState = {
  client?: ClientIdentity;
  service?: Service;
  slot?: TimeSlot;
  notes: string;
  imageUris: string[];
  setClient: (client: ClientIdentity) => void;
  setService: (service: Service) => void;
  setSlot: (slot: TimeSlot | undefined) => void;
  setNotes: (notes: string) => void;
  addImageUri: (uri: string) => void;
  clearDraft: () => void;
  reset: () => void;
};

const BookingContext = createContext<BookingState | undefined>(undefined);

export function BookingProvider({ children }: PropsWithChildren) {
  const [client, setClient] = useState<ClientIdentity>();
  const [service, setService] = useState<Service>();
  const [slot, setSlot] = useState<TimeSlot>();
  const [notes, setNotes] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);

  const value = useMemo<BookingState>(
    () => ({
      client,
      service,
      slot,
      notes,
      imageUris,
      setClient,
      setService,
      setSlot,
      setNotes,
      addImageUri: (uri: string) => setImageUris((current) => [...current, uri]),
      clearDraft: () => {
        setService(undefined);
        setSlot(undefined);
        setNotes("");
        setImageUris([]);
      },
      reset: () => {
        setClient(undefined);
        setService(undefined);
        setSlot(undefined);
        setNotes("");
        setImageUris([]);
      }
    }),
    [client, imageUris, notes, service, slot]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking deve ser usado dentro de BookingProvider.");
  }
  return context;
}
