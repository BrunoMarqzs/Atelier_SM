import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme";
import type { AppointmentStatus } from "@/types/domain";

const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Pendente",
  under_review: "Em avaliação",
  quote_sent: "Orçamento enviado",
  approved: "Aprovado",
  rejected: "Recusado",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado"
};

const statusColors: Record<AppointmentStatus, { color: string; backgroundColor: string }> = {
  pending: { color: theme.colors.warning, backgroundColor: theme.colors.warningSoft },
  under_review: { color: theme.colors.roseGoldDark, backgroundColor: theme.colors.champagne },
  quote_sent: { color: theme.colors.info, backgroundColor: theme.colors.infoSoft },
  approved: { color: theme.colors.success, backgroundColor: theme.colors.successSoft },
  rejected: { color: theme.colors.danger, backgroundColor: theme.colors.dangerSoft },
  in_progress: { color: theme.colors.info, backgroundColor: theme.colors.infoSoft },
  completed: { color: theme.colors.success, backgroundColor: theme.colors.successSoft },
  cancelled: { color: theme.colors.taupe, backgroundColor: theme.colors.porcelain }
};

const statusIcons: Record<AppointmentStatus, keyof typeof Ionicons.glyphMap> = {
  pending: "time-outline",
  under_review: "search-outline",
  quote_sent: "receipt-outline",
  approved: "checkmark-circle-outline",
  rejected: "close-circle-outline",
  in_progress: "sparkles-outline",
  completed: "flag-outline",
  cancelled: "remove-circle-outline"
};

type StatusBadgeProps = {
  status: AppointmentStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const selectedStatus = statusColors[status];
  return (
    <View
      accessibilityLabel={`Status: ${statusLabels[status]}`}
      style={[
        styles.badge,
        { backgroundColor: selectedStatus.backgroundColor, borderColor: selectedStatus.color }
      ]}
    >
      <Ionicons color={selectedStatus.color} name={statusIcons[status]} size={13} />
      <Text style={[styles.label, { color: selectedStatus.color }]}>{statusLabels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.ivory,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.xxs,
    maxWidth: "100%",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    ...theme.shadows.soft
  },
  label: {
    ...theme.typography.caption,
    flexShrink: 1,
    fontWeight: "700"
  }
});
