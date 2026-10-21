import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  toggleLabel: { flex: 1, flexShrink: 1 },
});
