import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { theme } from "@/theme";

type ImageUploadTileProps = {
  count: number;
  onPress?: () => void;
};

export function ImageUploadTile({ count, onPress }: ImageUploadTileProps) {
  return (
    <AnimatedPressable
      accessibilityLabel={
        count > 0
          ? `${count} imagem(ns) selecionada(s). Toque para adicionar mais referências.`
          : "Adicionar imagens da peça ou referência."
      }
      accessibilityRole="button"
      onPress={onPress}
      pressedScale={0.982}
      style={[styles.tile, count > 0 ? styles.tileFilled : null]}
    >
      <View style={styles.iconWrap}>
        <Ionicons color={theme.colors.roseGoldDark} name={count > 0 ? "images-outline" : "camera-outline"} size={24} />
      </View>
      <Text style={styles.title}>Adicionar imagens</Text>
      <Text style={styles.caption}>
        {count > 0 ? `${count} imagem(ns) pronta(s) para envio` : "Roupas, referências ou detalhes"}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: theme.spacing.xs,
    justifyContent: "center",
    minHeight: 150,
    padding: theme.spacing.lg,
    ...theme.shadows.soft
  },
  tileFilled: {
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.roseGold
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  title: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  caption: {
    ...theme.typography.caption,
    color: theme.colors.taupe,
    textAlign: "center"
  }
});
