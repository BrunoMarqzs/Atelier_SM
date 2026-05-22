import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ConfirmationScreen } from "@/screens/client/ConfirmationScreen";
import { RequestDetailsScreen } from "@/screens/client/RequestDetailsScreen";
import { ScheduleScreen } from "@/screens/client/ScheduleScreen";
import { ServiceSelectionScreen } from "@/screens/client/ServiceSelectionScreen";
import type { ClientStackParamList } from "@/types/navigation";

const Stack = createNativeStackNavigator<ClientStackParamList>();

export function ClientNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={ServiceSelectionScreen} name="ServiceSelection" />
      <Stack.Screen component={ScheduleScreen} name="Schedule" />
      <Stack.Screen component={RequestDetailsScreen} name="RequestDetails" />
      <Stack.Screen component={ConfirmationScreen} name="Confirmation" />
    </Stack.Navigator>
  );
}
