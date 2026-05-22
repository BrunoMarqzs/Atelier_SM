import { type PropsWithChildren, useRef } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from "react-native";

type AnimatedPressableProps = PropsWithChildren<
  Omit<PressableProps, "style"> & {
    pressedScale?: number;
    style?: StyleProp<ViewStyle>;
  }
>;

export function AnimatedPressable({
  children,
  disabled,
  onPressIn,
  onPressOut,
  pressedScale = 0.985,
  style,
  ...props
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function animate(toValue: number) {
    Animated.spring(scale, {
      damping: 18,
      mass: 0.7,
      stiffness: 240,
      toValue,
      useNativeDriver: true
    }).start();
  }

  return (
    <Pressable
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) {
          animate(pressedScale);
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(1);
        onPressOut?.(event);
      }}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
