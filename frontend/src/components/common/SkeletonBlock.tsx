import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

import { theme } from "@/theme";

type SkeletonBlockProps = {
  height?: number;
};

export function SkeletonBlock({ height = 96 }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.42)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          duration: 820,
          toValue: 0.82,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          duration: 820,
          toValue: 0.42,
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, { minHeight: height, opacity }]} />;
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: theme.colors.champagne,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    overflow: "hidden"
  }
});
