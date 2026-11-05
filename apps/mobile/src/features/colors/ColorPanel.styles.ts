import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  panel: { gap: Spacing.two },
  // Vista previa del color y campo para escribir su codigo, en una fila.
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  preview: { width: 44, height: 44, borderRadius: 22, borderWidth: 1 },
  hexInput: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
});
