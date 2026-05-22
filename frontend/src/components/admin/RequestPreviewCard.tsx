import { StyleSheet, Text, View } from "react-native";

import { StatusBadge } from "@/components/common/StatusBadge";
import { theme } from "@/theme";
import type { AppointmentRequest } from "@/types/domain";

type RequestPreviewCardProps = {
  request: AppointmentRequest;
};

export function RequestPreviewCard({ request }: RequestPreviewCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={styles.client}>{request.clientName}</Text>
          <Text style={styles.service}>{request.serviceName}</Text>
        </View>
        <StatusBadge status={request.status} />
      </View>
      <Text style={styles.slot}>{request.slotLabel}</Text>
      {request.notes ? <Text style={styles.notes}>{request.notes}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    ...theme.shadows.soft
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    justifyContent: "space-between"
  },
  textBlock: {
    flex: 1,
    minWidth: 190
  },
  client: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  service: {
    ...theme.typography.body,
    color: theme.colors.graphite,
    marginTop: 2
  },
  slot: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "700"
  },
  notes: {
    ...theme.typography.body,
    color: theme.colors.taupe
  }
});
