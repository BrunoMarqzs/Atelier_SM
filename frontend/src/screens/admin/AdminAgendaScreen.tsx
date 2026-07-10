import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { WhatsAppNotifyButton } from "@/components/admin/WhatsAppNotifyButton";
import { TimeSlotPill } from "@/components/booking/TimeSlotPill";
import { EmptyState } from "@/components/common/EmptyState";
import { ImagePreview } from "@/components/common/ImagePreview";
import { LoadingState } from "@/components/common/LoadingState";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAtelier } from "@/context/AtelierContext";
import { fetchAvailability } from "@/services/api";
import { theme } from "@/theme";
import type { TimeSlot } from "@/types/domain";
import { buildCalendarDays, formatSelectedDay, toLocalDateTimeInput } from "@/utils/calendar";

const calendarDays = buildCalendarDays(6);
type AgendaView = "day" | "week" | "month";

function startOfWeek(date: Date) {
  const start = new Date(date);
  const weekday = start.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  start.setDate(start.getDate() - daysFromMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfWeek(date: Date) {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function startOfMonth(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfMonth(date: Date) {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return end;
}

function viewDateWindow(date: Date, view: AgendaView) {
  if (view === "week") {
    return {
      startsAt: startOfWeek(date),
      endsAt: endOfWeek(date)
    };
  }
  if (view === "month") {
    return {
      startsAt: startOfMonth(date),
      endsAt: endOfMonth(date)
    };
  }
  const startsAt = new Date(date);
  startsAt.setHours(0, 0, 0, 0);
  const endsAt = new Date(date);
  endsAt.setHours(23, 59, 59, 999);
  return { startsAt, endsAt };
}

function viewRange(date: Date, view: AgendaView) {
  const range = viewDateWindow(date, view);
  return {
    startsAt: toLocalDateTimeInput(range.startsAt),
    endsAt: toLocalDateTimeInput(range.endsAt)
  };
}

export function AdminAgendaScreen() {
  const atelier = useAtelier();
  const [selectedDayId, setSelectedDayId] = useState(calendarDays[0].id);
  const [viewMode, setViewMode] = useState<AgendaView>("day");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | undefined>();
  const [remoteSlots, setRemoteSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [agendaError, setAgendaError] = useState<string>();
  const [blocking, setBlocking] = useState(false);
  const selectedDay = calendarDays.find((day) => day.id === selectedDayId) ?? calendarDays[0];
  const visibleDays = useMemo(() => {
    if (viewMode === "day") {
      return [selectedDay];
    }
    const range = viewDateWindow(selectedDay.date, viewMode);
    return calendarDays.filter((day) => day.date >= range.startsAt && day.date <= range.endsAt);
  }, [selectedDay, viewMode]);
  const slots = useMemo(
    () =>
      [...remoteSlots]
        .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
        .filter((slot) => slot.slotKey.startsWith(`${selectedDay.id}-`))
        .map((slot) => {
          const request = atelier.requests.find((item) => item.slotKey === slot.slotKey);
          const status: TimeSlot["status"] = request ? "booked" : slot.status;
          return {
            ...slot,
            status,
            available: status === "available",
            requestId: request?.id
          };
        }),
    [atelier.requests, remoteSlots, selectedDay.id]
  );
  const rangeSummary = useMemo(
    () =>
      visibleDays.map((day) => {
        const daySlots = remoteSlots.filter((slot) => slot.slotKey.startsWith(`${day.id}-`));
        const booked = daySlots.filter((slot) => atelier.requests.some((request) => request.slotKey === slot.slotKey)).length;
        const blocked = daySlots.filter((slot) => slot.status === "blocked").length;
        const waiting = atelier.requests.filter(
          (request) => request.slotKey.startsWith(`${day.id}-`) && ["pending", "under_review", "quote_sent"].includes(request.status)
        ).length;
        return {
          day,
          free: Math.max(daySlots.length - booked - blocked, 0),
          booked,
          blocked,
          waiting
        };
      }),
    [atelier.requests, remoteSlots, visibleDays]
  );
  const selectedRequest = atelier.requests.find((request) => request.id === selectedSlot?.requestId);
  const availableSlots = slots.filter((slot) => slot.status === "available").length;
  const bookedSlots = slots.filter((slot) => slot.status === "booked").length;
  const blockedSlots = slots.filter((slot) => slot.status === "blocked").length;

  async function loadSlots() {
    const range = viewRange(selectedDay.date, viewMode);
    setAgendaError(undefined);
    setLoadingSlots(true);
    try {
      const loadedSlots = await fetchAvailability(range.startsAt, range.endsAt);
      setRemoteSlots(loadedSlots);
    } catch {
      setRemoteSlots([]);
      setAgendaError("Não foi possível conectar à agenda agora. Tente novamente em alguns instantes.");
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    void loadSlots();
  }, [selectedDay, viewMode]);

  async function toggleBlockSelectedSlot() {
    if (!selectedSlot || selectedSlot.status === "booked") {
      return;
    }
    setBlocking(true);
    setAgendaError(undefined);
    try {
      await atelier.toggleSlotBlock(selectedSlot);
      setSelectedSlot(undefined);
      await loadSlots();
    } catch {
      setAgendaError("Não foi possível salvar esta alteração agora. Confira a conexão e tente novamente.");
    } finally {
      setBlocking(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader subtitle="Controle disponibilidade, bloqueios e horários reservados." title="Agenda" />
      <View style={styles.viewSwitch}>
        {[
          { label: "Dia", value: "day" as const },
          { label: "Semana", value: "week" as const },
          { label: "Mês", value: "month" as const }
        ].map((item) => {
          const active = viewMode === item.value;
          return (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={item.value}
              onPress={() => {
                setViewMode(item.value);
                setSelectedSlot(undefined);
              }}
              pressedScale={0.96}
              style={[styles.viewPill, active ? styles.viewPillActive : null]}
            >
              <Text style={[styles.viewText, active ? styles.viewTextActive : null]}>{item.label}</Text>
            </AnimatedPressable>
          );
        })}
      </View>
      <ScrollView
        contentContainerStyle={styles.calendar}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {calendarDays.map((day) => {
          const active = selectedDayId === day.id;
          return (
            <AnimatedPressable
              accessibilityLabel={`Selecionar ${day.weekday}, dia ${day.day} de ${day.month}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={day.id}
              onPress={() => {
                setSelectedDayId(day.id);
                setSelectedSlot(undefined);
              }}
              pressedScale={0.96}
              style={[styles.day, active ? styles.dayActive : null]}
            >
              <Text style={[styles.weekday, active ? styles.dayLabelActive : null]}>{day.weekday}</Text>
              <Text style={[styles.dayNumber, active ? styles.dayLabelActive : null]}>{day.day}</Text>
              <Text style={[styles.month, active ? styles.dayLabelActive : null]}>{day.month}</Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      {viewMode !== "day" ? (
        <PremiumSurface style={styles.rangePanel}>
          <Text style={styles.rangeTitle}>{viewMode === "week" ? "Visão semanal" : "Visão mensal"}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.rangeCards}>
              {rangeSummary.map((item) => (
                <AnimatedPressable
                  key={item.day.id}
                  onPress={() => {
                    setSelectedDayId(item.day.id);
                    setSelectedSlot(undefined);
                  }}
                  pressedScale={0.97}
                  style={[styles.rangeCard, selectedDayId === item.day.id ? styles.rangeCardActive : null]}
                >
                  <Text style={styles.rangeDay}>{item.day.day}/{item.day.month}</Text>
                  <Text style={styles.rangeMetric}>{item.free} livres</Text>
                  <Text style={styles.rangeMeta}>{item.booked} reservados · {item.blocked} bloqueados</Text>
                  {item.waiting ? <Text style={styles.rangeWarning}>{item.waiting} aguardando avaliação</Text> : null}
                </AnimatedPressable>
              ))}
            </View>
          </ScrollView>
        </PremiumSurface>
      ) : null}

      <PremiumSurface style={styles.panel}>
        <View style={styles.daySummaryHeader}>
          <View>
            <Text style={styles.date}>{formatSelectedDay(selectedDay)}</Text>
            <Text style={styles.summaryCaption}>Visão operacional do dia selecionado</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue}>{availableSlots}</Text>
            <Text style={styles.summaryLabel}>Livres</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue}>{bookedSlots}</Text>
            <Text style={styles.summaryLabel}>Reservados</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue}>{blockedSlots}</Text>
            <Text style={styles.summaryLabel}>Bloqueados</Text>
          </View>
        </View>
        {agendaError ? <Notice message={agendaError} title="Agenda indisponível" tone="danger" /> : null}
        {loadingSlots ? (
          <LoadingState
            compact
            message="Atualizando horários, bloqueios e reservas. No primeiro acesso, isso pode levar alguns segundos."
            title="Sincronizando agenda"
          />
        ) : null}
        {!loadingSlots && slots.length === 0 ? (
          <EmptyState
            icon="calendar-clear-outline"
            message="Não há horários para este recorte. Tente outra data, mude a visão ou atualize a agenda."
            title="Nenhum horário disponível"
          >
            <PremiumButton
              icon="refresh-outline"
              label="Atualizar agenda"
              onPress={() => void loadSlots()}
              variant="secondary"
            />
          </EmptyState>
        ) : null}
        {!loadingSlots && slots.length > 0 ? (
          <View style={styles.slots}>
            {slots.map((slot) => (
              <TimeSlotPill
                allowUnavailablePress
                key={slot.id}
                onPress={() => setSelectedSlot(slot)}
                selected={selectedSlot?.id === slot.id}
                slot={slot}
              />
            ))}
          </View>
        ) : null}
      </PremiumSurface>

      <PremiumSurface elevated style={styles.detailPanel}>
        {selectedSlot ? (
          <>
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.detailTitle}>{selectedSlot.label}</Text>
                <Text style={styles.detailSubtitle}>
                  {selectedSlot.status === "available"
                    ? "Horário livre"
                    : selectedSlot.status === "blocked"
                      ? "Horário bloqueado"
                      : "Horário reservado"}
                </Text>
              </View>
              {selectedRequest ? <StatusBadge status={selectedRequest.status} /> : null}
            </View>

            {selectedRequest ? (
              <View style={styles.clientBlock}>
                <Text style={styles.clientName}>{selectedRequest.clientName}</Text>
                <Text style={styles.clientMeta}>{selectedRequest.clientPhone}</Text>
                <Text style={styles.clientMeta}>{selectedRequest.serviceName}</Text>
                {selectedRequest.notes ? <Text style={styles.notes}>{selectedRequest.notes}</Text> : null}
                {selectedRequest.imageUrls[0] ? (
                  <ImagePreview height={190} uri={selectedRequest.imageUrls[0]} />
                ) : (
                  <EmptyState
                    icon="image-outline"
                    message="O horário possui pedido, mas sem referência visual anexada."
                    title="Sem imagem"
                  />
                )}
                <WhatsAppNotifyButton request={selectedRequest} />
              </View>
            ) : (
              <Text style={styles.emptyText}>
                {selectedSlot.status === "blocked"
                  ? "Este horário está bloqueado para atendimento. Você pode liberá-lo se a agenda mudar."
                  : "Nenhum pedido marcado neste horário."}
              </Text>
            )}

            {selectedSlot.status !== "booked" ? (
              <PremiumButton
                disabled={blocking}
                icon={selectedSlot.status === "blocked" ? "lock-open-outline" : "ban-outline"}
                label={
                  blocking
                    ? "Sincronizando..."
                    : selectedSlot.status === "blocked"
                      ? "Liberar horário"
                      : "Bloquear horário"
                }
                onPress={toggleBlockSelectedSlot}
                variant="secondary"
              />
            ) : null}
          </>
        ) : (
          <EmptyState
            icon="calendar-outline"
            message="Toque em um horário para ver reserva, cliente, imagem ou alterar disponibilidade."
            title="Selecione um horário"
          />
        )}
      </PremiumSurface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  viewSwitch: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md
  },
  viewPill: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm
  },
  viewPillActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink
  },
  viewText: {
    ...theme.typography.caption,
    color: theme.colors.graphite,
    fontWeight: "800"
  },
  viewTextActive: {
    color: theme.colors.white
  },
  calendar: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md
  },
  day: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 76,
    width: 68,
    ...theme.shadows.soft
  },
  dayActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink,
    ...theme.shadows.button
  },
  weekday: {
    ...theme.typography.caption,
    color: theme.colors.graphite,
    fontWeight: "700"
  },
  dayNumber: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  month: {
    ...theme.typography.caption,
    color: theme.colors.taupe,
    textTransform: "uppercase"
  },
  dayLabelActive: {
    color: theme.colors.white
  },
  rangePanel: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  rangeTitle: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  rangeCards: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  rangeCard: {
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 2,
    minHeight: 104,
    padding: theme.spacing.sm,
    width: 150
  },
  rangeCardActive: {
    borderColor: theme.colors.roseGoldDark,
    backgroundColor: theme.colors.champagneSoft
  },
  rangeDay: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  rangeMetric: {
    ...theme.typography.body,
    color: theme.colors.ink,
    fontWeight: "800"
  },
  rangeMeta: {
    ...theme.typography.caption,
    color: theme.colors.graphite
  },
  rangeWarning: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontWeight: "800"
  },
  panel: {
    gap: theme.spacing.lg
  },
  date: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  daySummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  summaryCaption: {
    ...theme.typography.caption,
    color: theme.colors.taupe,
    marginTop: 2
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  summaryChip: {
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    minWidth: 94,
    padding: theme.spacing.sm
  },
  summaryValue: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  summaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.taupe
  },
  slots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    justifyContent: "space-between"
  },
  detailPanel: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg
  },
  detailHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.md,
    justifyContent: "space-between"
  },
  detailTitle: {
    ...theme.typography.title,
    color: theme.colors.ink
  },
  detailSubtitle: {
    ...theme.typography.body,
    color: theme.colors.taupe
  },
  clientBlock: {
    gap: theme.spacing.xs
  },
  clientName: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  clientMeta: {
    ...theme.typography.body,
    color: theme.colors.graphite
  },
  notes: {
    ...theme.typography.body,
    color: theme.colors.taupe,
    marginTop: theme.spacing.xs
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.taupe
  }
});
