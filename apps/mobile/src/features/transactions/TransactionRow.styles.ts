import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  // minWidth 0: sin esto la informacion no encoge por debajo del ancho de sus textos y empuja el importe.
  rowInfo: { flex: 1, minWidth: 0, gap: Spacing.one },
  // La categoria y la fecha pasan a dos lineas (en vez de partir la fecha en tres) cuando no caben juntas.
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: Spacing.two, rowGap: Spacing.one },
  date: { flexShrink: 0 },
  // Linea del presupuesto que cubre el gasto, discreta bajo la categoria y la fecha.
  budgetMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  budgetText: { flexShrink: 1, minWidth: 0 },
  // gap = Spacing.three, no Spacing.two: con hitSlop=8 en cada boton (ver
  // AnimatedPressable) y objetivos de 44x44, un gap menor haria que las zonas
  // tactiles de editar y borrar se solaparan.
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  actionButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
