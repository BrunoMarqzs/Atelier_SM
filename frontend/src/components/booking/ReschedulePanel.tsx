import { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { TimeSlotPill } from "@/components/booking/TimeSlotPill";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { fetchAvailability } from "@/services/api";
import { theme } from "@/theme";
import type { TimeSlot } from "@/types/domain";
import { buildCalendarDays, formatSelectedDay, toLocalDateTimeInput } from "@/utils/calendar";

type ReschedulePanelProps = {
  currentSlotKey?: string;
  onConfirm: (slot: TimeSlot) => Promise<void>;
};

const calendarDays = buildCalendarDays(6);

function dayRange(date: Date) {
  const startsAt = new Date(date);
  startsAt.setHours(0, 0, 0, 0);

  const endsAt = new Date(date);
  endsAt.setHours(23, 59, 59, 999);

  return {
    startsAt: toLocalDateTimeInput(startsAt),
    endsAt: toLocalDateTimeInput(endsAt)
  };
}

export function ReschedulePanel({ currentSlotKey, onConfirm }: ReschedulePanelProps) {
  const [selectedDayId, setSelectedDayId] = useState(calendarDays[0].id);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot>();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string>();
  const selectedDay = useMemo(
    () => calendarDays.find((day) => day.id === selectedDayId) ?? calendarDays[0],
    [selectedDayId]
  );
  const availableSlots = [...slots]
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
    .filter((slot) => slot.available && slot.slotKey !== currentSlotKey);

  useEffect(() => {
    const range = dayRange(selectedDay.date);
    setLoading(true);
    setError(undefined);
    setSelectedSlot(undefined);
    void fetchAvailability(range.startsAt, range.endsAt)
      .then(setSlots)
      .catch(() => {
        setSlots([]);
        setError("Não foi possível carregar horários para remarcação.");
      })
      .finally(() => setLoading(false));
  }, [selectedDay]);

  async function confirmReschedule() {
    if (!selectedSlot) {
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await onConfirm(selectedSlot);
      setSelectedSlot(undefined);
      setConfirmOpen(false);
    } catch {
      setError("Não foi possível remarcar para este horário.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PremiumSurface style={styles.panel}>
      <View>
        <Text style={styles.title}>Remarcar horário</Text>
        <Text style={styles.subtitle}>Escolha uma nova disponibilidade do atelier.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.calendar} horizontal showsHorizontalScrollIndicator={false}>
        {calendarDays.map((day) => {
          const active = selectedDayId === day.id;
          return (
            <AnimatedPressable
              accessibilityLabel={`Selecionar ${day.weekday}, dia ${day.day} de ${day.month}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={day.id}
              onPress={() => setSelectedDayId(day.id)}
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

      <Text style={styles.selectedDate}>{formatSelectedDay(selectedDay)}</Text>
      {error ? <Notice message={error} title="Remarcação indisponível" tone="danger" /> : null}
      {loading ? <LoadingState compact title="Buscando horários" /> : null}
      {!loading && availableSlots.length === 0 ? (
        <EmptyState
          icon="calendar-clear-outline"
          message="Não há horários livres nesta data. Escolha outro dia."
          title="Sem horários para remarcação"
        />
      ) : null}
      {!loading && availableSlots.length > 0 ? (
        <View style={styles.slots}>
          {availableSlots.map((slot) => (
            <TimeSlotPill
              key={slot.id}
              onPress={() => setSelectedSlot(slot)}
              selected={selectedSlot?.id === slot.id}
              slot={slot}
            />
          ))}
        </View>
      ) : null}
      <PremiumButton
        disabled={!selectedSlot || saving}
        icon="swap-horizontal-outline"
        label={saving ? "Remarcando..." : "Confirmar novo horário"}
        onPress={() => setConfirmOpen(true)}
        variant="secondary"
      />
      <Modal animationType="fade" transparent visible={confirmOpen}>
        <View style={styles.modalOverlay}>
          <PremiumSurface elevated style={styles.confirmModal}>
            <Text style={styles.confirmKicker}>Confirmar remarcação</Text>
            <Text style={styles.confirmTitle}>{selectedSlot?.label}</Text>
            <Text style={styles.confirmCopy}>
              O pedido será atualizado para o novo horário e o horário anterior ficará livre novamente.
            </Text>
            <View style={styles.confirmActions}>
              <PremiumButton
                disabled={saving}
                label="Cancelar"
                onPress={() => setConfirmOpen(false)}
                variant="secondary"
              />
              <PremiumButton
                disabled={saving}
                icon="checkmark-circle-outline"
                label={saving ? "Salvando..." : "Salvar remarcação"}
                onPress={() => void confirmReschedule()}
              />
            </View>
          </PremiumSurface>
        </View>
      </Modal>
    </PremiumSurface>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: theme.spacing.md
  },
  title: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.taupe,
    marginTop: 2
  },
  calendar: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xs
  },
  day: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 72,
    width: 64,
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
  selectedDate: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  slots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    justifyContent: "space-between"
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(31, 26, 24, 0.42)",
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.lg
  },
  confirmModal: {
    gap: theme.spacing.md,
    maxWidth: 440,
    width: "100%"
  },
  confirmKicker: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  confirmTitle: {
    ...theme.typography.title,
    color: theme.colors.ink
  },
  confirmCopy: {
    ...theme.typography.body,
    color: theme.colors.graphite
  },
  confirmActions: {
    gap: theme.spacing.sm
  }
});
