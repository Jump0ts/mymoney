import { StyleSheet } from 'react-native';
import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  // Sin padding ni recorte propio de Card: la franja de color llega hasta el borde redondeado.
  card: { padding: 0, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.four,
    paddingRight: Spacing.two,
    minHeight: 52,
    paddingVertical: Spacing.one,
  },
  title: { flex: 1 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, gap: Spacing.one },
  addLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
  },
  // flexWrap: con texto muy grande las dos cifras pasan a la linea de abajo en vez de
  // aplastar la etiqueta o salirse de la tarjeta.
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    paddingTop: Spacing.one,
  },
  footerLabel: { flexGrow: 1, minWidth: 64 },
});
