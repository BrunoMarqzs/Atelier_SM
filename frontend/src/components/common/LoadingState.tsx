import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { SkeletonBlock } from "@/components/common/SkeletonBlock";
import { theme } from "@/theme";

type LoadingStateProps = {
  title: string;
  message?: string;
  compact?: boolean;
};

export function LoadingState({ title, message, compact = false }: LoadingStateProps) {
  return (
    <View
      accessibilityLabel={message ? `${title}. ${message}` : title}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={[styles.container, compact ? styles.compact : null]}
    >
      <View style={styles.indicatorWrap}>
        <ActivityIndicator color={theme.colors.roseGoldDark} size="small" />
      </View>
      <View style={[styles.textBlock, compact ? styles.compactTextBlock : null]}>
        <Text style={[styles.title, compact ? styles.compactText : null]}>{title}</Text>
        {message ? <Text style={[styles.message, compact ? styles.compactText : null]}>{message}</Text> : null}
      </View>
      {!compact ? (
        <View style={styles.skeletons}>
          <SkeletonBlock height={14} />
          <SkeletonBlock height={14} />
        </View>
      ) : null}
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
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    ...theme.shadows.soft
  },
  compact: {
    alignItems: "flex-start",
    flexDirection: "row"
  },
  indicatorWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  textBlock: {
    alignItems: "center",
    gap: theme.spacing.xxs
  },
  compactTextBlock: {
    alignItems: "flex-start",
    flex: 1
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
  compactText: {
    textAlign: "left"
  },
  skeletons: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
    width: "100%"
  }
});
