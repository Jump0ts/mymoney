import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  // En modo edicion la fila es el boton de editar mas las flechas de mover, que no pueden anidarse.
  editRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  // minWidth 0: sin esto el boton no encoge por debajo del ancho de sus textos y el importe se sale
  // por encima de las flechas en pantallas estrechas.
  editMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  // flexShrink + minWidth 0: el nombre se parte en varias lineas antes que empujar el importe fuera.
  name: { flex: 1, flexShrink: 1, minWidth: 0 },
  amount: { flexShrink: 0 },
});
