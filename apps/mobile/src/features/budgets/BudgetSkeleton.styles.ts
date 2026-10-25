import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  summary: { gap: Spacing.three },
  group: { padding: 0, overflow: 'hidden' },
  rows: { padding: Spacing.four, gap: Spacing.three },
});
