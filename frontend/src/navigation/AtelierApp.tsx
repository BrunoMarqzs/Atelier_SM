import { NavigationContainer, type LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { BookingProvider } from "@/context/BookingContext";
import { AtelierProvider } from "@/context/AtelierContext";
import { Notice } from "@/components/common/Notice";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { AdminNavigator } from "@/navigation/AdminNavigator";
import { ClientNavigator } from "@/navigation/ClientNavigator";
import { PublicNavigator } from "@/navigation/PublicNavigator";
import type { RootStackParamList } from "@/types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["http://localhost:8084", "https://ateliersibele.com"],
  config: {
    screens: {
      Public: {
        path: "",
        screens: {
          Home: "",
          ClientIdentity: "cliente",
          PublicRequest: "pedido/:code",
          AdminLogin: "admin"
        }
      },
      Client: "cliente/novo",
      Admin: "admin/painel"
    }
  }
};

export function AtelierApp() {
  const { online } = useNetworkStatus();

  return (
    <AtelierProvider>
      <BookingProvider>
        {!online ? (
          <Notice
            message="Você está sem conexão. Alguns dados podem não sincronizar até a internet voltar."
            title="Modo offline"
            tone="warning"
          />
        ) : null}
        <NavigationContainer linking={linking}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen component={PublicNavigator} name="Public" />
            <Stack.Screen component={ClientNavigator} name="Client" />
            <Stack.Screen component={AdminNavigator} name="Admin" />
          </Stack.Navigator>
        </NavigationContainer>
      </BookingProvider>
    </AtelierProvider>
  );
}
