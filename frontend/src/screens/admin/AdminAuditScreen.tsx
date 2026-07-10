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
import { fetchAdminAuditLogs } from "@/services/api";
import { theme } from "@/theme";
import type { AuditLog } from "@/types/domain";
import { friendlyErrorMessage } from "@/utils/errors";

const actionLabels: Record<string, string> = {
  created: "Pedido criado",
  status_changed: "Status alterado",
  estimate_updated: "Orçamento alterado",
  comment_added: "Comentário adicionado",
  rescheduled: "Horário remarcado"
};

export function AdminAuditScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAudit() {
    setLoading(true);
    setError("");
    try {
      setLogs(await fetchAdminAuditLogs({ limit: 120 }));
    } catch (caughtError) {
      setLogs([]);
      setError(friendlyErrorMessage(caughtError, "Não foi possível carregar a auditoria."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAudit();
  }, []);

  return (
    <Screen>
      <ScreenHeader subtitle="Registro técnico das alterações críticas do sistema." title="Auditoria" />
      <PremiumButton icon="refresh-outline" label="Atualizar histórico" onPress={() => void loadAudit()} variant="secondary" />
      {loading ? <LoadingState compact message="Lendo alterações recentes do atelier." title="Carregando auditoria" /> : null}
      {error ? <Notice message={error} title="Auditoria indisponível" tone="danger" /> : null}

      <View style={styles.list}>
        {logs.length > 0 ? (
          logs.map((log) => <AuditCard key={log.id} log={log} />)
        ) : (
          <EmptyState
            icon="shield-checkmark-outline"
            message="As próximas ações administrativas aparecerão aqui com data, responsável e alterações realizadas."
            title="Sem registros de auditoria"
          />
        )}
      </View>
    </Screen>
  );
}

function AuditCard({ log }: { log: AuditLog }) {
  const beforeStatus = String(log.beforeSnapshot?.status ?? "-");
  const afterStatus = String(log.afterSnapshot?.status ?? "-");
  const beforePrice = String(log.beforeSnapshot?.estimated_price ?? "-");
  const afterPrice = String(log.afterSnapshot?.estimated_price ?? "-");

  return (
    <PremiumSurface style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons color={theme.colors.roseGoldDark} name="shield-checkmark-outline" size={18} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{actionLabels[log.action] ?? log.action}</Text>
          <Text style={styles.meta}>
            Pedido #{log.requestId ?? log.entityId} · {log.changedBy} · {new Date(log.createdAt).toLocaleString("pt-BR")}
          </Text>
        </View>
      </View>
      <View style={styles.diffRow}>
        <Text style={styles.diffText}>Status: {beforeStatus} → {afterStatus}</Text>
        <Text style={styles.diffText}>Orçamento: {beforePrice} → {afterPrice}</Text>
      </View>
    </PremiumSurface>
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
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.champagneSoft,
    borderRadius: theme.radius.pill,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  titleBlock: {
    flex: 1
  },
  title: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.taupe,
    marginTop: 2
  },
  diffRow: {
    backgroundColor: theme.colors.porcelain,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.xxs,
    padding: theme.spacing.md
  },
  diffText: {
    ...theme.typography.caption,
    color: theme.colors.graphite
  }
});
