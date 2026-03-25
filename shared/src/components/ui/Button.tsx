import React from 'react';
import { Pressable, PressableProps, StyleSheet, ActivityIndicator, View } from 'react-native';
import { MotiView } from 'moti';
import { Text } from './Text';
import { colors, radius, spacing, fontFamily } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantStyles = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.textInverse },
  },
  secondary: {
    container: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
    text: { color: colors.textPrimary },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.primary },
  },
  danger: {
    container: { backgroundColor: colors.concern },
    text: { color: colors.textInverse },
  },
};

const sizeStyles = {
  sm: { paddingVertical: spacing[2], paddingHorizontal: spacing[3], borderRadius: radius.md },
  md: { paddingVertical: spacing[3], paddingHorizontal: spacing[5], borderRadius: radius.lg },
  lg: { paddingVertical: spacing[4], paddingHorizontal: spacing[6], borderRadius: radius['2xl'] },
};

const textSizes = {
  sm: 'label' as const,
  md: 'label' as const,
  lg: 'headingSmall' as const,
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  disabled,
  ...props
}: ButtonProps) {
  const vs = variantStyles[variant];
  const ss = sizeStyles[size];

  return (
    <Pressable
      disabled={disabled || loading}
      {...props}
    >
      {({ pressed }) => (
        <MotiView
          animate={{ scale: pressed ? 0.96 : 1, opacity: disabled ? 0.5 : 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={[styles.container, vs.container, ss]}
        >
          {loading ? (
            <ActivityIndicator color={vs.text.color} size="small" />
          ) : (
            <>
              {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
              <Text variant={textSizes[size]} style={[styles.label, vs.text]}>
                {label}
              </Text>
              {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
            </>
          )}
        </MotiView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: spacing[2],
  },
  iconRight: {
    marginLeft: spacing[2],
  },
});
