import { StyleSheet } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  // flexShrink: el nombre se parte en varias lineas antes que empujar el importe fuera.
  name: { flex: 1, flexShrink: 1 },
  limitRow: { gap: Spacing.one, paddingVertical: Spacing.two },
  limitHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
});
