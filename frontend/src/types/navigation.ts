import type { NavigatorScreenParams } from "@react-navigation/native";

export type PublicStackParamList = {
  Home: undefined;
  ClientIdentity: undefined;
  PublicRequest: { code: string };
  AdminLogin: undefined;
};

export type ClientStackParamList = {
  ServiceSelection: undefined;
  Schedule: undefined;
  RequestDetails: undefined;
  Confirmation: { requestId: number; publicCode?: string; publicUrl?: string };
};

export type AdminStackParamList = {
  AdminDashboard: undefined;
  AdminRequests: undefined;
  AdminAgenda: undefined;
  AdminServices: undefined;
  AdminAudit: undefined;
  AdminNotifications: undefined;
  AdminSchedule: undefined;
  AdminReports: undefined;
};

export type RootStackParamList = {
  Public: NavigatorScreenParams<PublicStackParamList>;
  Client: NavigatorScreenParams<ClientStackParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
};
