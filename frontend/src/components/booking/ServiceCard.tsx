import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { theme } from "@/theme";
import type { Service } from "@/types/domain";
import { formatMoney } from "@/utils/format";

type ServiceCardProps = {
  service: Service;
  selected?: boolean;
  onPress?: () => void;
};

export function ServiceCard({ service, selected = false, onPress }: ServiceCardProps) {
  const price = service.priceType === "fixed" ? formatMoney(service.fixedPrice ?? 0) : "Valor sob avaliação";

  return (
    <AnimatedPressable
      accessibilityLabel={`${service.name}. ${price}. Duração de ${service.durationMinutes} minutos.`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      pressedScale={0.988}
      style={[styles.card, selected ? styles.selected : null]}
    >
      <View style={[styles.iconWrap, selected ? styles.iconWrapSelected : null]}>
        <Ionicons
          color={selected ? theme.colors.white : theme.colors.roseGoldDark}
          name="sparkles-outline"
          size={20}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.category}>{service.category}</Text>
          {service.highlighted ? <Text style={styles.highlight}>Destaque</Text> : null}
        </View>
        <Text style={styles.name}>{service.name}</Text>
        <Text style={styles.description}>{service.description}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{service.durationMinutes} min</Text>
          <Text style={styles.price}>{price}</Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    overflow: "hidden",
    padding: theme.spacing.md,
    ...theme.shadows.soft
  },
  selected: {
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.roseGold,
    borderWidth: 1.5,
    ...theme.shadows.float
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  iconWrapSelected: {
    backgroundColor: theme.colors.roseGold,
    borderColor: theme.colors.roseGold
  },
  content: {
    flex: 1,
    gap: theme.spacing.xs
  },
  heading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  category: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    textTransform: "uppercase"
  },
  highlight: {
    ...theme.typography.caption,
    backgroundColor: theme.colors.successSoft,
    borderColor: theme.colors.success,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    color: theme.colors.success,
    overflow: "hidden",
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2
  },
  name: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.graphite
  },
  metaRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    marginTop: theme.spacing.xs
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.taupe
  },
  price: {
    ...theme.typography.caption,
    color: theme.colors.ink,
    fontWeight: "700"
  }
});
