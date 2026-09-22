import { StyleSheet } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: { minWidth: 170, height: 20 },
  labelAnimated: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  label: { textAlign: 'center' },
});
