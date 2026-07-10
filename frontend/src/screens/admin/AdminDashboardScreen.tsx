import { useNavigation, type NavigationProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { AdminInsightCard } from "@/components/admin/AdminInsightCard";
import { AdminMetric } from "@/components/admin/AdminMetric";
import { RequestPreviewCard } from "@/components/admin/RequestPreviewCard";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/common/LoadingState";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { useAtelier } from "@/context/AtelierContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { theme } from "@/theme";
import type { RootStackParamList } from "@/types/navigation";
import {
  busiestHours,
  estimatedRevenue,
  formatMoney,
  operationalAlerts,
  statusCounts,
  upcomingRequests
} from "@/utils/adminAnalytics";

export function AdminDashboardScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { isCompact } = useResponsiveLayout();
  const { error, loading, requests } = useAtelier();
  const activeRequests = requests.filter((request) => !["completed", "cancelled", "rejected"].includes(request.status));
  const counts = statusCounts(requests);
  const pending = counts.pending;
  const approved = counts.approved;
  const underReview = counts.under_review;
  const inProgress = counts.in_progress;
  const completed = counts.completed;
  const needsDecision = pending + underReview;
  const nextRequests = upcomingRequests(requests, 4);
  const revenue = estimatedRevenue(
    requests.filter((request) => !["rejected", "cancelled"].includes(request.status))
  );
  const alerts = operationalAlerts(requests);
  const busiestHour = busiestHours(requests)[0]?.hour ?? "--";

  return (
    <Screen>
      <ScreenHeader title="Painel do atelier" />
      <LinearGradient
        colors={[theme.colors.ink, theme.colors.burgundy]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.adminHero}
      >
        <Text style={styles.heroEyebrow}>Operação do dia</Text>
        <Text style={styles.heroTitle}>{activeRequests.length} pedidos ativos</Text>
        <Text style={styles.heroCopy}>
          Acompanhe avaliações, aprovações, remarcações e os próximos atendimentos com clareza.
        </Text>
        <View style={styles.heroInsights}>
          <Text style={styles.heroInsight}>{needsDecision} aguardam decisão</Text>
          <Text style={styles.heroInsight}>{inProgress} em andamento</Text>
          <Text style={styles.heroInsight}>{alerts.rescheduled} remarcações</Text>
        </View>
      </LinearGradient>
      <PremiumButton
        icon="home-outline"
        label="Voltar para tela inicial"
        onPress={() => navigation.navigate("Public", { screen: "Home" })}
        style={styles.homeButton}
        variant="secondary"
      />
      {loading ? (
        <LoadingState
          compact
          message="Buscando pedidos, serviços e disponibilidade. No primeiro acesso, isso pode levar alguns segundos."
          title="Atualizando painel"
        />
      ) : null}
      {error ? <Notice message={error} tone="warning" title="Sincronização parcial" /> : null}
      {alerts.overduePending > 0 ? (
        <Notice
          message={`${alerts.overduePending} pedido(s) próximos ainda precisam de avaliação, orçamento ou aprovação.`}
          title="Alerta operacional"
          tone="warning"
        />
      ) : null}
      <View style={[styles.metricsRow, isCompact ? styles.metricsColumn : null]}>
        <AdminMetric icon="time-outline" label="Pendentes" value={String(pending)} />
        <AdminMetric icon="calendar-outline" label="Ativos" value={String(activeRequests.length)} />
      </View>
      <View style={[styles.metricsRow, isCompact ? styles.metricsColumn : null]}>
        <AdminMetric icon="sparkles-outline" label="Aprovados" value={String(approved)} />
        <AdminMetric icon="chatbubble-ellipses-outline" label="A avaliar" value={String(underReview)} />
      </View>
      <View style={[styles.metricsRow, isCompact ? styles.metricsColumn : null]}>
        <AdminMetric icon="cash-outline" label="Receita estimada" value={formatMoney(revenue)} />
        <AdminMetric icon="checkmark-done-outline" label="Concluídos" value={String(completed)} />
      </View>
      <View style={styles.insightsRow}>
        <AdminInsightCard icon="hourglass-outline" label="Decisão" value={`${needsDecision} pendente(s)`} />
        <AdminInsightCard icon="color-wand-outline" label="Produção" tone="sage" value={`${inProgress} ativo(s)`} />
        <AdminInsightCard icon="alarm-outline" label="Horário cheio" tone="ink" value={busiestHour} />
        <AdminInsightCard icon="receipt-outline" label="Sem orçamento" value={`${alerts.withoutBudget} pedido(s)`} />
      </View>
      <Text style={styles.sectionTitle}>Próximos atendimentos</Text>
      <View style={styles.list}>
        {nextRequests.length > 0 ? (
          nextRequests.map((request) => <RequestPreviewCard key={request.id} request={request} />)
        ) : (
          <EmptyState
            icon="calendar-outline"
            message="Quando houver pedidos aprovados ou em andamento, eles aparecerão aqui por ordem de data."
            title="Agenda tranquila"
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  adminHero: {
    borderRadius: theme.radius.lg,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    overflow: "hidden",
    padding: theme.spacing.lg,
    ...theme.shadows.float
  },
  heroEyebrow: {
    ...theme.typography.caption,
    color: theme.colors.champagne,
    textTransform: "uppercase"
  },
  heroTitle: {
    ...theme.typography.title,
    color: theme.colors.white
  },
  heroCopy: {
    ...theme.typography.body,
    color: theme.colors.champagne
  },
  heroInsights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md
  },
  heroInsight: {
    ...theme.typography.caption,
    backgroundColor: "rgba(255, 253, 252, 0.14)",
    borderColor: "rgba(255, 253, 252, 0.24)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    color: theme.colors.white,
    overflow: "hidden",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs
  },
  homeButton: {
    marginBottom: theme.spacing.lg
  },
  metricsRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  metricsColumn: {
    flexDirection: "column"
  },
  insightsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs
  },
  sectionTitle: {
    ...theme.typography.section,
    color: theme.colors.ink,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg
  },
  list: {
    gap: theme.spacing.md
  }
});
