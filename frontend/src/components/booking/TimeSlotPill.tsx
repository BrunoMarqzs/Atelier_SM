import { StyleSheet, Text } from "react-native";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { theme } from "@/theme";
import type { TimeSlot } from "@/types/domain";

type TimeSlotPillProps = {
  slot: TimeSlot;
  selected?: boolean;
  allowUnavailablePress?: boolean;
  onPress?: () => void;
};

export function TimeSlotPill({
  slot,
  selected = false,
  allowUnavailablePress = false,
  onPress
}: TimeSlotPillProps) {
  const disabled = !slot.available && !allowUnavailablePress;
  const statusLabel = slot.status === "booked" ? "Reservado" : slot.status === "blocked" ? "Bloqueado" : "";

  return (
    <AnimatedPressable
      accessibilityLabel={`Horário ${slot.label}${statusLabel ? `, ${statusLabel}` : ", disponível"}`}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      pressedScale={0.95}
      style={[
        styles.base,
        selected ? styles.selected : null,
        slot.status === "booked" ? styles.booked : null,
        slot.status === "blocked" ? styles.blocked : null,
        disabled ? styles.disabled : null
      ]}
    >
      <Text style={[styles.label, selected ? styles.selectedLabel : null]}>{slot.label}</Text>
      {statusLabel ? <Text style={[styles.status, selected ? styles.selectedLabel : null]}>{statusLabel}</Text> : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
    minWidth: 92,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.soft
  },
  selected: {
    backgroundColor: theme.colors.roseGold,
    borderColor: theme.colors.roseGold,
    ...theme.shadows.button
  },
  disabled: {
    opacity: 0.35
  },
  booked: {
    backgroundColor: theme.colors.dangerSoft,
    borderColor: theme.colors.roseGold
  },
  blocked: {
    backgroundColor: theme.colors.champagne,
    borderColor: theme.colors.taupe
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.graphite,
    fontWeight: "700"
  },
  selectedLabel: {
    color: theme.colors.white
  },
  status: {
    ...theme.typography.caption,
    color: theme.colors.taupe,
    fontSize: 10,
    marginTop: 2
  }
});
