import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { theme } from "@/theme";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
}>;

export function Screen({ children, scroll = true }: ScreenProps) {
  const { isCompact } = useResponsiveLayout();
  const horizontalPadding = isCompact ? theme.spacing.md : theme.spacing.lg;

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.contentWrap, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.content}>{children}</View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.porcelain
  },
  content: {
    alignSelf: "center",
    flex: 1,
    maxWidth: 760,
    width: "100%"
  },
  contentWrap: {
    flex: 1,
    paddingVertical: theme.spacing.md
  },
  scrollContent: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl
  }
});
