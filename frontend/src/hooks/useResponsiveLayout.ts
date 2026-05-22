import { useWindowDimensions } from "react-native";

export function useResponsiveLayout() {
  const { height, width } = useWindowDimensions();
  const isCompact = width < 380;
  const isNarrow = width < 520;

  return {
    height,
    isCompact,
    isNarrow,
    width
  };
}
