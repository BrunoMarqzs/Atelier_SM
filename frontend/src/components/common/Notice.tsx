import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/theme";

type NoticeTone = "info" | "success" | "warning" | "danger";

type NoticeProps = {
  tone?: NoticeTone;
  title?: string;
  message: string;
};

const toneStyles: Record<NoticeTone, { backgroundColor: string; borderColor: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  info: {
    backgroundColor: theme.colors.infoSoft,
    borderColor: theme.colors.info,
    color: theme.colors.info,
    icon: "information-circle-outline"
  },
  success: {
    backgroundColor: theme.colors.successSoft,
    borderColor: theme.colors.success,
    color: theme.colors.success,
    icon: "checkmark-circle-outline"
  },
  warning: {
    backgroundColor: theme.colors.warningSoft,
    borderColor: theme.colors.warning,
    color: theme.colors.warning,
    icon: "alert-circle-outline"
  },
  danger: {
    backgroundColor: theme.colors.dangerSoft,
    borderColor: theme.colors.danger,
    color: theme.colors.danger,
    icon: "close-circle-outline"
  }
};

export function Notice({ tone = "info", title, message }: NoticeProps) {
  const selectedTone = toneStyles[tone];
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.container,
        { backgroundColor: selectedTone.backgroundColor, borderColor: selectedTone.borderColor }
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: selectedTone.backgroundColor }]}>
        <Ionicons color={selectedTone.color} name={selectedTone.icon} size={18} />
      </View>
      <View style={styles.textBlock}>
        {title ? <Text style={[styles.title, { color: selectedTone.color }]}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    ...theme.shadows.soft
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  textBlock: {
    flex: 1
  },
  title: {
    ...theme.typography.caption,
    fontWeight: "800",
    marginBottom: theme.spacing.xxs,
    textTransform: "uppercase"
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.graphite
  }
});
