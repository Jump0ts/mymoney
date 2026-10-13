import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  rowInfo: { flex: 1, gap: Spacing.one },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // gap = Spacing.three, no Spacing.two: con hitSlop=8 en cada boton (ver
  // AnimatedPressable) y objetivos de 44x44, un gap menor haria que las zonas
  // tactiles de editar y borrar se solaparan.
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  actionButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
