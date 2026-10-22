import { StyleSheet } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: Radius.medium,
    padding: Spacing.half,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: Spacing.half,
    bottom: Spacing.half,
    borderRadius: Radius.medium,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
});
