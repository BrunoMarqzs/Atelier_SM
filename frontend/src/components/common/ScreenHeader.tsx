import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { FadeInView } from "@/animations/FadeInView";
import { theme } from "@/theme";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
};

export function ScreenHeader({ title, subtitle, onBack }: ScreenHeaderProps) {
  return (
    <FadeInView distance={8} style={styles.container}>
      {onBack ? (
        <AnimatedPressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          pressedScale={0.92}
          style={styles.backButton}
        >
          <Ionicons color={theme.colors.ink} name="chevron-back" size={22} />
        </AnimatedPressable>
      ) : null}
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg
  },
  backButton: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
    ...theme.shadows.soft
  },
  textBlock: {
    flex: 1,
    minWidth: 0
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.ink,
    flexShrink: 1
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.taupe,
    marginTop: 2
  }
});
