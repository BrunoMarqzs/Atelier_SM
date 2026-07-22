import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/animations/AnimatedPressable";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { AdminAnnouncementsScreen } from "@/screens/admin/AdminAnnouncementsScreen";
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

const adminTabs: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  name: keyof AdminStackParamList;
  title: string;
}> = [
  { icon: "grid-outline", name: "AdminDashboard", title: "Painel" },
  { icon: "megaphone-outline", name: "AdminAnnouncements", title: "Vitrine" },
  { icon: "file-tray-full-outline", name: "AdminRequests", title: "Pedidos" },
  { icon: "calendar-outline", name: "AdminAgenda", title: "Agenda" },
  { icon: "cut-outline", name: "AdminServices", title: "Serviços" },
  { icon: "options-outline", name: "AdminSchedule", title: "Regras" },
  { icon: "bar-chart-outline", name: "AdminReports", title: "Relatórios" },
  { icon: "shield-checkmark-outline", name: "AdminAudit", title: "Auditoria" },
  { icon: "notifications-outline", name: "AdminNotifications", title: "Avisos" }
];

function AdminMobileHeader({
  navigation,
  routeName
}: {
  navigation: { navigate: (screen: keyof AdminStackParamList) => void };
  routeName: keyof AdminStackParamList;
}) {
  const [open, setOpen] = useState(false);
  const currentTab = adminTabs.find((tab) => tab.name === routeName);

  function navigateTo(name: keyof AdminStackParamList) {
    setOpen(false);
    navigation.navigate(name);
  }

  return (
    <>
      <View style={styles.mobileHeader}>
        <AnimatedPressable
          accessibilityLabel="Abrir menu administrativo"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setOpen(true)}
          pressedScale={0.94}
          style={styles.menuButton}
        >
          <Ionicons color={theme.colors.ink} name="menu-outline" size={28} />
        </AnimatedPressable>
        <View style={styles.headerText}>
          <Text style={styles.headerKicker}>Atelier Sibele Marques</Text>
          <Text style={styles.headerTitle}>{currentTab?.title ?? "Administração"}</Text>
        </View>
      </View>

      <Modal animationType="fade" transparent visible={open}>
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel="Fechar menu"
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={styles.backdrop}
          />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerKicker}>Administração</Text>
                <Text style={styles.drawerTitle}>Menu do atelier</Text>
              </View>
              <AnimatedPressable
                accessibilityLabel="Fechar menu"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setOpen(false)}
                pressedScale={0.94}
                style={styles.closeButton}
              >
                <Ionicons color={theme.colors.ink} name="close-outline" size={24} />
              </AnimatedPressable>
            </View>

            <View style={styles.menuList}>
              {adminTabs.map((tab) => {
                const active = routeName === tab.name;
                return (
                  <AnimatedPressable
                    accessibilityLabel={`Abrir ${tab.title}`}
                    accessibilityRole="button"
                    key={tab.name}
                    onPress={() => navigateTo(tab.name)}
                    pressedScale={0.98}
                    style={[styles.menuItem, active ? styles.menuItemActive : null]}
                  >
                    <Ionicons
                      color={active ? theme.colors.white : theme.colors.roseGoldDark}
                      name={tab.icon}
                      size={20}
                    />
                    <Text style={[styles.menuItemText, active ? styles.menuItemTextActive : null]}>
                      {tab.title}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function AdminNavigator() {
  const { isNarrow } = useResponsiveLayout();

  return (
    <Tab.Navigator
      screenOptions={({ navigation, route }) => ({
        header: () => (
          <AdminMobileHeader
            navigation={navigation}
            routeName={route.name as keyof AdminStackParamList}
          />
        ),
        headerShown: isNarrow,
        tabBarActiveTintColor: theme.colors.roseGoldDark,
        tabBarInactiveTintColor: theme.colors.taupe,
        tabBarStyle: {
          backgroundColor: theme.colors.ivory,
          borderTopColor: theme.colors.line,
          display: isNarrow ? "none" : "flex",
          height: 76,
          paddingBottom: 12,
          paddingTop: 8
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700"
        },
        tabBarIcon: ({ color, size }) => {
          const icon = adminTabs.find((tab) => tab.name === route.name)?.icon ?? "ellipse-outline";
          return <Ionicons color={color} name={icon} size={size} />;
        }
      })}
    >
      <Tab.Screen component={AdminDashboardScreen} name="AdminDashboard" options={{ title: "Painel" }} />
      <Tab.Screen component={AdminAnnouncementsScreen} name="AdminAnnouncements" options={{ title: "Vitrine" }} />
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

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  drawer: {
    backgroundColor: theme.colors.ivory,
    borderBottomRightRadius: theme.radius.lg,
    borderRightColor: theme.colors.line,
    borderRightWidth: 1,
    borderTopRightRadius: theme.radius.lg,
    gap: theme.spacing.lg,
    height: "100%",
    maxWidth: 330,
    padding: theme.spacing.lg,
    width: "84%",
    ...theme.shadows.float
  },
  drawerHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing.md,
    justifyContent: "space-between"
  },
  drawerKicker: {
    ...theme.typography.caption,
    color: theme.colors.roseGoldDark,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  drawerTitle: {
    ...theme.typography.section,
    color: theme.colors.ink,
    marginTop: 2
  },
  headerKicker: {
    ...theme.typography.caption,
    color: theme.colors.taupe,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  headerText: {
    flex: 1,
    minWidth: 0
  },
  headerTitle: {
    ...theme.typography.section,
    color: theme.colors.ink,
    marginTop: 2
  },
  menuButton: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
    ...theme.shadows.soft
  },
  menuItem: {
    alignItems: "center",
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md
  },
  menuItemActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink
  },
  menuItemText: {
    ...theme.typography.body,
    color: theme.colors.graphite,
    fontWeight: "800"
  },
  menuItemTextActive: {
    color: theme.colors.white
  },
  menuList: {
    gap: theme.spacing.sm
  },
  mobileHeader: {
    alignItems: "center",
    backgroundColor: theme.colors.porcelain,
    borderBottomColor: theme.colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md
  },
  overlay: {
    backgroundColor: "rgba(31, 26, 24, 0.38)",
    flex: 1
  }
});
