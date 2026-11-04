import { StyleSheet } from 'react-native';
import { LEGEND_MIN_WIDTH } from '@/components/DonutChart.constants';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balance: { fontSize: 32, lineHeight: 38 },
  fab: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalsRow: { flexDirection: 'row', gap: Spacing.three },
  totalCard: { flex: 1 },
  totalAmount: { fontSize: 20, lineHeight: 26, marginTop: Spacing.one },
  totalAmountSkeleton: { marginTop: Spacing.one },
  card: { gap: Spacing.three },
  cardTitle: { marginBottom: Spacing.one },
  // La leyenda necesita al menos LEGEND_MIN_WIDTH para que se lean los nombres: si junto al grafico no cabe,
  // baja a su propia fila (con flex: 1 se quedaba con ~80 px y el nombre de cada categoria se reducia a una letra).
  donutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  legend: { flexGrow: 1, flexBasis: LEGEND_MIN_WIDTH, gap: Spacing.two },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1 },
  emptyCategoryState: { minHeight: 176, justifyContent: 'center' },
});
