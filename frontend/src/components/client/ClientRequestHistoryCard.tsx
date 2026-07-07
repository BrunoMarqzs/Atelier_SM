import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { PixPaymentPanel } from "@/components/client/PixPaymentPanel";
import { ReschedulePanel } from "@/components/booking/ReschedulePanel";
import { ImagePreview } from "@/components/common/ImagePreview";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { RequestTimeline } from "@/components/common/RequestTimeline";
import { StatusBadge } from "@/components/common/StatusBadge";
import { fetchPublicRequestPayment, rescheduleClientRequest } from "@/services/api";
import { theme } from "@/theme";
import type { AppointmentRequest, Payment } from "@/types/domain";
import { formatMoney } from "@/utils/format";

type ClientRequestHistoryCardProps = {
  onRescheduled?: (request: AppointmentRequest) => void;
  phone: string;
  request: AppointmentRequest;
};

export function ClientRequestHistoryCard({ onRescheduled, phone, request }: ClientRequestHistoryCardProps) {
  const [rescheduling, setRescheduling] = useState(false);
  const [payment, setPayment] = useState<Payment>();
  const canReschedule = !["completed", "cancelled", "rejected"].includes(request.status);

  async function loadPayment() {
    if (!request.publicCode) {
      setPayment(undefined);
      return;
    }
    try {
      setPayment(await fetchPublicRequestPayment(request.publicCode));
    } catch {
      setPayment(undefined);
    }
  }

  useEffect(() => {
    void loadPayment();
  }, [request.publicCode]);

  return (
    <PremiumSurface style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.service}>{request.serviceName}</Text>
          <Text style={styles.slot}>{request.slotLabel}</Text>
        </View>
        <StatusBadge status={request.status} />
      </View>

      <View style={styles.infoRow}>
        <Ionicons color={theme.colors.roseGoldDark} name="cash-outline" size={17} />
        <Text style={styles.infoText}>
          {request.estimatedPrice ? `Orçamento: ${formatMoney(request.estimatedPrice)}` : "Valor sob avaliação"}
        </Text>
      </View>

      {request.publicCode ? (
        <View style={styles.infoRow}>
          <Ionicons color={theme.colors.roseGoldDark} name="link-outline" size={17} />
          <Text style={styles.infoText}>Acompanhamento: {request.publicCode}</Text>
        </View>
      ) : null}

      <PixPaymentPanel onExpired={() => void loadPayment()} payment={payment} />

      {request.adminComment ? (
        <View style={styles.commentBox}>
          <Text style={styles.commentLabel}>Comentário do atelier</Text>
          <Text style={styles.comment}>{request.adminComment}</Text>
        </View>
      ) : null}

      {request.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Sua observação</Text>
          <Text style={styles.notes}>{request.notes}</Text>
        </View>
      ) : null}

      {request.imageUrls[0] ? <ImagePreview height={160} uri={request.imageUrls[0]} /> : null}

      <RequestTimeline events={request.timeline} limit={4} />

      {canReschedule ? (
        <>
          <PremiumButton
            icon={rescheduling ? "chevron-up-outline" : "swap-horizontal-outline"}
            label={rescheduling ? "Fechar remarcação" : "Remarcar horário"}
            onPress={() => setRescheduling((current) => !current)}
            variant="secondary"
          />
          {rescheduling ? (
            <ReschedulePanel
              currentSlotKey={request.slotKey}
              onConfirm={async (slot) => {
                const updated = await rescheduleClientRequest(
                  request.id,
                  phone,
                  slot.id,
                  `Pedido remarcado pela cliente para ${slot.label}.`
                );
                onRescheduled?.(updated);
                setRescheduling(false);
              }}
            />
          ) : null}
        </>
      ) : null}
    </PremiumSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    justifyContent: "space-between"
  },
  titleBlock: {
    flex: 1,
    minWidth: 190
  },
  service: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  slot: {
    ...theme.typography.body,
    color: theme.colors.taupe,
    marginTop: 2
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.graphite,
    flex: 1
  },
  commentBox: {
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md
  },
  commentLabel: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase"
  },
  comment: {
    ...theme.typography.body,
    color: theme.colors.ink
  },
  notesBox: {
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md
  },
  notesLabel: {
    ...theme.typography.caption,
    color: theme.colors.taupe,
    fontWeight: "800",
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase"
  },
  notes: {
    ...theme.typography.body,
    color: theme.colors.graphite
  }
});
