import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  segmentRow: { flexDirection: 'row', gap: Spacing.three },
  segment: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  // Boton pulsable de 44x44 (minimo tactil); el punto de color visible es
  // mas pequeno y se centra dentro con swatchDot.
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  swatchDot: { width: 28, height: 28, borderRadius: 14 },
});
