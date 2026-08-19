import { useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { FadeInView } from "@/animations/FadeInView";
import { TimeSlotPill } from "@/components/booking/TimeSlotPill";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { useAtelier } from "@/context/AtelierContext";
import { useBooking } from "@/context/BookingContext";
import { fetchAvailability } from "@/services/api";
import { theme } from "@/theme";
import type { TimeSlot } from "@/types/domain";
import type { ClientStackParamList } from "@/types/navigation";
import { buildCalendarDays, formatSelectedDay, toLocalDateTimeInput } from "@/utils/calendar";

type Props = NativeStackScreenProps<ClientStackParamList, "Schedule">;

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

export function ScheduleScreen({ navigation }: Props) {
  const booking = useBooking();
  const atelier = useAtelier();
  const [selectedDayId, setSelectedDayId] = useState(calendarDays[0].id);
  const [remoteSlots, setRemoteSlots] = useState<TimeSlot[]>([]);
  const [agendaError, setAgendaError] = useState<string>();
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const selectedDay = calendarDays.find((day) => day.id === selectedDayId) ?? calendarDays[0];
  const slots = useMemo(
    () =>
      [...remoteSlots].sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()).map((slot) => {
        const request = atelier.requests.find((item) => item.slotKey === slot.slotKey);
        const status: TimeSlot["status"] = request ? "booked" : slot.status;
        return {
          ...slot,
          status,
          available: status === "available",
          requestId: request?.id
        };
      }),
    [atelier.requests, remoteSlots]
  );

  useEffect(() => {
    if (!booking.service) {
      navigation.replace("ServiceSelection");
    }
  }, [booking.service, navigation]);

  useEffect(() => {
    if (!booking.service) {
      setRemoteSlots([]);
      setLoadingSlots(false);
      return;
    }
    const range = dayRange(selectedDay.date);
    setAgendaError(undefined);
    setLoadingSlots(true);
    void fetchAvailability(range.startsAt, range.endsAt)
      .then((loadedSlots) => {
        setRemoteSlots(loadedSlots);
      })
      .catch(() => {
        setRemoteSlots([]);
        setAgendaError("Não foi possível conectar à agenda agora. Tente novamente em alguns instantes.");
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [booking.service, reloadToken, selectedDay]);

  function continueFlow() {
    if (!booking.slot?.available) {
      return;
    }
    navigation.navigate("RequestDetails");
  }

  return (
    <Screen>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        subtitle="Agende com antecedência: o calendário mostra os próximos 6 meses."
        title="Escolha o horário"
      />
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
                booking.setSlot(undefined);
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
      <Text style={styles.selectedDate}>{formatSelectedDay(selectedDay)}</Text>
      {agendaError ? <Notice message={agendaError} title="Agenda indisponível" tone="danger" /> : null}
      {loadingSlots ? (
        <LoadingState
          message="Estamos consultando a disponibilidade atualizada do atelier. No primeiro acesso, isso pode levar alguns segundos."
          title="Buscando horários"
        />
      ) : null}
      {!loadingSlots && slots.length === 0 ? (
        <EmptyState
          icon="calendar-clear-outline"
          message="Neste dia não estaremos aceitando agendamentos. Marque para um próximo dia."
          title="Horários bloqueados pelo administrador"
        >
          <PremiumButton
            icon="refresh-outline"
            label="Tentar novamente"
            onPress={() => setReloadToken((current) => current + 1)}
            variant="secondary"
          />
        </EmptyState>
      ) : null}
      {!loadingSlots && slots.length > 0 ? (
        <View style={styles.slots}>
          {slots.map((slot, index) => (
            <FadeInView delay={index * 35} key={slot.id}>
              <TimeSlotPill
                onPress={() => booking.setSlot(slot)}
                selected={booking.slot?.id === slot.id}
                slot={slot}
              />
            </FadeInView>
          ))}
        </View>
      ) : null}
      <PremiumButton
        disabled={!booking.slot?.available || loadingSlots}
        icon="create-outline"
        label="Continuar solicitação"
        onPress={continueFlow}
        style={styles.action}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  calendar: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm
  },
  day: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
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
  selectedDate: {
    ...theme.typography.section,
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm
  },
  slots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    marginTop: theme.spacing.md
  },
  action: {
    marginTop: theme.spacing.lg
  }
});
