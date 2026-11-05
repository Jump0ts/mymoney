import { Platform, StyleSheet } from 'react-native';

export const HUE_THUMB = 28;

export const styles = StyleSheet.create({
  // Zona tactil de 44 px de alto; la tira de color visible va centrada dentro.
  touchArea: {
    height: 44,
    justifyContent: 'center',
    // En el PWA un dedo arrastrando no debe desplazar la pagina.
    ...(Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'pointer' } as object) : {}),
  },
  track: { height: 20, borderRadius: 10, overflow: 'hidden' },
  thumb: {
    position: 'absolute',
    top: (44 - HUE_THUMB) / 2,
    width: HUE_THUMB,
    height: HUE_THUMB,
    borderRadius: HUE_THUMB / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    // Un anillo oscuro fino por fuera mantiene visible el borde blanco sobre fondos claros.
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
