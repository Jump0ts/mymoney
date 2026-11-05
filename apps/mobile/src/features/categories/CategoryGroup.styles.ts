import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  groupTitle: { marginTop: Spacing.two },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  categoryName: { flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  // Editar y borrar: botones de 44x44 (minimo tactil) con el icono pequeno en el centro.
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
