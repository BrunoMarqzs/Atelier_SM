import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { ImageBackground, Linking, StyleSheet, Text, View } from "react-native";

import { FadeInView } from "@/animations/FadeInView";
import { EmptyState } from "@/components/common/EmptyState";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { PwaInstallCard } from "@/components/common/PwaInstallCard";
import { Screen } from "@/components/common/Screen";
import { useAtelier } from "@/context/AtelierContext";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { theme } from "@/theme";
import type { AnnouncementKind } from "@/types/domain";
import type { PublicStackParamList, RootStackParamList } from "@/types/navigation";

const heroImage = require("@/assets/images/atelier-hero-editorial.png");

type HomeProps = CompositeScreenProps<
  NativeStackScreenProps<PublicStackParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;

function announcementKindLabel(kind: AnnouncementKind) {
  if (kind === "promotion") {
    return "Promoção";
  }
  if (kind === "notice") {
    return "Aviso";
  }
  if (kind === "schedule") {
    return "Agenda";
  }
  return "Novidade";
}

export function HomeScreen({ navigation }: HomeProps) {
  const { announcements } = useAtelier();
  const { height, isCompact } = useResponsiveLayout();
  const featuredAnnouncements = announcements.filter((announcement) => announcement.isActive).slice(0, 3);
  const heroHeight = Math.max(isCompact ? 360 : 390, Math.min(430, height * 0.68));

  function handleAnnouncementAction(announcement: (typeof featuredAnnouncements)[number]) {
    if (announcement.ctaAction === "create_order" || announcement.ctaAction === "client_history") {
      navigation.navigate("ClientIdentity");
      return;
    }
    if (announcement.ctaAction === "external_url" && announcement.ctaUrl) {
      void Linking.openURL(announcement.ctaUrl);
    }
  }

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

      <FadeInView delay={135}>
        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>Endereco do atelier</Text>
          <Text style={styles.addressText}>Rua Matarazzo, 119</Text>
          <Text style={styles.addressMuted}>Bairro Santa Filomena</Text>
        </View>
      </FadeInView>

      <FadeInView delay={150}>
        <PwaInstallCard />
      </FadeInView>

      <FadeInView delay={180} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Novidades do atelier</Text>
        <Text style={styles.sectionCopy}>Promoções, avisos e agenda em destaque.</Text>
      </FadeInView>

      <View style={styles.list}>
        {featuredAnnouncements.length > 0 ? (
          featuredAnnouncements.map((announcement, index) => (
            <FadeInView delay={240 + index * 80} key={announcement.id}>
              <PremiumSurface elevated style={styles.announcementCard}>
                <View style={styles.announcementHeader}>
                  <Text style={styles.announcementKicker}>{announcementKindLabel(announcement.kind)}</Text>
                  {announcement.endsAt ? (
                    <Text style={styles.announcementDate}>
                      Até {new Date(announcement.endsAt).toLocaleDateString("pt-BR")}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.announcementTitle}>{announcement.title}</Text>
                <Text style={styles.announcementBody}>{announcement.body}</Text>
                {announcement.ctaAction !== "none" && announcement.ctaLabel ? (
                  <PremiumButton
                    icon={announcement.ctaAction === "external_url" ? "open-outline" : "sparkles-outline"}
                    label={announcement.ctaLabel}
                    onPress={() => handleAnnouncementAction(announcement)}
                    variant={index === 0 ? "primary" : "secondary"}
                  />
                ) : null}
              </PremiumSurface>
            </FadeInView>
          ))
        ) : (
          <EmptyState
            icon="megaphone-outline"
            message="Promoções e avisos importantes aparecerão aqui assim que forem publicados."
            title="Novidades em preparação"
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
  addressCard: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.champagne,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 2,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    ...theme.shadows.soft
  },
  addressLabel: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  addressText: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  addressMuted: {
    ...theme.typography.body,
    color: theme.colors.taupe
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
  },
  announcementCard: {
    gap: theme.spacing.md
  },
  announcementHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    justifyContent: "space-between"
  },
  announcementKicker: {
    ...theme.typography.caption,
    backgroundColor: theme.colors.champagneSoft,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    textTransform: "uppercase"
  },
  announcementDate: {
    ...theme.typography.caption,
    color: theme.colors.taupe,
    fontWeight: "700"
  },
  announcementTitle: {
    ...theme.typography.title,
    color: theme.colors.ink
  },
  announcementBody: {
    ...theme.typography.body,
    color: theme.colors.graphite
  }
});
