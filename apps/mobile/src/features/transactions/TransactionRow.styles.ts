import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  rowInfo: { flex: 1, gap: Spacing.one },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
