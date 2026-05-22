import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { AdminAgendaScreen } from "@/screens/admin/AdminAgendaScreen";
import { AdminAuditScreen } from "@/screens/admin/AdminAuditScreen";
import { AdminDashboardScreen } from "@/screens/admin/AdminDashboardScreen";
import { AdminNotificationsScreen } from "@/screens/admin/AdminNotificationsScreen";
import { AdminReportsScreen } from "@/screens/admin/AdminReportsScreen";
import { AdminRequestsScreen } from "@/screens/admin/AdminRequestsScreen";
import { AdminScheduleScreen } from "@/screens/admin/AdminScheduleScreen";
import { AdminServicesScreen } from "@/screens/admin/AdminServicesScreen";
import { theme } from "@/theme";
import type { AdminStackParamList } from "@/types/navigation";

const Tab = createBottomTabNavigator<AdminStackParamList>();

export function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.roseGoldDark,
        tabBarInactiveTintColor: theme.colors.taupe,
        tabBarStyle: {
          backgroundColor: theme.colors.ivory,
          borderTopColor: theme.colors.line,
          height: 76,
          paddingBottom: 12,
          paddingTop: 8
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700"
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<keyof AdminStackParamList, keyof typeof Ionicons.glyphMap> = {
            AdminDashboard: "grid-outline",
            AdminRequests: "file-tray-full-outline",
            AdminAgenda: "calendar-outline",
            AdminServices: "cut-outline",
            AdminAudit: "shield-checkmark-outline",
            AdminNotifications: "notifications-outline",
            AdminSchedule: "options-outline",
            AdminReports: "bar-chart-outline"
          };
          return <Ionicons color={color} name={icons[route.name]} size={size} />;
        }
      })}
    >
      <Tab.Screen component={AdminDashboardScreen} name="AdminDashboard" options={{ title: "Painel" }} />
      <Tab.Screen component={AdminRequestsScreen} name="AdminRequests" options={{ title: "Pedidos" }} />
      <Tab.Screen component={AdminAgendaScreen} name="AdminAgenda" options={{ title: "Agenda" }} />
      <Tab.Screen component={AdminServicesScreen} name="AdminServices" options={{ title: "Serviços" }} />
      <Tab.Screen component={AdminScheduleScreen} name="AdminSchedule" options={{ title: "Regras" }} />
      <Tab.Screen component={AdminReportsScreen} name="AdminReports" options={{ title: "Relatórios" }} />
      <Tab.Screen component={AdminAuditScreen} name="AdminAudit" options={{ title: "Auditoria" }} />
      <Tab.Screen component={AdminNotificationsScreen} name="AdminNotifications" options={{ title: "Avisos" }} />
    </Tab.Navigator>
  );
}
