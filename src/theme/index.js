/**
 * JARVIS Theme - Dark mode with blue/cyan accents
 */
import { MD3DarkTheme } from 'react-native-paper';

export const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#00D9FF', // Cyan
    secondary: '#0099FF', // Blue
    tertiary: '#6C63FF', // Purple accent
    background: '#0A0E27', // Dark navy
    surface: '#151B3D', // Slightly lighter navy
    surfaceVariant: '#1F2847', // Card background
    onSurface: '#FFFFFF',
    onSurfaceVariant: '#B8C5D6',
    error: '#FF5252',
    success: '#00E676',
    warning: '#FFB300',
  },
  fonts: {
    ...MD3DarkTheme.fonts,
    regular: {
      ...MD3DarkTheme.fonts.regular,
    },
    medium: {
      ...MD3DarkTheme.fonts.medium,
    },
    bold: {
      ...MD3DarkTheme.fonts.medium,
      fontWeight: '700',
    },
  },
  roundness: 12,
};

export const colors = theme.colors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.onSurface,
  },
  medium: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.onSurface,
  },
  bold: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.onSurfaceVariant,
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.onSurfaceVariant,
  },
  // Additional typography styles that might be referenced
  large: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.onSurface,
  },
  extraLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onSurface,
  },
};
