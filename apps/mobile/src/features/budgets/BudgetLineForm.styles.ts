import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  field: { gap: Spacing.two },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  // La CategoryPill visible es pequena; esto solo agranda la zona pulsable a 44px de alto.
  chipTouchArea: { minHeight: 44, justifyContent: 'center' },
});
