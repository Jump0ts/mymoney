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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, lineHeight: 34 },
  addButton: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  group: { gap: Spacing.two },
  groupTitle: { marginTop: Spacing.two },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  categoryName: { flex: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  form: { gap: Spacing.three },
  segmentRow: { flexDirection: 'row', gap: Spacing.three },
  segment: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  swatch: { width: 28, height: 28, borderRadius: 14, borderColor: '#000' },
});
