import { StyleSheet, Text, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { theme } from "@/theme";

type PremiumButtonProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "secondary" | "ghost";
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
};

export function PremiumButton({
  label,
  icon,
  variant = "primary",
  onPress,
  style,
  disabled = false
}: PremiumButtonProps) {
  return (
    <AnimatedPressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      pressedScale={0.976}
      style={[
        styles.base,
        styles[variant],
        variant === "primary" ? theme.shadows.button : null,
        disabled ? styles.disabled : null,
        style
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={[theme.colors.roseGoldLight, theme.colors.roseGold, theme.colors.burgundy]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.gradientFill}
        />
      ) : null}
      {icon ? (
        <Ionicons
          color={variant === "primary" ? theme.colors.white : theme.colors.roseGoldDark}
          name={icon}
          size={18}
          style={styles.icon}
        />
      ) : null}
      <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    minHeight: 52,
    overflow: "hidden",
    paddingHorizontal: theme.spacing.lg
  },
  primary: {
    backgroundColor: theme.colors.roseGold
  },
  secondary: {
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderWidth: 1,
    ...theme.shadows.soft
  },
  ghost: {
    backgroundColor: "transparent"
  },
  disabled: {
    opacity: 0.48
  },
  label: {
    ...theme.typography.body,
    flexShrink: 1,
    fontWeight: "700",
    textAlign: "center",
    zIndex: 1
  },
  primaryLabel: {
    color: theme.colors.white
  },
  secondaryLabel: {
    color: theme.colors.roseGoldDark
  },
  ghostLabel: {
    color: theme.colors.roseGoldDark
  },
  icon: {
    zIndex: 1
  },
  gradientFill: {
    ...StyleSheet.absoluteFillObject
  }
});
