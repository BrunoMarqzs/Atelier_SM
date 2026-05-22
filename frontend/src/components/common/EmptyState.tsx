import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/theme";

type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  children?: ReactNode;
};

export function EmptyState({ children, icon = "sparkles-outline", title, message }: EmptyStateProps) {
  return (
    <View
      accessibilityLabel={`${title}. ${message}`}
      accessibilityLiveRegion="polite"
      style={styles.container}
    >
      <View style={styles.iconWrap}>
        <Ionicons color={theme.colors.roseGoldDark} name={icon} size={22} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
    ...theme.shadows.soft
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    height: 44,
    justifyContent: "center",
    marginBottom: theme.spacing.xs,
    width: 44
  },
  title: {
    ...theme.typography.section,
    color: theme.colors.ink,
    textAlign: "center"
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.taupe,
    textAlign: "center"
  },
  actions: {
    marginTop: theme.spacing.sm,
    width: "100%"
  }
});
