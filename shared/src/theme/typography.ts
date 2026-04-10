/**
 * Typography tokens.
 * Currently uses Open Sans. Swap fontFamily values here when the final typeface arrives.
 * Font weight names map to the loaded font variants in the Expo app.
 */

export const fontFamily = {
  // Regular weight
  regular: 'OpenSans_400Regular',
  // Medium weight
  medium: 'OpenSans_500Medium',
  // SemiBold
  semiBold: 'OpenSans_600SemiBold',
  // Bold
  bold: 'OpenSans_700Bold',
} as const;

/** Logical pt sizes: primary body is 19pt (Apple Body 17pt @ Large, plus one Dynamic-Type step). */
export const fontSize = {
  xs: 13,
  sm: 17,
  base: 19,
  md: 21,
  lg: 26,
  xl: 30,
  '2xl': 36,
  '3xl': 42,
  '4xl': 50,
} as const;

export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 1.5,
} as const;

/** Pre-composed text styles for common use */
export const textStyles = {
  displayLarge: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: fontSize['3xl'] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  displayMedium: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: fontSize['2xl'] * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  headingLarge: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl * lineHeight.snug,
  },
  headingMedium: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    lineHeight: fontSize.lg * lineHeight.snug,
  },
  headingSmall: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * lineHeight.snug,
  },
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * lineHeight.normal,
  },
  bodyMedium: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.snug,
    letterSpacing: letterSpacing.wide,
  },
  labelCaps: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * lineHeight.snug,
    letterSpacing: letterSpacing.widest,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * lineHeight.normal,
  },
} as const;
