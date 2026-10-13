import { Platform, StyleSheet } from 'react-native';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontSize: 28, lineHeight: 34 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  // En web, el boton de calendario no puede formar parte del grupo centrado junto al
  // selector de mes: al centrar [selector + boton] como un unico bloque, el mes deja de
  // coincidir con el centro real de la pantalla (se desplaza medio ancho de boton hacia
  // la izquierda), algo que se nota mucho en una ventana ancha de escritorio. En web el
  // selector de mes se centra solo, y el boton flota aparte en el borde derecho.
  monthRow: Platform.select({
    web: { width: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    default: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  }),
  dayToggle: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { position: 'absolute', right: 0 } }),
  },
  dayPickerPanel: { gap: Spacing.two, alignItems: 'center' },
  chipScrollWrap: {
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: Platform.select({ web: 32, default: 0 }),
  },
  chipRow: { gap: Spacing.two, paddingVertical: Spacing.one },
  // La CategoryPill visible es pequena; esto solo agranda la zona pulsable
  // alrededor a 44px de alto sin cambiar el tamano visual del chip.
  chipTouchArea: { minHeight: 44, justifyContent: 'center' },
  chipArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  chipArrowLeft: { left: 0 },
  chipArrowRight: { right: 0 },
  listFlex: { flex: 1 },
  list: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  empty: { textAlign: 'center', marginTop: Spacing.five },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  paginationButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
