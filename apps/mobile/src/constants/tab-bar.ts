// Estilo de las etiquetas de la barra inferior de pestañas.
//
// React Navigation las pinta con fontSize 10 y lineHeight "normal". En web (React Native Web) ese texto lleva
// `overflow: hidden` y la caja mide solo lo que mide la linea con `normal`; en iOS la tipografia del sistema
// (San Francisco) necesita mas alto, y se corta el rabillo de la p, la g y la j de "Presupuesto", "Categorías"
// y "Ajustes". Con un lineHeight explicito la caja tiene sitio para los descendentes, y con flexShrink 0 no se
// encoge: el item de la pestaña tiene alto fijo (49) y, al ser `overflow: hidden`, la etiqueta cedia altura al icono
// hasta quedarse en 10,3 px aunque la linea midiera 14. El sobrante lo absorbe el relleno inferior del item.
export const TAB_BAR_LABEL_FONT_SIZE = 10;

// 1,4 veces el cuerpo de la letra: holgura de sobra para ascendentes y descendentes en cualquier fuente.
export const TAB_BAR_LABEL_LINE_HEIGHT = 14;

export const tabBarLabelStyle = {
  fontSize: TAB_BAR_LABEL_FONT_SIZE,
  lineHeight: TAB_BAR_LABEL_LINE_HEIGHT,
  flexShrink: 0,
} as const;
