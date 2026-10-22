import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#12131A',
    textSecondary: '#63666F',
    background: '#F7F7FA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEF0FF',
    border: '#E3E4EA',
    primary: '#4F5DFF',
    primaryText: '#FFFFFF',
    // Oscurecidos respecto al color de marca para llegar a 4.5:1 como texto pequeno sobre blanco.
    income: '#0F7A50',
    expense: '#C9252B',
    danger: '#C9252B',
  },
  dark: {
    text: '#F5F6FA',
    textSecondary: '#9B9FAE',
    background: '#0D0E12',
    backgroundElement: '#1A1B22',
    backgroundSelected: '#242640',
    border: '#2A2B34',
    primary: '#7C87FF',
    primaryText: '#0D0E12',
    income: '#3DD68C',
    expense: '#FF6369',
    danger: '#FF6369',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'system-ui, -apple-system, sans-serif',
    rounded: 'system-ui, -apple-system, sans-serif',
    mono: 'ui-monospace, monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 14,
  large: 20,
  pill: 999,
} as const;

export const MaxContentWidth = 720;
