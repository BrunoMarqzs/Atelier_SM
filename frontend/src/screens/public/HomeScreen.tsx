import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { ImageBackground, StyleSheet, Text, View } from "react-native";

import { FadeInView } from "@/animations/FadeInView";
import { ServiceCard } from "@/components/booking/ServiceCard";
import { EmptyState } from "@/components/common/EmptyState";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PwaInstallCard } from "@/components/common/PwaInstallCard";
import { Screen } from "@/components/common/Screen";
import { useAtelier } from "@/context/AtelierContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { theme } from "@/theme";
import type { PublicStackParamList, RootStackParamList } from "@/types/navigation";

const heroImage = require("@/assets/images/atelier-hero-editorial.png");

type HomeProps = CompositeScreenProps<
  NativeStackScreenProps<PublicStackParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: HomeProps) {
  const { services } = useAtelier();
  const { height, isCompact } = useResponsiveLayout();
  const highlightedServices = services.filter((service) => service.highlighted).slice(0, 2);
  const heroHeight = Math.max(isCompact ? 360 : 390, Math.min(430, height * 0.68));

  return (
    <Screen>
      <FadeInView distance={14}>
        <ImageBackground imageStyle={styles.heroImage} source={heroImage} style={[styles.hero, { minHeight: heroHeight }]}>
          <LinearGradient
            colors={["rgba(31,26,24,0.08)", "rgba(31,26,24,0.38)", "rgba(31,26,24,0.72)"]}
            style={styles.heroOverlay}
          >
            <View style={styles.brandMark}>
              <Text style={styles.brandInitials}>SM</Text>
            </View>
            <View style={styles.heroContent}>
              <Text style={styles.eyebrow}>Atelier de costura premium</Text>
              <Text style={styles.brand}>Atelier Sibele Marques</Text>
              <Text style={styles.slogan}>Um toque de classe</Text>
              <Text style={styles.copy}>
                Ajustes, reformas e criações sob medida com acabamento delicado e atendimento cuidadoso.
              </Text>
              <View style={styles.heroChips}>
                <Text style={styles.heroChip}>Moda festa</Text>
                <Text style={styles.heroChip}>Ajustes finos</Text>
                <Text style={styles.heroChip}>Sob avaliação</Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </FadeInView>

      <FadeInView delay={120} style={styles.actions}>
        <PremiumButton
          icon="person-outline"
          label="Entrar como Cliente"
          onPress={() => navigation.navigate("ClientIdentity")}
        />
        <PremiumButton
          icon="lock-closed-outline"
          label="Entrar como Administrador"
          onPress={() => navigation.navigate("AdminLogin")}
          variant="secondary"
        />
      </FadeInView>

      <FadeInView delay={150}>
        <PwaInstallCard />
      </FadeInView>

      <FadeInView delay={180} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Serviços em destaque</Text>
        <Text style={styles.sectionCopy}>Escolhas frequentes para peças especiais.</Text>
      </FadeInView>

      <View style={styles.list}>
        {highlightedServices.length > 0 ? (
          highlightedServices.map((service, index) => (
            <FadeInView delay={240 + index * 80} key={service.id}>
              <ServiceCard service={service} />
            </FadeInView>
          ))
        ) : (
          <EmptyState
            icon="sparkles-outline"
            message="Os serviços serão exibidos assim que o catálogo estiver sincronizado."
            title="Catálogo em preparação"
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    ...theme.shadows.float
  },
  heroImage: {
    borderRadius: theme.radius.lg
  },
  heroOverlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: theme.spacing.lg
  },
  brandMark: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "rgba(255, 253, 252, 0.78)",
    borderColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  brandInitials: {
    ...theme.typography.caption,
    color: theme.colors.burgundy,
    fontWeight: "700"
  },
  heroContent: {
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xl
  },
  eyebrow: {
    ...theme.typography.caption,
    color: theme.colors.champagne,
    textTransform: "uppercase"
  },
  brand: {
    ...theme.typography.brand,
    color: theme.colors.white,
    maxWidth: 460
  },
  slogan: {
    ...theme.typography.section,
    color: theme.colors.champagne,
    marginTop: theme.spacing.xs
  },
  copy: {
    ...theme.typography.body,
    color: theme.colors.ivory,
    marginTop: theme.spacing.md,
    maxWidth: 520
  },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md
  },
  heroChip: {
    ...theme.typography.caption,
    backgroundColor: "rgba(255, 253, 252, 0.18)",
    borderColor: "rgba(255, 253, 252, 0.32)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    color: theme.colors.white,
    overflow: "hidden",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.xl
  },
  sectionTitle: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  sectionCopy: {
    ...theme.typography.body,
    color: theme.colors.taupe,
    marginTop: 2
  },
  list: {
    gap: theme.spacing.md
  }
});
