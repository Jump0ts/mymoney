import { StyleSheet } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: { gap: Spacing.three },
  incomeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  incomeLabel: { flex: 1 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  incomeInput: { flex: 1 },
  saveButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1 },
  totalsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.three },
  rowLabel: { flexGrow: 1, minWidth: 64 },
  cancelButton: { minHeight: 44, paddingHorizontal: Spacing.two, alignItems: 'center', justifyContent: 'center' },
});
