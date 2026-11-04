import { StyleSheet } from 'react-native';
import { MONTH_LABEL_MIN_WIDTH } from '@/components/MonthYearPicker.styles';
import { Spacing } from '@/constants/theme';
import { NARROW_MONTH_ROW_WIDTH, monthRowStyles, styles } from './transactions.styles';

const ARROW = 44;
const TOGGLE = 44;
// Ancho de contenido de Movimientos: pantalla menos el relleno lateral de cada lado.
const contentWidth = (screenWidth: number) => screenWidth - 2 * Spacing.four;

// En un movil estrecho el selector de mes y el boton de calendario se montaban (la flecha de "mes siguiente" quedaba
// debajo del boton), porque en web el boton flotaba sobre el selector centrado.
describe('fila del mes en Movimientos', () => {
  it('en pantallas estrechas usa una fila normal: el boton ya no flota sobre el selector', () => {
    const narrow = monthRowStyles(375);

    expect(narrow.row).toBe(styles.monthRowNarrow);
    expect(narrow.toggle).toBe(styles.dayToggleNarrow);
    expect(StyleSheet.flatten(narrow.toggle)).not.toHaveProperty('position');
    expect(StyleSheet.flatten(narrow.row).flexDirection).toBe('row');
  });

  it('en pantallas anchas conserva el reparto original (selector centrado y boton aparte)', () => {
    const wide = monthRowStyles(1200);

    expect(wide.row).toBe(styles.monthRow);
    expect(wide.toggle).toBe(styles.dayToggle);
  });

  it('el umbral es exclusivo: justo en el limite ya cuenta como ancho', () => {
    expect(monthRowStyles(NARROW_MONTH_ROW_WIDTH - 1).row).toBe(styles.monthRowNarrow);
    expect(monthRowStyles(NARROW_MONTH_ROW_WIDTH).row).toBe(styles.monthRow);
  });

  it.each([360, 375, 390])('en un movil de %i px el selector y el boton caben en la fila', (screenWidth) => {
    const picker = ARROW + Spacing.three + MONTH_LABEL_MIN_WIDTH + Spacing.three + ARROW;
    const row = picker + (StyleSheet.flatten(styles.monthRowNarrow).gap as number) + TOGGLE;

    expect(row).toBeLessThanOrEqual(contentWidth(screenWidth));
  });

  it('el boton de calendario sigue siendo un objetivo tactil de 44 pt', () => {
    expect(StyleSheet.flatten(styles.dayToggleNarrow)).toMatchObject({ width: 44, height: 44 });
  });
});
