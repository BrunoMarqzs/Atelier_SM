import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { AdminInsightCard } from "@/components/admin/AdminInsightCard";
import { AdminMetric } from "@/components/admin/AdminMetric";
import { EmptyState } from "@/components/common/EmptyState";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { useAtelier } from "@/context/AtelierContext";
import { theme } from "@/theme";
import type { AppointmentRequest } from "@/types/domain";
import {
  averageTicket,
  busiestHours,
  cancellationRate,
  completedRevenue,
  completionRate,
  estimatedRevenue,
  formatMoney,
  mostRequestedServices,
  statusCounts
} from "@/utils/adminAnalytics";
import { exportRequestsReport } from "@/utils/reportExport";

type ReportPeriod = "all" | "month" | "completed";

function filterByPeriod(requests: AppointmentRequest[], period: ReportPeriod) {
  if (period === "all") {
    return requests;
  }
  if (period === "completed") {
    return requests.filter((request) => request.status === "completed");
  }

  const now = new Date();
  const start = new Date(now);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return requests.filter((request) => {
    const match = request.slotKey.match(/^(\d{4}-\d{2}-\d{2})-(\d{2}):(\d{2})$/);
    if (!match) {
      return false;
    }
    const date = new Date(`${match[1]}T${match[2]}:${match[3]}:00`);
    return date >= start;
  });
}

export function AdminReportsScreen() {
  const { requests } = useAtelier();
  const [period, setPeriod] = useState<ReportPeriod>("all");
  const [notice, setNotice] = useState("");
  const filteredRequests = useMemo(() => filterByPeriod(requests, period), [period, requests]);
  const counts = statusCounts(filteredRequests);
  const revenue = estimatedRevenue(
    filteredRequests.filter((request) => !["cancelled", "rejected"].includes(request.status))
  );
  const realizedRevenue = completedRevenue(filteredRequests);
  const ticket = averageTicket(filteredRequests);
  const completion = completionRate(filteredRequests);
  const cancellation = cancellationRate(filteredRequests);
  const serviceRanking = mostRequestedServices(filteredRequests).slice(0, 5);
  const hourRanking = busiestHours(filteredRequests).slice(0, 5);

  function exportReport(format: "csv" | "excel" | "pdf") {
    const exported = exportRequestsReport(filteredRequests, format);
    setNotice(
      exported
        ? "Relatório gerado com os pedidos filtrados."
        : "Exportação disponível no navegador web. No celular, use a versão publicada/PWA."
    );
  }

  return (
    <Screen>
      <ScreenHeader
        subtitle="Acompanhe demanda, receita estimada e desempenho dos serviços."
        title="Relatórios"
      />
      {notice ? <Notice message={notice} title="Exportação" tone="success" /> : null}
      <PremiumSurface style={styles.section}>
        <Text style={styles.sectionTitle}>Período</Text>
        <View style={styles.filterRow}>
          {[
            { label: "Todos", value: "all" as const },
            { label: "Mês atual", value: "month" as const },
            { label: "Concluídos", value: "completed" as const }
          ].map((item) => {
            const active = period === item.value;
            return (
              <AnimatedPressable
                key={item.value}
                onPress={() => setPeriod(item.value)}
                pressedScale={0.95}
                style={[styles.filterPill, active ? styles.filterPillActive : null]}
              >
                <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{item.label}</Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </PremiumSurface>

      <View style={styles.metricsRow}>
        <AdminMetric icon="file-tray-full-outline" label="Pedidos" value={String(filteredRequests.length)} />
        <AdminMetric icon="cash-outline" label="Receita estimada" value={formatMoney(revenue)} />
      </View>
      <View style={styles.metricsRow}>
        <AdminMetric icon="checkmark-done-outline" label="Concluídos" value={String(counts.completed)} />
        <AdminMetric icon="close-circle-outline" label="Cancelados" value={String(counts.cancelled + counts.rejected)} />
      </View>

      <PremiumSurface style={styles.section}>
        <Text style={styles.sectionTitle}>Produtividade</Text>
        <View style={styles.metricsRow}>
          <AdminMetric icon="wallet-outline" label="Receita concluída" value={formatMoney(realizedRevenue)} />
          <AdminMetric icon="pricetag-outline" label="Ticket médio" value={formatMoney(ticket)} />
        </View>
        <View style={styles.ranking}>
          <AdminInsightCard icon="checkmark-done-outline" label="Taxa de conclusão" tone="sage" value={`${completion}%`} />
          <AdminInsightCard icon="close-circle-outline" label="Cancelamento/recusa" value={`${cancellation}%`} />
        </View>
      </PremiumSurface>

      <PremiumSurface style={styles.section}>
        <Text style={styles.sectionTitle}>Exportar</Text>
        <View style={styles.actions}>
          <PremiumButton icon="document-text-outline" label="CSV" onPress={() => exportReport("csv")} variant="secondary" />
          <PremiumButton icon="grid-outline" label="Excel" onPress={() => exportReport("excel")} variant="secondary" />
          <PremiumButton icon="print-outline" label="PDF" onPress={() => exportReport("pdf")} />
        </View>
      </PremiumSurface>

      <PremiumSurface style={styles.section}>
        <Text style={styles.sectionTitle}>Serviços mais solicitados</Text>
        {serviceRanking.length ? (
          <View style={styles.ranking}>
            {serviceRanking.map((item) => (
              <AdminInsightCard
                icon="cut-outline"
                key={item.serviceName}
                label={item.serviceName}
                value={`${item.total} pedido(s)`}
              />
            ))}
          </View>
        ) : (
          <EmptyState icon="analytics-outline" message="Os serviços aparecerão quando houver pedidos." title="Sem dados" />
        )}
      </PremiumSurface>

      <PremiumSurface style={styles.section}>
        <Text style={styles.sectionTitle}>Horários mais ocupados</Text>
        {hourRanking.length ? (
          <View style={styles.ranking}>
            {hourRanking.map((item) => (
              <AdminInsightCard
                icon="time-outline"
                key={item.hour}
                label={item.hour}
                tone="sage"
                value={`${item.total} pedido(s)`}
              />
            ))}
          </View>
        ) : (
          <EmptyState icon="time-outline" message="Os horários aparecerão quando houver agenda." title="Sem dados" />
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  filterPill: {
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    minHeight: 38,
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
  metricsRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  actions: {
    gap: theme.spacing.sm
  },
  ranking: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md
  }
});
