/**
 * Design system color tokens — tend
 * Warm terracotta palette matching the Pencil design.
 */

export const palette = {
  // Warm beige backgrounds
  beige50: '#FAF5F0',
  beige100: '#F3EBE2', // main background
  beige200: '#F0D9C8', // accent bg / AI cards
  beige300: '#E8C4AE', // borders / accent light

  // White
  white: '#FFFFFF',

  // Terracotta / brand accent
  terra400: '#DBA88A',
  terra500: '#D4916E', // primary brand color
  terra600: '#B8724F',

  // Ink / text
  ink900: '#1A1A1A', // primary text
  ink700: '#3D3D3D', // secondary text
  ink500: '#6B6B6B', // muted text
  ink300: '#A8A29E', // disabled
  ink0: '#FFFFFF',   // inverse

  // Semantic
  sage500: '#6B9E7A',  // success / done
  amber500: '#E78615', // warning / concerns
  rose500: '#C4645A',  // danger / emergency

  transparent: 'transparent',
} as const;

export const colors = {
  // Backgrounds
  background: palette.beige100,
  surface: palette.white,
  surfaceSubtle: palette.beige50,
  accentBg: palette.beige200,

  // Text
  textPrimary: palette.ink900,
  textSecondary: palette.ink700,
  textMuted: palette.ink500,
  textDisabled: palette.ink300,
  textInverse: palette.ink0,

  // Brand
  primary: palette.terra500,
  primaryLight: palette.terra400,
  primaryDark: palette.terra600,

  // Semantic
  success: palette.sage500,
  warning: palette.amber500,
  danger: palette.rose500,

  // Legacy aliases
  concern: palette.rose500,
  concernLight: palette.rose500,
  secondary: palette.sage500,
  secondaryLight: palette.sage500,

  // Borders
  border: palette.beige300,
  borderSubtle: palette.beige200,

  // Tab bar
  tabActive: palette.terra500,
  tabInactive: palette.ink500,
} as const;

export type ColorToken = keyof typeof colors;
export type PaletteToken = keyof typeof palette;
