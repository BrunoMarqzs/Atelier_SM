import { useState } from "react";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text } from "react-native";

import { FadeInView } from "@/animations/FadeInView";
import { ElegantInput } from "@/components/common/ElegantInput";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { useAtelier } from "@/context/AtelierContext";
import { loginAdmin } from "@/services/api";
import { theme } from "@/theme";
import type { PublicStackParamList, RootStackParamList } from "@/types/navigation";

type Props = CompositeScreenProps<
  NativeStackScreenProps<PublicStackParamList, "AdminLogin">,
  NativeStackScreenProps<RootStackParamList>
>;

export function AdminLoginScreen({ navigation }: Props) {
  const atelier = useAtelier();
  const [email, setEmail] = useState("admin@ateliersibele.local");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function submit() {
    setLoading(true);
    setError(undefined);
    try {
      await loginAdmin({ email, password });
      await atelier.refresh();
      navigation.getParent()?.navigate("Admin", { screen: "AdminDashboard" });
    } catch {
      setError("Não foi possível acessar. Confira e-mail e senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        subtitle="Acesso reservado para gerenciamento do atelier."
        title="Administração"
      />
      <FadeInView>
        <PremiumSurface elevated style={styles.panel}>
          <Text style={styles.kicker}>Acesso administrativo</Text>
          <Text style={styles.title}>Painel Sibele Marques</Text>
          <Text style={styles.copy}>Entre com o e-mail administrativo e a senha cadastrada.</Text>
          <ElegantInput
            autoCapitalize="none"
            keyboardType="email-address"
            label="E-mail"
            onChangeText={setEmail}
            placeholder="admin@ateliersibele.local"
            value={email}
          />
          <ElegantInput
            label="Senha"
            onChangeText={setPassword}
            placeholder="Senha administrativa"
            secureTextEntry
            value={password}
          />
          {error ? <Notice message={error} tone="danger" /> : null}
          <PremiumButton
            disabled={loading}
            icon="shield-checkmark-outline"
            label={loading ? "Validando acesso..." : "Acessar painel"}
            onPress={submit}
          />
        </PremiumSurface>
      </FadeInView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: theme.spacing.md
  },
  kicker: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    ...theme.typography.section,
    color: theme.colors.ink
  },
  copy: {
    ...theme.typography.body,
    color: theme.colors.taupe
  }
});
