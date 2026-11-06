import { StyleSheet } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';

export const ENVELOPE_ICON_SIZE = 20;
// La barra y el resumen se alinean con el nombre, que empieza tras el icono y el hueco que lo separa.
const NAME_INDENT = ENVELOPE_ICON_SIZE + Spacing.three;

export const styles = StyleSheet.create({
  row: { gap: Spacing.one, minHeight: 44, justifyContent: 'center', paddingVertical: Spacing.one },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  // flexShrink + minWidth 0: el nombre se parte en varias lineas antes que empujar el importe fuera.
  name: { flex: 1, flexShrink: 1, minWidth: 0 },
  amount: { flexShrink: 0 },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden', marginLeft: NAME_INDENT },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginLeft: NAME_INDENT,
  },
  status: { flexShrink: 1 },
});
