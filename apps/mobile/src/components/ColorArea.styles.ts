import { Platform, StyleSheet } from 'react-native';

export const AREA_HEIGHT = 160;
export const AREA_THUMB = 28;

export const styles = StyleSheet.create({
  area: {
    height: AREA_HEIGHT,
    // En el PWA un dedo arrastrando no debe desplazar la pagina.
    ...(Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'crosshair' } as object) : {}),
  },
  // Solo los colores se recortan a las esquinas redondeadas: el tirador se ve entero tambien en el borde.
  // Los hijos no reciben toques: los recibe la zona entera (el gesto), y asi `event.x/y` son los de la zona.
  layers: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 14,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  thumb: {
    position: 'absolute',
    pointerEvents: 'none',
    left: 0,
    top: 0,
    width: AREA_THUMB,
    height: AREA_THUMB,
    borderRadius: AREA_THUMB / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    // `shadow*` esta obsoleto en la web: boxShadow vale igual en iOS, Android y web.
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.4)',
  },
});
