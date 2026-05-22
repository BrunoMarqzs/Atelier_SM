import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AdminLoginScreen } from "@/screens/public/AdminLoginScreen";
import { ClientIdentityScreen } from "@/screens/public/ClientIdentityScreen";
import { HomeScreen } from "@/screens/public/HomeScreen";
import { PublicRequestScreen } from "@/screens/public/PublicRequestScreen";
import type { PublicStackParamList } from "@/types/navigation";

const Stack = createNativeStackNavigator<PublicStackParamList>();

export function PublicNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={HomeScreen} name="Home" />
      <Stack.Screen component={ClientIdentityScreen} name="ClientIdentity" />
      <Stack.Screen component={PublicRequestScreen} name="PublicRequest" />
      <Stack.Screen component={AdminLoginScreen} name="AdminLogin" />
    </Stack.Navigator>
  );
}
