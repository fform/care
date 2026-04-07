import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { View as MotiView } from 'moti/build/components/view';
import { colors, radius, shadow, spacing } from '../../theme';

interface CardProps extends ViewProps {
  /** Animate in from below on mount */
  animated?: boolean;
  /** Elevation level */
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  padding?: keyof typeof spacing;
}

export function Card({
  animated = false,
  elevation = 'sm',
  padding = 4,
  style,
  children,
  ...props
}: CardProps) {
  const baseStyle = [
    styles.card,
    shadow[elevation],
    { padding: spacing[padding] },
    style,
  ];

  if (animated) {
    return (
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200 }}
        style={baseStyle}
        {...(props as any)}
      >
        {children}
      </MotiView>
    );
  }

  return (
    <View style={baseStyle} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
});
