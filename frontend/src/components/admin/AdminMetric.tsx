import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/theme";

type AdminMetricProps = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export function AdminMetric({ label, value, icon }: AdminMetricProps) {
  return (
    <View accessibilityLabel={`${label}: ${value}`} style={styles.card}>
      <Ionicons color={theme.colors.roseGoldDark} name={icon} size={20} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    gap: theme.spacing.xs,
    minHeight: 118,
    padding: theme.spacing.md,
    ...theme.shadows.float
  },
  value: {
    ...theme.typography.title,
    color: theme.colors.ink
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.graphite,
    fontWeight: "700"
  }
});
