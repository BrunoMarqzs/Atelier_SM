import { type PropsWithChildren, useEffect, useRef } from "react";
import { Animated, type ViewStyle } from "react-native";

type FadeInViewProps = PropsWithChildren<{
  delay?: number;
  distance?: number;
  duration?: number;
  style?: ViewStyle | ViewStyle[];
}>;

export function FadeInView({
  children,
  delay = 0,
  distance = 10,
  duration = 420,
  style
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        delay,
        duration,
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        delay,
        duration,
        toValue: 0,
        useNativeDriver: true
      })
    ]).start();
  }, [delay, duration, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
