import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { theme } from "@/theme";

type ImagePreviewProps = {
  uri: string;
  height?: number;
};

export function ImagePreview({ uri, height = 220 }: ImagePreviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AnimatedPressable
        accessibilityLabel="Ampliar imagem enviada"
        accessibilityRole="imagebutton"
        onPress={() => setOpen(true)}
        pressedScale={0.988}
        style={styles.preview}
      >
        <Image resizeMode="cover" source={{ uri }} style={[styles.thumbnail, { height }]} />
        <View style={styles.hint}>
          <Ionicons color={theme.colors.white} name="expand-outline" size={15} />
          <Text style={styles.hintText}>Ampliar</Text>
        </View>
      </AnimatedPressable>
      <Modal animationType="fade" transparent visible={open}>
        <View style={styles.modal}>
          <Pressable
            accessibilityLabel="Fechar imagem ampliada"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => setOpen(false)}
            style={styles.closeButton}
          >
            <Ionicons color={theme.colors.white} name="close" size={28} />
          </Pressable>
          <Image resizeMode="contain" source={{ uri }} style={styles.fullImage} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    overflow: "hidden",
    ...theme.shadows.soft
  },
  thumbnail: {
    backgroundColor: theme.colors.champagne,
    width: "100%"
  },
  hint: {
    alignItems: "center",
    backgroundColor: "rgba(31, 26, 24, 0.66)",
    borderRadius: theme.radius.pill,
    bottom: theme.spacing.sm,
    flexDirection: "row",
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    position: "absolute",
    right: theme.spacing.sm
  },
  hintText: {
    ...theme.typography.caption,
    color: theme.colors.white
  },
  modal: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    flex: 1,
    justifyContent: "center"
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing.lg,
    top: theme.spacing.xl,
    zIndex: 2
  },
  fullImage: {
    height: "86%",
    width: "94%"
  }
});
