import { useState } from "react";
import { CommonActions, type CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet } from "react-native";

import { FadeInView } from "@/animations/FadeInView";
import { ClientRequestHistoryCard } from "@/components/client/ClientRequestHistoryCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ElegantInput } from "@/components/common/ElegantInput";
import { LoadingState } from "@/components/common/LoadingState";
import { Notice } from "@/components/common/Notice";
import { PremiumButton } from "@/components/common/PremiumButton";
import { PremiumSurface } from "@/components/common/PremiumSurface";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { useBooking } from "@/context/BookingContext";
import { fetchClientRequestHistory } from "@/services/api";
import { theme } from "@/theme";
import type { AppointmentRequest } from "@/types/domain";
import type { PublicStackParamList, RootStackParamList } from "@/types/navigation";

type Props = CompositeScreenProps<
  NativeStackScreenProps<PublicStackParamList, "ClientIdentity">,
  NativeStackScreenProps<RootStackParamList>
>;

export function ClientIdentityScreen({ navigation }: Props) {
  const booking = useBooking();
  const [name, setName] = useState(booking.client?.name ?? "");
  const [phone, setPhone] = useState(booking.client?.phone ?? "");
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<AppointmentRequest[]>([]);

  function validateIdentity() {
    if (name.trim().length < 2 || phone.replace(/\D/g, "").length < 8) {
      setError("Informe nome e telefone para continuar.");
      return false;
    }
    setError("");
    booking.setClient({ name: name.trim(), phone: phone.trim() });
    return true;
  }

  async function consultHistory() {
    if (!validateIdentity()) {
      return;
    }
    setHistoryLoading(true);
    setHistoryError("");
    setHistoryLoaded(false);
    try {
      const loadedHistory = await fetchClientRequestHistory(phone.trim());
      setHistory(loadedHistory);
      setHistoryLoaded(true);
    } catch {
      setHistory([]);
      setHistoryLoaded(true);
      setHistoryError("Não foi possível conectar ao histórico agora. Tente novamente em alguns instantes.");
    } finally {
      setHistoryLoading(false);
    }
  }

  function startNewRequest() {
    if (!validateIdentity()) {
      return;
    }
    booking.clearDraft();
    navigation.getParent()?.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: "Public", params: { screen: "ClientIdentity" } },
          { name: "Client", params: { screen: "ServiceSelection" } }
        ]
      })
    );
  }

  return (
    <Screen>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        title="Como podemos te chamar?"
      />
      <FadeInView>
        <PremiumSurface elevated style={styles.form}>
          <ElegantInput label="Nome" onChangeText={setName} placeholder="Seu nome" value={name} />
          <ElegantInput
            keyboardType="phone-pad"
            label="Telefone"
            onChangeText={setPhone}
            placeholder="(00) 00000-0000"
            value={phone}
          />
          {error ? <Notice message={error} tone="warning" /> : null}
        </PremiumSurface>
      </FadeInView>
      <FadeInView delay={90}>
        <PremiumSurface style={styles.quickActions}>
          <PremiumButton
            disabled={historyLoading}
            icon="search-outline"
            label={historyLoading ? "Consultando histórico..." : "Consultar meus pedidos"}
            onPress={() => void consultHistory()}
          />
          <PremiumButton
            icon="add-outline"
            label="Criar novo pedido"
            onPress={startNewRequest}
            variant="secondary"
          />
        </PremiumSurface>
      </FadeInView>

      {historyLoading ? (
        <LoadingState
          message="Buscando pedidos vinculados a este telefone. No primeiro acesso, isso pode levar alguns segundos."
          title="Consultando pedidos"
        />
      ) : null}

      {historyError ? <Notice message={historyError} title="Histórico indisponível" tone="danger" /> : null}

      {historyLoaded ? (
        <FadeInView delay={80} style={styles.history}>
          {history.length > 0 ? (
            <>
              <Notice
                message="Encontramos pedidos vinculados a este telefone. Você pode acompanhar status, orçamento, comentários e fotos enviadas."
                title="Histórico localizado"
                tone="success"
              />
              {history.map((request) => (
                <ClientRequestHistoryCard
                  key={request.id}
                  onRescheduled={(updatedRequest) =>
                    setHistory((current) =>
                      current.map((item) => (item.id === updatedRequest.id ? updatedRequest : item))
                    )
                  }
                  phone={phone.trim()}
                  request={request}
                />
              ))}
            </>
          ) : (
            <EmptyState
              icon="file-tray-outline"
              message="Não encontramos pedidos para este telefone. Você pode criar uma nova solicitação usando o botão acima."
              title="Nenhum pedido encontrado"
            />
          )}
        </FadeInView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg
  },
  history: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg
  },
  quickActions: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm
  }
});
