import { Pressable, View } from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthLabel } from '@/utils/format';
import type { MonthBreakdown } from '@/features/transactions/transactions.types';
import { styles } from './MonthlyBarChart.styles';

interface MonthlyBarChartProps {
  data: MonthBreakdown[];
  height?: number;
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
}

export const MonthlyBarChart = ({ data, height = 140, selectedMonth, onSelectMonth }: MonthlyBarChartProps) => {
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
      {rows.map((row) => {
        const isSelected = !selectedMonth || row.month === selectedMonth;
        const dimmed = Boolean(selectedMonth) && !isSelected;

        const content = (
          <>
            <View style={styles.bars}>
              <View
                style={[
                  styles.bar,
                  { height: `${(row.income / max) * 100}%`, backgroundColor: theme.income, opacity: dimmed ? 0.4 : 1 },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  { height: `${(row.expense / max) * 100}%`, backgroundColor: theme.expense, opacity: dimmed ? 0.4 : 1 },
                ]}
              />
            </View>
            <ThemedText
              type={dimmed ? 'small' : 'smallBold'}
              themeColor={dimmed ? 'textSecondary' : 'text'}
              style={styles.monthLabel}>
              {formatMonthLabel(row.month)}
            </ThemedText>
          </>
        );

        if (!onSelectMonth) {
          return (
            <View key={row.month} style={styles.column}>
              {content}
            </View>
          );
        }

        return (
          <Pressable
            key={row.month}
            testID={`month-bar-${row.month}`}
            accessibilityRole="button"
            onPress={() => onSelectMonth(row.month)}
            style={styles.column}>
            {content}
          </Pressable>
        );
      })}
    </View>
  );
};
