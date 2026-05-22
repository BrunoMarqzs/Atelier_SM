import { Platform, type ViewStyle } from "react-native";

import { colors } from "./colors";

const nativeSoft: ViewStyle = {
  shadowColor: colors.black,
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.07,
  shadowRadius: 26,
  elevation: 5
};

const nativeFloat: ViewStyle = {
  shadowColor: colors.roseGoldDark,
  shadowOffset: { width: 0, height: 18 },
  shadowOpacity: 0.14,
  shadowRadius: 34,
  elevation: 7
};

const nativeButton: ViewStyle = {
  shadowColor: colors.roseGoldDark,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 14,
  elevation: 4
};

export const shadows = {
  soft: Platform.select({
    web: { boxShadow: "0px 12px 26px rgba(31, 26, 24, 0.07)" },
    default: nativeSoft
  }) as ViewStyle,
  float: Platform.select({
    web: { boxShadow: "0px 18px 38px rgba(142, 95, 85, 0.16)" },
    default: nativeFloat
  }) as ViewStyle,
  button: Platform.select({
    web: { boxShadow: "0px 12px 22px rgba(142, 95, 85, 0.22)" },
    default: nativeButton
  }) as ViewStyle
} as const;
