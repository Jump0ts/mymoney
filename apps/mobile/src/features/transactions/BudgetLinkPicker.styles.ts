import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 48 },
  toggleText: { flex: 1, flexShrink: 1, minWidth: 0 },
  panel: { gap: Spacing.one },
  groupTitle: { marginTop: Spacing.two },
  // Cada opcion ocupa todo el ancho y mide al menos 44 de alto (objetivo tactil).
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
  },
  optionName: { flex: 1, flexShrink: 1, minWidth: 0 },
  optionAmount: { flexShrink: 0 },
});
