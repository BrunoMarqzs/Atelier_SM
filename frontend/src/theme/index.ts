import { colors } from "./colors";
import { shadows } from "./shadows";
import { spacing } from "./spacing";
import { typography } from "./typography";

export const theme = {
  colors,
  spacing,
  typography,
  shadows,
  radius: {
    xs: 6,
    sm: 8,
    md: 14,
    lg: 20,
    pill: 999
  }
} as const;

export type AtelierTheme = typeof theme;
