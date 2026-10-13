import { StyleSheet } from 'react-native';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  title: { fontSize: 28, lineHeight: 34, flexShrink: 1 },
  editButton: {
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: Spacing.three },
  message: { gap: Spacing.three, alignItems: 'flex-start' },
});
