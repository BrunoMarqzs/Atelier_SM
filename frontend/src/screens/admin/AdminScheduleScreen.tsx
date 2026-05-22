import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { ElegantInput } from "@/components/common/ElegantInput";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import {
  deleteAdminScheduleException,
  fetchAdminScheduleConfig,
  fetchAdminScheduleExceptions,
  saveAdminScheduleException
} from "@/services/api";
import { theme } from "@/theme";
import type { ScheduleConfig, ScheduleException } from "@/types/domain";

const weekdayLabels: Record<string, string> = {
  "0": "Segunda",
  "1": "Terça",
  "2": "Quarta",
  "3": "Quinta",
  "4": "Sexta",
  "5": "Sábado",
  "6": "Domingo"
};

function parseHours(value: string) {
  return value
    .split(",")
    .map((item) => Number(item.trim().replace(":00", "")))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 23);
}

function formatHours(hours?: number[]) {
  if (!hours?.length) {
    return "Sem horários";
  }
  return hours.map((hour) => `${String(hour).padStart(2, "0")}:00`).join(", ");
}

export function AdminScheduleScreen() {
  const [config, setConfig] = useState<ScheduleConfig>();
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("");
  const [kind, setKind] = useState<ScheduleException["kind"]>("closed");

  async function loadSchedule() {
    setLoading(true);
    setError("");
    try {
      const [loadedConfig, loadedExceptions] = await Promise.all([
        fetchAdminScheduleConfig(),
        fetchAdminScheduleExceptions()
      ]);
      setConfig(loadedConfig);
      setExceptions(loadedExceptions);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível carregar a agenda.");
    } finally {
      setLoading(false);
    }
  }

  async function saveException() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const saved = await saveAdminScheduleException({
        exceptionDate: date,
        kind,
        hours: kind === "special_hours" ? parseHours(hours) : undefined,
        reason: reason || undefined
      });
      setExceptions((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setDate("");
      setReason("");
      setHours("");
      setKind("closed");
      setSuccess("Exceção de agenda salva com sucesso.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível salvar a exceção.");
    } finally {
      setSaving(false);
    }
  }

  async function removeException(exceptionId: number) {
    setError("");
    setSuccess("");
    await deleteAdminScheduleException(exceptionId);
    setExceptions((current) => current.filter((item) => item.id !== exceptionId));
    setSuccess("Exceção removida.");
  }

  useEffect(() => {
    void loadSchedule();
  }, []);

  const weeklyHours = useMemo(() => Object.entries(config?.weeklyHours ?? {}), [config]);

  return (
    <Screen>
      <ScreenHeader
        subtitle="Configure funcionamento, feriados, férias e datas especiais sem mudar código."
        title="Regras da agenda"
      />

      {loading ? <LoadingState compact message="Carregando política de horários." title="Sincronizando regras" /> : null}
      {error ? <Notice message={error} title="Agenda não sincronizada" tone="danger" /> : null}
      {success ? <Notice message={success} title="Agenda atualizada" tone="success" /> : null}

      {config ? (
        <PremiumSurface style={styles.section}>
          <Text style={styles.sectionTitle}>Funcionamento padrão</Text>
          <Text style={styles.caption}>
            Janela geral: {config.openingTime} às {config.closingTime} · almoço bloqueado: {formatHours(config.lunchBlockHours)}
          </Text>
          <View style={styles.weekGrid}>
            {weeklyHours.map(([day, dayHours]) => (
              <View key={day} style={styles.weekCard}>
                <Text style={styles.weekDay}>{weekdayLabels[day]}</Text>
                <Text style={styles.hours}>{formatHours(dayHours)}</Text>
              </View>
            ))}
          </View>
        </PremiumSurface>
      ) : null}

      <PremiumSurface style={styles.section}>
        <Text style={styles.sectionTitle}>Feriados e exceções</Text>
        <View style={styles.kindRow}>
          {[
            { label: "Fechado", value: "closed" as const },
            { label: "Horário especial", value: "special_hours" as const }
          ].map((item) => {
            const active = kind === item.value;
            return (
              <AnimatedPressable
                key={item.value}
                onPress={() => setKind(item.value)}
                pressedScale={0.97}
                style={[styles.kindPill, active ? styles.kindPillActive : null]}
              >
                <Text style={[styles.kindText, active ? styles.kindTextActive : null]}>{item.label}</Text>
              </AnimatedPressable>
            );
          })}
        </View>
        <ElegantInput
          label="Data"
          onChangeText={setDate}
          placeholder="2026-12-24"
          value={date}
        />
        {kind === "special_hours" ? (
          <ElegantInput
            label="Horários"
            onChangeText={setHours}
            placeholder="08, 09, 10, 14"
            value={hours}
          />
        ) : null}
        <ElegantInput
          label="Motivo"
          onChangeText={setReason}
          placeholder="Feriado, férias, evento especial..."
          value={reason}
        />
        <PremiumButton
          disabled={saving || !date}
          icon="calendar-outline"
          label={saving ? "Salvando..." : "Salvar exceção"}
          onPress={() => void saveException()}
        />
      </PremiumSurface>

      <PremiumSurface style={styles.section}>
        <Text style={styles.sectionTitle}>Exceções cadastradas</Text>
        {exceptions.length ? (
          <View style={styles.exceptionList}>
            {exceptions.map((exception) => (
              <View key={exception.id} style={styles.exceptionCard}>
                <View style={styles.exceptionText}>
                  <Text style={styles.exceptionDate}>
                    {new Date(`${exception.exceptionDate}T00:00:00`).toLocaleDateString("pt-BR")}
                  </Text>
                  <Text style={styles.caption}>
                    {exception.kind === "closed" ? "Fechado" : formatHours(exception.hours)}
                    {exception.reason ? ` · ${exception.reason}` : ""}
                  </Text>
                </View>
                <PremiumButton
                  icon="trash-outline"
                  label="Remover"
                  onPress={() => void removeException(exception.id)}
                  style={styles.removeButton}
                  variant="ghost"
                />
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="calendar-clear-outline"
            message="Feriados, férias e datas especiais aparecerão aqui."
            title="Nenhuma exceção"
          />
        )}
      </PremiumSurface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg
  },
  sectionTitle: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  caption: {
    ...theme.typography.caption,
    color: theme.colors.taupe
  },
  weekGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  weekCard: {
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexGrow: 1,
    gap: 4,
    minWidth: 138,
    padding: theme.spacing.sm
  },
  weekDay: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  hours: {
    ...theme.typography.body,
    color: theme.colors.ink
  },
  kindRow: {
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  kindPill: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm
  },
  kindPillActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink
  },
  kindText: {
    ...theme.typography.caption,
    color: theme.colors.graphite,
    fontWeight: "800"
  },
  kindTextActive: {
    color: theme.colors.white
  },
  exceptionList: {
    gap: theme.spacing.sm
  },
  exceptionCard: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    padding: theme.spacing.sm
  },
  exceptionText: {
    flex: 1
  },
  exceptionDate: {
    ...theme.typography.body,
    color: theme.colors.ink,
    fontWeight: "800"
  },
  removeButton: {
    minHeight: 42,
    paddingHorizontal: theme.spacing.sm
  }
});
