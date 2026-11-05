import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  heading: { gap: Spacing.one },
  segmentRow: { flexDirection: 'row', gap: Spacing.three },
  segment: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
});
