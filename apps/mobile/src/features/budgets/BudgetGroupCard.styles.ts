import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  // Sin padding ni recorte propio de Card: la franja de color llega hasta el borde redondeado.
  card: { padding: 0, overflow: 'hidden' },
  header: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  body: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, gap: Spacing.one },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    paddingTop: Spacing.one,
  },
  footerLabel: { flex: 1 },
});
