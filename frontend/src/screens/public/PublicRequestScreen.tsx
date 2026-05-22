import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { FadeInView } from "@/animations/FadeInView";
import { EmptyState } from "@/components/common/EmptyState";
import { ImagePreview } from "@/components/common/ImagePreview";
import { LoadingState } from "@/components/common/LoadingState";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { fetchPublicRequest } from "@/services/api";
import { theme } from "@/theme";
import type { AppointmentRequest } from "@/types/domain";
import type { PublicStackParamList } from "@/types/navigation";
import { formatMoney } from "@/utils/format";

type Props = NativeStackScreenProps<PublicStackParamList, "PublicRequest">;

export function PublicRequestScreen({ navigation, route }: Props) {
  const [request, setRequest] = useState<AppointmentRequest>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRequest() {
    setLoading(true);
    setError("");
    try {
      setRequest(await fetchPublicRequest(route.params.code));
    } catch (caughtError) {
      setRequest(undefined);
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível carregar este pedido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequest();
  }, [route.params.code]);

  return (
    <Screen>
      <ScreenHeader
        onBack={() => navigation.navigate("Home")}
        subtitle="Acompanhe status, orçamento, comentários e histórico do atelier."
        title="Acompanhamento"
      />

      {loading ? <LoadingState message="Buscando os detalhes do pedido." title="Carregando pedido" /> : null}
      {error ? <Notice message={error} title="Pedido indisponível" tone="danger" /> : null}

      {request ? (
        <FadeInView>
          <PremiumSurface elevated style={styles.panel}>
            <View style={styles.header}>
              <View style={styles.titleBlock}>
                <Text style={styles.kicker}>Pedido {request.publicCode ?? `#${request.id}`}</Text>
                <Text style={styles.title}>{request.serviceName}</Text>
                <Text style={styles.slot}>{request.slotLabel}</Text>
              </View>
              <StatusBadge status={request.status} />
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Ionicons color={theme.colors.roseGoldDark} name="person-outline" size={18} />
                <Text style={styles.infoText}>{request.clientName}</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons color={theme.colors.roseGoldDark} name="cash-outline" size={18} />
                <Text style={styles.infoText}>
                  {request.estimatedPrice ? formatMoney(request.estimatedPrice) : "Valor sob avaliação"}
                </Text>
              </View>
            </View>

            {request.adminComment ? (
              <View style={styles.highlightBox}>
                <Text style={styles.boxLabel}>Comentário do atelier</Text>
                <Text style={styles.boxText}>{request.adminComment}</Text>
              </View>
            ) : null}

            {request.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.boxLabel}>Observações enviadas</Text>
                <Text style={styles.boxText}>{request.notes}</Text>
              </View>
            ) : null}

            {request.imageUrls[0] ? (
              <ImagePreview height={220} uri={request.imageUrls[0]} />
            ) : (
              <EmptyState
                icon="image-outline"
                message="Este pedido não possui imagem anexada."
                title="Sem imagem"
              />
            )}

            {request.timeline?.length ? (
              <View style={styles.timeline}>
                <Text style={styles.boxLabel}>Histórico</Text>
                {request.timeline.map((event) => (
                  <View key={event.id} style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineBody}>
                      <Text style={styles.timelineTitle}>
                        {event.changedBy === "admin" ? "Atelier" : "Cliente"}: {event.toStatus}
                      </Text>
                      {event.comment ? <Text style={styles.timelineComment}>{event.comment}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <PremiumButton icon="refresh-outline" label="Atualizar acompanhamento" onPress={() => void loadRequest()} />
          </PremiumSurface>
        </FadeInView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: theme.spacing.md
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.md,
    justifyContent: "space-between"
  },
  titleBlock: {
    flex: 1,
    gap: theme.spacing.xxs
  },
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.ink
  },
  slot: {
    ...theme.typography.body,
    color: theme.colors.taupe
  },
  infoGrid: {
    gap: theme.spacing.sm
  },
  infoItem: {
    alignItems: "center",
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.graphite,
    flex: 1
  },
  highlightBox: {
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md
  },
  notesBox: {
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md
  },
  boxLabel: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase"
  },
  boxText: {
    ...theme.typography.body,
    color: theme.colors.graphite
  },
  timeline: {
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md
  },
  timelineItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  timelineDot: {
    backgroundColor: theme.colors.roseGold,
    borderColor: theme.colors.ivory,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    height: 12,
    marginTop: 4,
    width: 12
  },
  timelineBody: {
    flex: 1
  },
  timelineTitle: {
    ...theme.typography.caption,
    color: theme.colors.ink,
    fontWeight: "800"
  },
  timelineComment: {
    ...theme.typography.caption,
    color: theme.colors.graphite,
    marginTop: 2
  }
});
