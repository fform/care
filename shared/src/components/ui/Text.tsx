import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { textStyles, colors } from '../../theme';

type TextVariant = keyof typeof textStyles;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
}

export function Text({ variant = 'bodyMedium', color, style, ...props }: TextProps) {
  return (
    <RNText
      style={[
        textStyles[variant],
        { color: color ?? colors.textPrimary },
        style,
      ]}
      {...props}
    />
  );
}
