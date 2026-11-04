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
  field: { gap: Spacing.two },
  amountInput: { fontSize: 28, textAlign: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  // La CategoryPill visible es pequena; esto solo agranda la zona pulsable a 44px de alto sin cambiar el chip.
  chipTouchArea: { minHeight: 44, justifyContent: 'center' },
});
