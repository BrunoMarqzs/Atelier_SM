import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { fetchAdminNotifications, markAdminNotificationRead } from "@/services/api";
import { theme } from "@/theme";
import type { NotificationItem } from "@/types/domain";

type NotificationFilter = "all" | "unread" | "critical" | "payments" | "schedule";

const FILTERS: Array<{ label: string; value: NotificationFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Não lidos", value: "unread" },
  { label: "Críticos", value: "critical" },
  { label: "Pagamentos", value: "payments" },
  { label: "Agenda", value: "schedule" }
];

function notificationText(item: NotificationItem) {
  return `${item.eventType} ${item.title} ${item.message}`.toLowerCase();
}

function isCriticalNotification(item: NotificationItem) {
  const text = notificationText(item);
  return ["expired", "expirado", "pendente", "overdue", "atras", "recus", "cancel"].some((term) =>
    text.includes(term)
  );
}

function isPaymentNotification(item: NotificationItem) {
  const text = notificationText(item);
  return ["payment", "pagamento", "pix", "orçamento", "orcamento"].some((term) => text.includes(term));
}

function isScheduleNotification(item: NotificationItem) {
  const text = notificationText(item);
  return ["schedule", "agenda", "remarc", "horário", "horario"].some((term) => text.includes(term));
}

function emptyMessage(filter: NotificationFilter) {
  if (filter === "unread") {
    return "Todos os avisos já foram lidos.";
  }
  if (filter === "critical") {
    return "Nenhum evento crítico apareceu até agora.";
  }
  if (filter === "payments") {
    return "Avisos de Pix, orçamento e pagamento aparecerão aqui.";
  }
  if (filter === "schedule") {
    return "Remarcações e mudanças de agenda aparecerão aqui.";
  }
  return "Pedidos, orçamentos, aprovações e remarcações aparecerão aqui.";
}

export function AdminNotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<NotificationFilter>("all");

  async function loadNotifications() {
    setLoading(true);
    setError("");
    try {
      setNotifications(await fetchAdminNotifications({ limit: 100 }));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível carregar notificações.");
    } finally {
      setLoading(false);
    }
  }

  async function markRead(notificationId: number) {
    const updated = await markAdminNotificationRead(notificationId);
    setNotifications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const criticalCount = notifications.filter(isCriticalNotification).length;
  const paymentCount = notifications.filter(isPaymentNotification).length;
  const scheduleCount = notifications.filter(isScheduleNotification).length;
  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((item) => !item.readAt);
    }
    if (filter === "critical") {
      return notifications.filter(isCriticalNotification);
    }
    if (filter === "payments") {
      return notifications.filter(isPaymentNotification);
    }
    if (filter === "schedule") {
      return notifications.filter(isScheduleNotification);
    }
    return notifications;
  }, [filter, notifications]);

  return (
    <Screen>
      <ScreenHeader
        subtitle={`${unreadCount} aviso(s) aguardando leitura.`}
        title="Avisos"
      />
      <PremiumButton
        icon="refresh-outline"
        label="Atualizar avisos"
        onPress={() => void loadNotifications()}
        variant="secondary"
      />
      {loading ? <LoadingState compact message="Buscando eventos do atelier." title="Carregando avisos" /> : null}
      {error ? <Notice message={error} title="Avisos indisponíveis" tone="danger" /> : null}

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{unreadCount}</Text>
          <Text style={styles.summaryLabel}>Não lidos</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{criticalCount}</Text>
          <Text style={styles.summaryLabel}>Críticos</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{paymentCount}</Text>
          <Text style={styles.summaryLabel}>Pagamentos</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{scheduleCount}</Text>
          <Text style={styles.summaryLabel}>Agenda</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = filter === item.value;
          return (
            <AnimatedPressable
              key={item.value}
              onPress={() => setFilter(item.value)}
              pressedScale={0.96}
              style={[styles.filterPill, active ? styles.filterPillActive : null]}
            >
              <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{item.label}</Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={styles.list}>
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <PremiumSurface key={notification.id} style={notification.readAt ? styles.readCard : styles.card}>
              <View style={styles.header}>
                <View style={styles.icon}>
                  <Ionicons
                    color={notification.readAt ? theme.colors.taupe : theme.colors.roseGoldDark}
                    name={notification.readAt ? "checkmark-circle-outline" : "notifications-outline"}
                    size={20}
                  />
                </View>
                <View style={styles.content}>
                  <Text style={styles.title}>{notification.title}</Text>
                  <Text style={styles.message}>{notification.message}</Text>
                  <Text style={styles.meta}>
                    {notification.requestId ? `Pedido #${notification.requestId} · ` : ""}
                    {new Date(notification.createdAt).toLocaleString("pt-BR")}
                  </Text>
                </View>
              </View>
              {!notification.readAt ? (
                <PremiumButton
                  icon="checkmark-outline"
                  label="Marcar como lida"
                  onPress={() => void markRead(notification.id)}
                  variant="secondary"
                />
              ) : null}
            </PremiumSurface>
          ))
        ) : (
          <EmptyState icon="notifications-outline" message={emptyMessage(filter)} title="Nenhum aviso neste filtro" />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md
  },
  summaryCard: {
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 132,
    padding: theme.spacing.md,
    ...theme.shadows.soft
  },
  summaryValue: {
    ...theme.typography.title,
    color: theme.colors.ink
  },
  summaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.graphite,
    fontWeight: "700"
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md
  },
  filterPill: {
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    ...theme.shadows.soft
  },
  filterPillActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink,
    ...theme.shadows.button
  },
  filterText: {
    ...theme.typography.caption,
    color: theme.colors.graphite,
    fontWeight: "700"
  },
  filterTextActive: {
    color: theme.colors.white
  },
  list: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md
  },
  card: {
    gap: theme.spacing.md
  },
  readCard: {
    gap: theme.spacing.md,
    opacity: 0.72
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  icon: {
    alignItems: "center",
    backgroundColor: theme.colors.champagneSoft,
    borderRadius: theme.radius.pill,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  content: {
    flex: 1,
    gap: theme.spacing.xxs
  },
  title: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.graphite
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.taupe
  }
});
