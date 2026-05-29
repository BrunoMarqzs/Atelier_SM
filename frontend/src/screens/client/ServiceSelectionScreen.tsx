import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";

import { FadeInView } from "@/animations/FadeInView";
import { EmptyState } from "@/components/common/EmptyState";
import { PremiumButton } from "@/components/common/PremiumButton";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { ServiceCard } from "@/components/booking/ServiceCard";
import { useAtelier } from "@/context/AtelierContext";
import { useBooking } from "@/context/BookingContext";
import { theme } from "@/theme";
import type { ClientStackParamList } from "@/types/navigation";

type Props = NativeStackScreenProps<ClientStackParamList, "ServiceSelection">;

export function ServiceSelectionScreen({ navigation }: Props) {
  const { services } = useAtelier();
  const booking = useBooking();
  const hasSelectedService = Boolean(booking.service);

  return (
    <Screen>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        subtitle="Escolha o atendimento ideal para sua peça."
        title="Selecione o serviço"
      />
      <View style={styles.list}>
        {services.length > 0 ? (
          services.map((service, index) => (
            <FadeInView delay={80 * index} key={service.id}>
              <ServiceCard
                onPress={() => booking.setService(service)}
                selected={booking.service?.id === service.id}
                service={service}
              />
            </FadeInView>
          ))
        ) : (
          <EmptyState
            icon="sparkles-outline"
            message="O catálogo será exibido assim que os serviços estiverem sincronizados."
            title="Serviços indisponíveis"
          />
        )}
      </View>
      <FadeInView delay={120 + services.length * 70}>
        <PremiumButton
          disabled={!hasSelectedService}
          icon="calendar-outline"
          label={hasSelectedService ? "Escolher horário" : "Selecione um serviço"}
          onPress={() => navigation.navigate("Schedule")}
          style={styles.action}
        />
      </FadeInView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.md
  },
  action: {
    marginTop: theme.spacing.lg
  }
});
