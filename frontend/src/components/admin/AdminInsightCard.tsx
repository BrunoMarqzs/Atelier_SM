import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/theme";

type AdminInsightCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: "rose" | "sage" | "ink";
};

const toneStyles = {
  rose: {
    backgroundColor: theme.colors.champagneSoft,
    color: theme.colors.roseGoldDark
  },
  sage: {
    backgroundColor: theme.colors.successSoft,
    color: theme.colors.success
  },
  ink: {
    backgroundColor: theme.colors.ink,
    color: theme.colors.white
  }
} as const;

export function AdminInsightCard({ icon, label, tone = "rose", value }: AdminInsightCardProps) {
  const selectedTone = toneStyles[tone];

  return (
    <View style={[styles.card, { backgroundColor: selectedTone.backgroundColor }]}>
      <View style={styles.header}>
        <Ionicons color={selectedTone.color} name={icon} size={18} />
        <Text style={[styles.label, { color: selectedTone.color }]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: selectedTone.color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    gap: theme.spacing.xs,
    minHeight: 86,
    minWidth: 150,
    padding: theme.spacing.md,
    ...theme.shadows.soft
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  label: {
    ...theme.typography.caption,
    flexShrink: 1,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  value: {
    ...theme.typography.section
  }
});
