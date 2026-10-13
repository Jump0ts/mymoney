import { StyleSheet } from 'react-native';
import { MaxContentWidth, Spacing } from '@/constants/theme';

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
  title: { fontSize: 28, lineHeight: 34 },
  list: { gap: Spacing.three },
  message: { gap: Spacing.three, alignItems: 'flex-start' },
});
