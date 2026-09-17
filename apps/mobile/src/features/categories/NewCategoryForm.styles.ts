import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  segmentRow: { flexDirection: 'row', gap: Spacing.three },
  segment: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  swatch: { width: 28, height: 28, borderRadius: 14, borderColor: '#000' },
});
