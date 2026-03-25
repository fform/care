/**
 * Design system color tokens.
 * Warm, bubbly, and inviting — inspired by the reference design.
 * All palette values are defined here; semantic tokens map palette → intent.
 */

export const palette = {
  // Warm creams & neutrals
  cream50: '#FAF7F2',
  cream100: '#F5F0E8',
  cream200: '#EDE5D8',
  cream300: '#E0D5C4',

  // Warm whites
  white: '#FFFFFF',

  // Warm blacks / text
  ink900: '#1C1917',
  ink700: '#44403C',
  ink500: '#78716C',
  ink300: '#A8A29E',
  ink100: '#D6D3D1',

  // Brand amber / golden (primary CTA)
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',
  amber700: '#B45309',

  // Sage / olive green (secondary, active states)
  sage400: '#86EFAC',
  sage500: '#6B8F71',
  sage600: '#4E7455',
  sage700: '#3A5A40',

  // Warm rose (concerns / alerts)
  rose400: '#FB7185',
  rose500: '#F43F5E',

  // Soft blue (info)
  sky400: '#38BDF8',
  sky500: '#0EA5E9',

  // Transparent
  transparent: 'transparent',
} as const;

export const colors = {
  // Backgrounds
  background: palette.cream100,
  surface: palette.white,
  surfaceSubtle: palette.cream50,

  // Text
  textPrimary: palette.ink900,
  textSecondary: palette.ink500,
  textDisabled: palette.ink300,
  textInverse: palette.white,

  // Brand
  primary: palette.amber500,
  primaryLight: palette.amber400,
  primaryDark: palette.amber700,

  // Secondary
  secondary: palette.sage600,
  secondaryLight: palette.sage500,

  // Semantic
  concern: palette.rose500,
  concernLight: palette.rose400,
  info: palette.sky500,
  infoLight: palette.sky400,

  // Borders
  border: palette.cream300,
  borderSubtle: palette.cream200,

  // Tab bar
  tabActive: palette.amber500,
  tabInactive: palette.ink300,
} as const;

export type ColorToken = keyof typeof colors;
export type PaletteToken = keyof typeof palette;
