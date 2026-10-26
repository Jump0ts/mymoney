import { tabBarLabelStyle, TAB_BAR_LABEL_FONT_SIZE, TAB_BAR_LABEL_LINE_HEIGHT } from './tab-bar';

describe('tabBarLabelStyle', () => {
  it('fija un lineHeight explicito: con "normal" iOS corta los descendentes (p, g, j) de las etiquetas', () => {
    expect(typeof tabBarLabelStyle.lineHeight).toBe('number');
  });

  it('deja al menos 1,3 veces el cuerpo de la letra de alto de linea', () => {
    expect(TAB_BAR_LABEL_LINE_HEIGHT / TAB_BAR_LABEL_FONT_SIZE).toBeGreaterThanOrEqual(1.3);
  });

  it('no deja que la etiqueta se encoja: con overflow hidden cedia altura al icono y volvia a recortar', () => {
    expect(tabBarLabelStyle.flexShrink).toBe(0);
  });

  it('usa los mismos valores que las constantes', () => {
    expect(tabBarLabelStyle).toMatchObject({ fontSize: TAB_BAR_LABEL_FONT_SIZE, lineHeight: TAB_BAR_LABEL_LINE_HEIGHT });
  });
});
