import { StyleSheet } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';

// El mes mas largo ("Septiembre de 2026") mide ~132 px en 14 px negrita.
export const MONTH_LABEL_MIN_WIDTH = 136;

export const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 136 y no 170: en un movil de 360 px, el selector (dos flechas de 44 y sus huecos) mas el boton de calendario de
  // Movimientos tienen que caber en 312 px, y con 170 se montaban el uno sobre el otro.
  labelWrap: { minWidth: MONTH_LABEL_MIN_WIDTH },
  labelAnimated: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  label: { textAlign: 'center' },
});
