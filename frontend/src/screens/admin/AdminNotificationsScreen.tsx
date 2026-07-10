import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
import { friendlyErrorMessage } from "@/utils/errors";

export function AdminNotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotifications() {
    setLoading(true);
    setError("");
    try {
      setNotifications(await fetchAdminNotifications({ limit: 100 }));
    } catch (caughtError) {
      setError(friendlyErrorMessage(caughtError, "Não foi possível carregar notificações."));
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

  return (
    <Screen>
      <ScreenHeader
        subtitle={`${unreadCount} aviso(s) aguardando leitura.`}
        title="Notificações"
      />
      <PremiumButton icon="refresh-outline" label="Atualizar notificações" onPress={() => void loadNotifications()} variant="secondary" />
      {loading ? <LoadingState compact message="Buscando eventos recentes do atelier." title="Carregando avisos" /> : null}
      {error ? <Notice message={error} title="Notificações indisponíveis" tone="danger" /> : null}
      <View style={styles.list}>
        {notifications.length > 0 ? (
          notifications.map((notification) => (
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
          <EmptyState
            icon="notifications-outline"
            message="Pedidos, orçamentos, aprovações e remarcações aparecerão aqui quando houver novidades."
            title="Nenhuma notificação"
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
