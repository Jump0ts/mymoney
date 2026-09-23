import { StyleSheet } from 'react-native';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  segmentRow: { flexDirection: 'row', gap: Spacing.two },
  segment: { flex: 1, paddingVertical: Spacing.three, borderRadius: 14, alignItems: 'center' },
  amountInput: { fontSize: 28, textAlign: 'center' },
  field: { gap: Spacing.two },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  // La CategoryPill visible es pequena; esto solo agranda la zona pulsable
  // alrededor a 44px de alto sin cambiar el tamano visual del chip.
  chipTouchArea: { minHeight: 44, justifyContent: 'center' },
  datePickerPanel: { gap: Spacing.two, paddingTop: Spacing.two },
});
