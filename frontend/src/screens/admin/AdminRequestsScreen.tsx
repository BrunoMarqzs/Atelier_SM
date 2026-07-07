import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { FadeInView } from "@/animations/FadeInView";
import { RequestPreviewCard } from "@/components/admin/RequestPreviewCard";
import { WhatsAppNotifyButton } from "@/components/admin/WhatsAppNotifyButton";
import { ReschedulePanel } from "@/components/booking/ReschedulePanel";
import { EmptyState } from "@/components/common/EmptyState";
import { ElegantInput } from "@/components/common/ElegantInput";
import { ImagePreview } from "@/components/common/ImagePreview";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { RequestTimeline } from "@/components/common/RequestTimeline";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAtelier } from "@/context/AtelierContext";
import { createAdminMockPayment, fetchAdminRequestPayment, updateAdminPaymentStatus } from "@/services/api";
import { theme } from "@/theme";
import type { AppointmentRequest, AppointmentStatus, Payment } from "@/types/domain";
import { sortRequestsBySchedule } from "@/utils/calendar";
import { formatMoney } from "@/utils/format";

const statusFilters: Array<{ label: string; value?: AppointmentStatus }> = [
  { label: "Todos" },
  { label: "Pendentes", value: "pending" },
  { label: "Avaliação", value: "under_review" },
  { label: "Orçados", value: "quote_sent" },
  { label: "Aprovados", value: "approved" },
  { label: "Andamento", value: "in_progress" }
];

const historyStatusFilters: Array<{ label: string; value?: AppointmentStatus }> = [
  { label: "Todos" },
  { label: "Concluídos", value: "completed" },
  { label: "Cancelados", value: "cancelled" },
  { label: "Recusados", value: "rejected" }
];

const allowedStatusTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["under_review", "approved", "rejected", "cancelled"],
  under_review: ["quote_sent", "approved", "rejected", "cancelled"],
  quote_sent: ["approved", "rejected", "cancelled"],
  approved: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  rejected: [],
  completed: [],
  cancelled: []
};

function canTransition(current: AppointmentStatus, target: AppointmentStatus) {
  return current !== target && allowedStatusTransitions[current].includes(target);
}

function errorMessage(caughtError: unknown, fallback: string) {
  return caughtError instanceof Error && caughtError.message ? caughtError.message : fallback;
}

