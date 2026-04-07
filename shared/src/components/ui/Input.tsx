import React, { useState } from 'react';
import { TextInput, TextInputProps, View, StyleSheet, Pressable } from 'react-native';
import { View as MotiView } from 'moti/build/components/view';
import { Text } from './Text';
import { colors, radius, spacing, textStyles, fontFamily } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      )}
      <MotiView
        animate={{
          borderColor: error
            ? colors.concern
            : focused
            ? colors.primary
            : colors.border,
          shadowOpacity: focused ? 0.08 : 0,
        }}
        transition={{ type: 'timing', duration: 150 }}
        style={styles.container}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithLeft : null, style]}
          placeholderTextColor={colors.textDisabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIcon}
            hitSlop={8}
          >
            {rightIcon}
          </Pressable>
        )}
      </MotiView>
      {(error || hint) && (
        <Text
          variant="caption"
          style={{ color: error ? colors.concern : colors.textSecondary, marginTop: spacing[1] }}
        >
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing[1.5],
  },
  label: {
    color: colors.textSecondary,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 0,
  },
  input: {
    flex: 1,
    ...textStyles.bodyMedium,
    color: colors.textPrimary,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  inputWithLeft: {
    paddingLeft: spacing[2],
  },
  leftIcon: {
    paddingLeft: spacing[4],
  },
  rightIcon: {
    paddingRight: spacing[4],
  },
});
