import { Platform, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';

export const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  // El texto grande se aprieta (tracking negativo, cerca de -0,02 em) y lleva el interlineado justo: letras demasiado
  // separadas se leen sueltas cuanto mas grandes son. El texto pequeno no se toca.
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
    letterSpacing: -0.96,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 600,
    letterSpacing: -0.64,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
