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
  layers: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 14, overflow: 'hidden' },
  thumb: {
    position: 'absolute',
    width: AREA_THUMB,
    height: AREA_THUMB,
    borderRadius: AREA_THUMB / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
