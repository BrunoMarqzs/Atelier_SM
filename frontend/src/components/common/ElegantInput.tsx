import { useState } from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { theme } from "@/theme";

type ElegantInputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function ElegantInput({ label, error, style, ...inputProps }: ElegantInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        onBlur={(event) => {
          setFocused(false);
          inputProps.onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          inputProps.onFocus?.(event);
        }}
        placeholderTextColor={theme.colors.taupe}
        style={[styles.input, focused ? styles.focused : null, error ? styles.errorBorder : null, style]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.graphite,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  input: {
    ...theme.typography.body,
    backgroundColor: theme.colors.ivoryGlass,
    borderColor: theme.colors.line,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.ink,
    minHeight: 54,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.soft
  },
  focused: {
    borderColor: theme.colors.roseGold,
    backgroundColor: theme.colors.white
  },
  errorBorder: {
    borderColor: theme.colors.danger
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.danger
  }
});
