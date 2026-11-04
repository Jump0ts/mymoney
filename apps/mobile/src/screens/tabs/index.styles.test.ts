import { StyleSheet } from 'react-native';
import { LEGEND_MIN_WIDTH } from '@/components/DonutChart.constants';
import { styles } from './index.styles';

// Estas pruebas fijan el reparto del grafico de categorias del Resumen: en pantallas estrechas (375 px) la leyenda
// se quedaba con ~80 px junto al donut y cada nombre se reducia a una letra.
describe('grafico de categorias del Resumen', () => {
  const donutRow = StyleSheet.flatten(styles.donutRow);
  const legend = StyleSheet.flatten(styles.legend);

  it('la leyenda pide un ancho minimo legible', () => {
    expect(LEGEND_MIN_WIDTH).toBeGreaterThanOrEqual(180);
    expect(legend.flexBasis).toBe(LEGEND_MIN_WIDTH);
  });

  it('la leyenda crece para ocupar lo que sobre, pero no se encoge por debajo de su minimo', () => {
    expect(legend.flexGrow).toBe(1);
    // flex: 1 pondria la base a 0 y la dejaria sin minimo: es justo lo que se corrige.
    expect(legend).not.toHaveProperty('flex');
    expect((legend as Record<string, unknown>).flexShrink ?? 0).toBe(0);
  });

  it('la fila hace salto de linea: si la leyenda no cabe junto al grafico baja a su propia fila', () => {
    expect(donutRow.flexDirection).toBe('row');
    expect(donutRow.flexWrap).toBe('wrap');
  });

  it('el grafico queda centrado cuando la leyenda baja', () => {
    expect(donutRow.justifyContent).toBe('center');
  });
});
