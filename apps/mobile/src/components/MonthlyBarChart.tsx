import { StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthLabel } from '@/lib/format';
import type { MonthBreakdown } from '@/types/api';

interface MonthlyBarChartProps {
  data: MonthBreakdown[];
  height?: number;
}

export function MonthlyBarChart({ data, height = 140 }: MonthlyBarChartProps) {
  const theme = useTheme();

  const months = Array.from(new Set(data.map((d) => d.month))).sort();
  const rows = months.map((month) => ({
    month,
    income: data.find((d) => d.month === month && d.type === 'INCOME')?.total ?? 0,
    expense: data.find((d) => d.month === month && d.type === 'EXPENSE')?.total ?? 0,
  }));

  const max = Math.max(1, ...rows.flatMap((r) => [r.income, r.expense]));

  if (rows.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Sin movimientos en este periodo.
      </ThemedText>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      {rows.map((row) => (
        <View key={row.month} style={styles.column}>
          <View style={styles.bars}>
            <View
              style={[
                styles.bar,
                { height: `${(row.income / max) * 100}%`, backgroundColor: theme.income },
              ]}
            />
            <View
              style={[
                styles.bar,
                { height: `${(row.expense / max) * 100}%`, backgroundColor: theme.expense },
              ]}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.monthLabel}>
            {formatMonthLabel(row.month)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.half,
    flex: 1,
  },
  bar: {
    width: 10,
    borderRadius: Radius.small,
    minHeight: 3,
  },
  monthLabel: {
    marginTop: Spacing.one,
  },
});
