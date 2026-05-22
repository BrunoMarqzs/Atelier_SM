import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { theme } from "@/theme";

export function PwaInstallCard() {
  const { canInstall, install, installed } = usePwaInstallPrompt();

  if (Platform.OS !== "web" || installed) {
    return null;
  }

  return (
    <PremiumSurface style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons color={theme.colors.roseGoldDark} name="phone-portrait-outline" size={20} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Use como aplicativo</Text>
          <Text style={styles.message}>
            Instale o Atelier na tela inicial do celular para abrir mais rápido pelo navegador.
          </Text>
        </View>
      </View>
      {canInstall ? (
        <PremiumButton
          icon="download-outline"
          label="Instalar web app"
          onPress={() => void install()}
          variant="secondary"
        />
      ) : (
        <Text style={styles.hint}>No celular, use a opção "Adicionar à tela inicial" do navegador.</Text>
      )}
    </PremiumSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  textBlock: {
    flex: 1,
    gap: theme.spacing.xxs
  },
  title: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.graphite
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.taupe
  }
});

