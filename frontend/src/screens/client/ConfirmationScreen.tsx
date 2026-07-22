import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CompositeScreenProps } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { FadeInView } from "@/animations/FadeInView";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { Screen } from "@/components/common/Screen";
import { useBooking } from "@/context/BookingContext";
import { theme } from "@/theme";
import type { ClientStackParamList, RootStackParamList } from "@/types/navigation";

type Props = CompositeScreenProps<
  NativeStackScreenProps<ClientStackParamList, "Confirmation">,
  NativeStackScreenProps<RootStackParamList>
>;

export function ConfirmationScreen({ navigation, route }: Props) {
  const booking = useBooking();

  function finish() {
    booking.reset();
    navigation.getParent()?.navigate("Public", { screen: "Home" });
  }

  return (
    <Screen scroll={false}>
      <View style={styles.content}>
        <FadeInView style={styles.fade}>
          <PremiumSurface elevated style={styles.panel}>
          <LinearGradient
            colors={[theme.colors.success, theme.colors.sage]}
            style={styles.iconWrap}
          >
            <Ionicons color={theme.colors.white} name="checkmark" size={42} />
          </LinearGradient>
          <Text style={styles.title}>Solicitação recebida</Text>
          <Text style={styles.copy}>
            Pedido #{route.params.requestId} registrado. O atelier avaliará as informações e entrará em contato pelo telefone informado.
          </Text>
          <PremiumSurface style={styles.addressCard}>
            <Text style={styles.addressLabel}>Endereco do atendimento</Text>
            <Text style={styles.addressText}>Rua Matarazzo, 119</Text>
            <Text style={styles.addressMuted}>Bairro Santa Filomena</Text>
          </PremiumSurface>
          {route.params.publicCode ? (
            <PremiumSurface style={styles.publicCard}>
              <Text style={styles.publicLabel}>Link de acompanhamento</Text>
              <Text style={styles.publicCode}>{route.params.publicCode}</Text>
              {route.params.publicUrl ? <Text style={styles.publicUrl}>{route.params.publicUrl}</Text> : null}
            </PremiumSurface>
          ) : null}
          {route.params.publicCode ? (
            <PremiumButton
              icon="open-outline"
              label="Acompanhar pedido"
              onPress={() =>
                navigation.getParent()?.navigate("Public", {
                  screen: "PublicRequest",
                  params: { code: route.params.publicCode ?? "" }
                })
              }
              variant="secondary"
            />
          ) : null}
          <PremiumButton icon="home-outline" label="Voltar ao início" onPress={finish} />
          </PremiumSurface>
        </FadeInView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center"
  },
  fade: {
    width: "100%"
  },
  panel: {
    alignItems: "center",
    gap: theme.spacing.lg
  },
  iconWrap: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: theme.colors.success,
    borderRadius: theme.radius.pill,
    height: 86,
    justifyContent: "center",
    width: 86
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.ink,
    textAlign: "center"
  },
  copy: {
    ...theme.typography.body,
    color: theme.colors.graphite,
    textAlign: "center"
  },
  addressCard: {
    alignSelf: "stretch",
    backgroundColor: theme.colors.white,
    gap: 2
  },
  addressLabel: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase"
  },
  addressText: {
    ...theme.typography.section,
    color: theme.colors.ink,
    textAlign: "center"
  },
  addressMuted: {
    ...theme.typography.body,
    color: theme.colors.taupe,
    textAlign: "center"
  },
  publicCard: {
    alignSelf: "stretch",
    backgroundColor: theme.colors.champagneSoft,
    gap: theme.spacing.xxs
  },
  publicLabel: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase"
  },
  publicCode: {
    ...theme.typography.section,
    color: theme.colors.ink,
    textAlign: "center"
  },
  publicUrl: {
    ...theme.typography.caption,
    color: theme.colors.graphite,
    textAlign: "center"
  }
});
