import { type PropsWithChildren } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { theme } from "@/theme";

type PremiumSurfaceProps = PropsWithChildren<{
  elevated?: boolean;
  style?: ViewStyle | ViewStyle[];
}>;

export function PremiumSurface({ children, elevated = false, style }: PremiumSurfaceProps) {
  return <View style={[styles.surface, elevated ? styles.elevated : null, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    padding: theme.spacing.lg,
    ...theme.shadows.soft
  },
  elevated: {
    ...theme.shadows.float
  }
});
