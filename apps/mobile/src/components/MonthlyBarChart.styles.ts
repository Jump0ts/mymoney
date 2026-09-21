import { StyleSheet } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.half,
    flex: 1,
  },
  bar: {
    width: 10,
    borderRadius: Radius.small,
    minHeight: 3,
  },
  monthLabel: {
    marginTop: Spacing.one,
  },
  empty: {
    justifyContent: 'center',
  },
});