export function AdminRequestsScreen() {
  const { addRequestComment, requests, rescheduleRequest, services, updateRequestEstimate, updateRequestStatus } = useAtelier();
  const [selectedRequest, setSelectedRequest] = useState<AppointmentRequest | undefined>();
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | undefined>();
  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [budgetFilter, setBudgetFilter] = useState<"all" | "with_budget" | "without_budget">("all");
  const [viewMode, setViewMode] = useState<"active" | "history">("active");
  const [showFilters, setShowFilters] = useState(false);
  const [hideApproved, setHideApproved] = useState(false);
  const [onlyRescheduled, setOnlyRescheduled] = useState(false);
  const [onlyWithImage, setOnlyWithImage] = useState(false);
  const [comment, setComment] = useState("");
  const [estimate, setEstimate] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment>();
  const [actionError, setActionError] = useState<string>();
  const [actionSuccess, setActionSuccess] = useState<string>();
  const [actionLoading, setActionLoading] = useState(false);
  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(endOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    const endOfMonth = new Date(endOfToday);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const historyStatuses: AppointmentStatus[] = ["completed", "cancelled", "rejected"];

    return sortRequestsBySchedule(requests)
      .filter((request) =>
        viewMode === "history" ? historyStatuses.includes(request.status) : !historyStatuses.includes(request.status)
      )
      .filter((request) => (hideApproved && viewMode === "active" ? request.status !== "approved" : true))
      .filter((request) => (statusFilter ? request.status === statusFilter : true))
      .filter((request) => (serviceFilter ? request.serviceName === serviceFilter : true))
      .filter((request) => {
        if (budgetFilter === "with_budget") {
          return Boolean(request.estimatedPrice);
        }
        if (budgetFilter === "without_budget") {
          return !request.estimatedPrice;
        }
        return true;
      })
      .filter((request) => (onlyWithImage ? request.imageUrls.length > 0 : true))
      .filter((request) =>
        onlyRescheduled
          ? Boolean(request.timeline?.some((event) => event.comment?.toLowerCase().includes("remarc")))
          : true
      )
      .filter((request) => {
        if (periodFilter === "all") {
          return true;
        }
        const scheduleDate = request.slotKey.match(/^(\d{4}-\d{2}-\d{2})-(\d{2}):(\d{2})$/);
        if (!scheduleDate) {
          return false;
        }
        const date = new Date(`${scheduleDate[1]}T${scheduleDate[2]}:${scheduleDate[3]}:00`);
        if (periodFilter === "today") {
          return date >= startOfToday && date <= endOfToday;
        }
        if (periodFilter === "week") {
          return date >= startOfToday && date <= endOfWeek;
        }
        return date >= startOfToday && date <= endOfMonth;
      })
      .filter((request) => {
        if (!normalizedQuery) {
          return true;
        }
        return (
          request.clientName.toLowerCase().includes(normalizedQuery) ||
          request.clientPhone.toLowerCase().includes(normalizedQuery) ||
          request.serviceName.toLowerCase().includes(normalizedQuery) ||
          request.status.toLowerCase().includes(normalizedQuery) ||
          request.notes?.toLowerCase().includes(normalizedQuery) ||
          request.adminComment?.toLowerCase().includes(normalizedQuery)
        );
      });
  }, [budgetFilter, hideApproved, onlyRescheduled, onlyWithImage, periodFilter, query, requests, serviceFilter, statusFilter, viewMode]);
  const freshSelectedRequest = requests.find((request) => request.id === selectedRequest?.id);
  const canCompleteSelectedRequest =
    freshSelectedRequest?.status === "approved" || freshSelectedRequest?.status === "in_progress";
  const visibleStatusFilters = viewMode === "history" ? historyStatusFilters : statusFilters;

  async function loadSelectedPayment(requestId: number) {
    try {
      setSelectedPayment(await fetchAdminRequestPayment(requestId));
    } catch {
      setSelectedPayment(undefined);
    }
  }

  useEffect(() => {
    if (!freshSelectedRequest) {
      setSelectedPayment(undefined);
      return;
    }
    void loadSelectedPayment(freshSelectedRequest.id);
  }, [freshSelectedRequest?.id]);

  function confirmAction(label: string, onConfirm: () => Promise<void>) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(label)) {
        void onConfirm();
      }
      return;
    }

    Alert.alert("Confirmar ação", label, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: () => void onConfirm() }
    ]);
  }

  async function runAction(action: () => Promise<void>, failureMessage: string, successMessage?: string) {
    setActionLoading(true);
    setActionError(undefined);
    setActionSuccess(undefined);
    try {
      await action();
      if (successMessage) {
        setActionSuccess(successMessage);
      }
    } catch (caughtError) {
      setActionError(errorMessage(caughtError, failureMessage));
    } finally {
      setActionLoading(false);
    }
  }

  async function saveComment(requestId: number) {
    if (!comment.trim()) {
      return;
    }
    await runAction(async () => {
      await addRequestComment(requestId, comment.trim());
      setComment("");
    }, "Não foi possível salvar o comentário.", "Comentário salvo no histórico do pedido.");
  }

  async function saveEstimate(requestId: number) {
    const numericEstimate = Number(estimate.replace(",", "."));
    if (Number.isNaN(numericEstimate) || numericEstimate < 0) {
      return;
    }
    await runAction(async () => {
      await updateRequestEstimate(requestId, numericEstimate, comment.trim() || undefined);
      setEstimate("");
    }, "Não foi possível salvar o orçamento.", "Orçamento atualizado com sucesso.");
  }

  async function changeStatus(
    requestId: number,
    status: AppointmentStatus,
    options?: { comment?: string; estimatedPrice?: number }
  ) {
    await runAction(
      async () => {
        await updateRequestStatus(requestId, status, options);
        if (status === "completed") {
          setSelectedRequest(undefined);
        }
      },
      "Não foi possível atualizar o pedido.",
      status === "completed" ? "Pedido concluído e removido da fila ativa." : "Status atualizado com sucesso."
    );
  }

  async function createPayment(request: AppointmentRequest) {
    if (!request.estimatedPrice) {
      setActionError("Defina um orçamento antes de gerar o Pix.");
      return;
    }
    await runAction(
      async () => {
        const payment = await createAdminMockPayment(request.id, request.estimatedPrice ?? 0);
        setSelectedPayment(payment);
      },
      "Não foi possível gerar o pagamento Pix.",
      "Pagamento Pix gerado para a cliente."
    );
  }

  async function markPaymentAsPaid(payment: Payment) {
    await runAction(
      async () => {
        setSelectedPayment(await updateAdminPaymentStatus(payment.id, "paid"));
      },
      "Não foi possível confirmar o pagamento.",
      "Pagamento confirmado manualmente."
    );
  }

  function clearFilters() {
    setStatusFilter(undefined);
    setServiceFilter("");
    setPeriodFilter("all");
    setBudgetFilter("all");
    setOnlyRescheduled(false);
    setOnlyWithImage(false);
  }

  return (
    <Screen>
      <ScreenHeader subtitle="Filtre, avalie, comente, aprove e acompanhe cada solicitação." title="Pedidos" />
      <PremiumSurface style={styles.filters}>
        <View style={styles.filterHeader}>
          <View style={styles.filterTitleBlock}>
            <Text style={styles.filterTitle}>
              {filteredRequests.length} {viewMode === "history" ? "pedido(s) no histórico" : "pedido(s) na fila"}
            </Text>
            <Text style={styles.filterSubtitle}>
              {viewMode === "history"
                ? "Consulte pedidos encerrados por nome, telefone ou serviço"
                : "Acompanhe pedidos ativos e oculte aprovados quando precisar"}
            </Text>
          </View>
          <AnimatedPressable
            accessibilityLabel={showFilters ? "Fechar filtros" : "Abrir filtros"}
            accessibilityRole="button"
            onPress={() => setShowFilters((current) => !current)}
            pressedScale={0.95}
            style={[styles.filterToggle, showFilters ? styles.filterToggleActive : null]}
          >
            <Ionicons
              color={showFilters ? theme.colors.white : theme.colors.roseGoldDark}
              name="options-outline"
              size={18}
            />
            <Text style={[styles.filterToggleText, showFilters ? styles.filterTextActive : null]}>Filtros</Text>
          </AnimatedPressable>
        </View>
        <ElegantInput
          label="Buscar"
          onChangeText={setQuery}
          placeholder={viewMode === "history" ? "Pesquisar no histórico por nome ou telefone" : "Nome ou telefone da cliente"}
          value={query}
        />
        <View style={styles.filterRow}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityState={{ selected: viewMode === "active" }}
            onPress={() => {
              setViewMode("active");
              setStatusFilter(undefined);
              setSelectedRequest(undefined);
            }}
            pressedScale={0.95}
            style={[styles.filterPill, viewMode === "active" ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterText, viewMode === "active" ? styles.filterTextActive : null]}>Fila ativa</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityState={{ selected: viewMode === "history" }}
            onPress={() => {
              setViewMode("history");
              setStatusFilter(undefined);
              setSelectedRequest(undefined);
            }}
            pressedScale={0.95}
            style={[styles.filterPill, viewMode === "history" ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterText, viewMode === "history" ? styles.filterTextActive : null]}>Histórico</Text>
          </AnimatedPressable>
          {viewMode === "active" ? (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityState={{ selected: hideApproved }}
              onPress={() => setHideApproved((current) => !current)}
              pressedScale={0.95}
              style={[styles.filterPill, hideApproved ? styles.filterPillActive : null]}
            >
              <Text style={[styles.filterText, hideApproved ? styles.filterTextActive : null]}>Ocultar aprovados</Text>
            </AnimatedPressable>
          ) : null}
        </View>
        {showFilters ? (
          <View style={styles.advancedFilters}>
            <View style={styles.filterRow}>
          {visibleStatusFilters.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <AnimatedPressable
                accessibilityLabel={`Filtrar pedidos por ${filter.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={filter.label}
                onPress={() => setStatusFilter(filter.value)}
                pressedScale={0.95}
                style={[styles.filterPill, active ? styles.filterPillActive : null]}
              >
                <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{filter.label}</Text>
              </AnimatedPressable>
            );
          })}
        </View>
        <View style={styles.filterRow}>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => setPeriodFilter("all")}
            pressedScale={0.95}
            style={[styles.filterPill, periodFilter === "all" ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterText, periodFilter === "all" ? styles.filterTextActive : null]}>Todo período</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => setPeriodFilter("today")}
            pressedScale={0.95}
            style={[styles.filterPill, periodFilter === "today" ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterText, periodFilter === "today" ? styles.filterTextActive : null]}>Hoje</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => setPeriodFilter("week")}
            pressedScale={0.95}
            style={[styles.filterPill, periodFilter === "week" ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterText, periodFilter === "week" ? styles.filterTextActive : null]}>7 dias</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => setPeriodFilter("month")}
            pressedScale={0.95}
            style={[styles.filterPill, periodFilter === "month" ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterText, periodFilter === "month" ? styles.filterTextActive : null]}>30 dias</Text>
          </AnimatedPressable>
        </View>
        <View style={styles.filterRow}>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => setBudgetFilter("all")}
            pressedScale={0.95}
            style={[styles.filterPill, budgetFilter === "all" ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterText, budgetFilter === "all" ? styles.filterTextActive : null]}>Todos valores</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => setBudgetFilter("with_budget")}
            pressedScale={0.95}
            style={[styles.filterPill, budgetFilter === "with_budget" ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterText, budgetFilter === "with_budget" ? styles.filterTextActive : null]}>Com orçamento</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => setBudgetFilter("without_budget")}
            pressedScale={0.95}
            style={[styles.filterPill, budgetFilter === "without_budget" ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterText, budgetFilter === "without_budget" ? styles.filterTextActive : null]}>Sem orçamento</Text>
          </AnimatedPressable>
        </View>
        <View style={styles.filterRow}>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => setOnlyRescheduled((current) => !current)}
            pressedScale={0.95}
            style={[styles.filterPill, onlyRescheduled ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterText, onlyRescheduled ? styles.filterTextActive : null]}>Remarcados</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => setOnlyWithImage((current) => !current)}
            pressedScale={0.95}
            style={[styles.filterPill, onlyWithImage ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterText, onlyWithImage ? styles.filterTextActive : null]}>Com imagem</Text>
          </AnimatedPressable>
        </View>
        <View style={styles.filterRow}>
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => setServiceFilter("")}
            pressedScale={0.95}
            style={[styles.filterPill, serviceFilter === "" ? styles.filterPillActive : null]}
          >
            <Text style={[styles.filterText, serviceFilter === "" ? styles.filterTextActive : null]}>Todos serviços</Text>
          </AnimatedPressable>
          {services.slice(0, 8).map((service) => (
            <AnimatedPressable
              accessibilityRole="button"
              key={service.id}
              onPress={() => setServiceFilter(service.name)}
              pressedScale={0.95}
              style={[styles.filterPill, serviceFilter === service.name ? styles.filterPillActive : null]}
            >
              <Text style={[styles.filterText, serviceFilter === service.name ? styles.filterTextActive : null]}>
                {service.name}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
        <AnimatedPressable
          accessibilityRole="button"
          onPress={clearFilters}
          pressedScale={0.97}
          style={styles.clearFiltersButton}
        >
          <Ionicons color={theme.colors.roseGoldDark} name="refresh-outline" size={18} />
          <Text style={styles.clearFiltersText}>Limpar filtros</Text>
        </AnimatedPressable>
          </View>
        ) : null}
      </PremiumSurface>
      {actionError ? <Notice message={actionError} title="Ação não concluída" tone="danger" /> : null}
      {actionSuccess ? <Notice message={actionSuccess} title="Tudo certo" tone="success" /> : null}

      <View style={styles.list}>
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request, index) => (
            <FadeInView delay={index * 45} key={request.id}>
              <AnimatedPressable
                accessibilityLabel={`Abrir pedido de ${request.clientName}, ${request.serviceName}`}
                accessibilityRole="button"
                onPress={() => {
                  setSelectedRequest(request);
                  setComment(request.adminComment ?? "");
                  setEstimate(request.estimatedPrice ? String(request.estimatedPrice) : "");
                }}
                pressedScale={0.988}
              >
                <RequestPreviewCard request={request} />
              </AnimatedPressable>
            </FadeInView>
          ))
        ) : (
          <EmptyState
            icon="file-tray-outline"
            message={
              viewMode === "history"
                ? "Use a busca para localizar pedidos antigos por nome, telefone ou serviço."
                : "Ajuste os filtros ou aguarde novas solicitações chegarem pelo fluxo da cliente."
            }
            title="Nenhum pedido encontrado"
          />
        )}
      </View>

      {freshSelectedRequest ? (
        <PremiumSurface elevated style={styles.detailPanel}>
          <View style={styles.detailHeader}>
            <View style={styles.detailTitleBlock}>
              <Text style={styles.detailTitle}>Pedido #{freshSelectedRequest.id}</Text>
              <Text style={styles.detailSubtitle}>{freshSelectedRequest.serviceName}</Text>
            </View>
            <StatusBadge status={freshSelectedRequest.status} />
          </View>

          <View style={styles.infoBlock}>
            <View style={styles.infoHeader}>
              <Ionicons color={theme.colors.roseGoldDark} name="person-circle-outline" size={22} />
              <Text style={styles.infoKicker}>Cliente</Text>
            </View>
            <Text style={styles.clientName}>{freshSelectedRequest.clientName}</Text>
            <Text style={styles.infoText}>{freshSelectedRequest.clientPhone}</Text>
            <Text style={styles.infoText}>Horário: {freshSelectedRequest.slotLabel}</Text>
            {freshSelectedRequest.estimatedPrice ? (
              <Text style={styles.infoText}>Orçamento: R$ {freshSelectedRequest.estimatedPrice}</Text>
            ) : (
              <Text style={styles.infoText}>Valor sob avaliação</Text>
            )}
          </View>

          <WhatsAppNotifyButton request={freshSelectedRequest} />

          <View style={styles.paymentBox}>
            <View style={styles.infoHeader}>
              <Ionicons color={theme.colors.roseGoldDark} name="qr-code-outline" size={22} />
              <Text style={styles.infoKicker}>Pagamento Pix</Text>
            </View>
            {selectedPayment ? (
              <>
                <Text style={styles.infoText}>Valor: {formatMoney(selectedPayment.amount)}</Text>
                <Text style={styles.infoText}>Status: {selectedPayment.status}</Text>
                {selectedPayment.expiresAt ? (
                  <Text style={styles.infoText}>
                    Expira em: {new Date(selectedPayment.expiresAt).toLocaleString("pt-BR")}
                  </Text>
                ) : null}
                <View style={styles.inlineActions}>
                  <PremiumButton
                    disabled={selectedPayment.status !== "waiting_payment" || actionLoading}
                    icon="checkmark-circle-outline"
                    label="Confirmar pagamento"
                    onPress={() =>
                      confirmAction("Confirmar pagamento deste pedido?", () => markPaymentAsPaid(selectedPayment))
                    }
                    variant="secondary"
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.infoText}>
                  Gere um Pix de teste para a cliente visualizar na consulta do pedido.
                </Text>
                <PremiumButton
                  disabled={!freshSelectedRequest.estimatedPrice || actionLoading}
                  icon="qr-code-outline"
                  label="Gerar Pix de teste"
                  onPress={() => void createPayment(freshSelectedRequest)}
                  variant="secondary"
                />
              </>
            )}
          </View>

          {freshSelectedRequest.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Observações da cliente</Text>
              <Text style={styles.notes}>{freshSelectedRequest.notes}</Text>
            </View>
          ) : null}

          {freshSelectedRequest.imageUrls[0] ? (
            <ImagePreview uri={freshSelectedRequest.imageUrls[0]} />
          ) : (
            <EmptyState
              icon="image-outline"
              message="A solicitação não possui referência visual anexada."
              title="Sem imagem enviada"
            />
          )}

          <View style={styles.adminBlock}>
            <ElegantInput
              label="Comentário administrativo"
              multiline
              onChangeText={setComment}
              placeholder="Registre avaliação, decisão ou orientação interna"
              value={comment}
            />
            <ElegantInput
              keyboardType="numeric"
              label="Orçamento"
              onChangeText={setEstimate}
              placeholder="Ex.: 250"
              value={estimate}
            />
            <View style={styles.inlineActions}>
              <PremiumButton
                disabled={!comment.trim() || actionLoading}
                icon="chatbubble-ellipses-outline"
                label="Salvar comentário"
                onPress={() => void saveComment(freshSelectedRequest.id)}
                variant="secondary"
              />
              <PremiumButton
                disabled={!estimate.trim() || actionLoading}
                icon="cash-outline"
                label="Salvar orçamento"
                onPress={() => void saveEstimate(freshSelectedRequest.id)}
                variant="secondary"
              />
            </View>
          </View>

          <RequestTimeline events={freshSelectedRequest.timeline} limit={5} title="Histórico do pedido" />

          <ReschedulePanel
            currentSlotKey={freshSelectedRequest.slotKey}
            onConfirm={async (slot) => {
              await rescheduleRequest(
                freshSelectedRequest.id,
                slot.id,
                `Pedido remarcado para ${slot.label} pelo administrativo.`
              );
              setActionSuccess("Pedido remarcado com sucesso.");
            }}
          />

          <View style={styles.actions}>
            {canTransition(freshSelectedRequest.status, "under_review") ? (
              <PremiumButton
              disabled={actionLoading}
              icon="search-outline"
              label="Marcar em avaliação"
              onPress={() =>
                confirmAction("Marcar este pedido como em avaliação?", () =>
                  changeStatus(freshSelectedRequest.id, "under_review", {
                    comment: comment.trim() || undefined,
                    estimatedPrice: estimate ? Number(estimate.replace(",", ".")) : undefined
                  })
                )
              }
              variant="secondary"
              />
            ) : null}
            {canTransition(freshSelectedRequest.status, "rejected") ? (
              <PremiumButton
              disabled={actionLoading}
              icon="close-circle-outline"
              label="Recusar"
              onPress={() =>
                confirmAction("Recusar esta solicitação?", () =>
                  changeStatus(freshSelectedRequest.id, "rejected", {
                    comment: comment.trim() || "Solicitação recusada pelo administrativo."
                  })
                )
              }
              variant="secondary"
              />
            ) : null}
            {canTransition(freshSelectedRequest.status, "approved") ? (
              <PremiumButton
              disabled={actionLoading}
              icon="checkmark-circle-outline"
              label="Aprovar"
              onPress={() =>
                confirmAction("Aprovar esta solicitação?", () =>
                  changeStatus(freshSelectedRequest.id, "approved", {
                    comment: comment.trim() || "Solicitação aprovada pelo administrativo.",
                    estimatedPrice: estimate ? Number(estimate.replace(",", ".")) : undefined
                  })
                )
              }
              />
            ) : null}
            {canTransition(freshSelectedRequest.status, "quote_sent") ? (
              <PremiumButton
                disabled={actionLoading || !estimate.trim()}
                icon="receipt-outline"
                label="Enviar orçamento"
                onPress={() =>
                  confirmAction("Enviar este orçamento para a cliente?", () =>
                    changeStatus(freshSelectedRequest.id, "quote_sent", {
                      comment: comment.trim() || "Orçamento enviado pelo atelier.",
                      estimatedPrice: estimate ? Number(estimate.replace(",", ".")) : undefined
                    })
                  )
                }
                variant="secondary"
              />
            ) : null}
            {canCompleteSelectedRequest && canTransition(freshSelectedRequest.status, "completed") ? (
              <PremiumButton
                disabled={actionLoading}
                icon="flag-outline"
                label="Concluir pedido"
                onPress={() =>
                  confirmAction("Concluir este pedido?", () =>
                    changeStatus(freshSelectedRequest.id, "completed", {
                      comment: "Pedido concluído pelo administrativo."
                    })
                  )
                }
                variant="secondary"
              />
            ) : null}
          </View>
        </PremiumSurface>
      ) : (
        <EmptyState
          icon="hand-left-outline"
          message="Selecione uma solicitação para visualizar fotos, orçamento, comentários e histórico."
          title="Escolha um pedido"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg
  },
  filterHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.xxs
  },
  filterTitleBlock: {
    flex: 1,
    gap: theme.spacing.xxs,
    minWidth: 220
  },
  filterTitle: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  filterSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.taupe
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  advancedFilters: {
    gap: theme.spacing.sm
  },
  filterToggle: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs
  },
  filterToggleActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink
  },
  filterToggleText: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800"
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
  clearFiltersButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.xs,
    minHeight: 40,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs
  },
  clearFiltersText: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800"
  },
  list: {
    gap: theme.spacing.md
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
  detailTitleBlock: {
    flex: 1
  },
  detailTitle: {
    ...theme.typography.title,
    color: theme.colors.ink
  },
  detailSubtitle: {
    ...theme.typography.body,
    color: theme.colors.taupe
  },
  infoBlock: {
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.xxs,
    padding: theme.spacing.md
  },
  infoHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs
  },
  infoKicker: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  clientName: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.graphite
  },
  paymentBox: {
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  notesBox: {
    backgroundColor: theme.colors.porcelain,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md
  },
  notesLabel: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "700",
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase"
  },
  notes: {
    ...theme.typography.body,
    color: theme.colors.graphite
  },
  adminBlock: {
    gap: theme.spacing.md
  },
  inlineActions: {
    gap: theme.spacing.sm
  },
  actions: {
    gap: theme.spacing.sm
  }
});
