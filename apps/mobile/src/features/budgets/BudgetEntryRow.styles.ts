import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  // flexShrink: el nombre se parte en varias lineas antes que empujar el importe fuera.
  name: { flex: 1, flexShrink: 1 },
});
