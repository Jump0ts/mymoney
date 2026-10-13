import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/format';
import type { BudgetEntry } from './budgets.types';
import { getLimitStatus } from './budgets.utils';
import { styles } from './BudgetEntryRow.styles';

interface BudgetEntryRowProps {
  entry: BudgetEntry;
  onTogglePaid: (entry: BudgetEntry) => void;
}

export const BudgetEntryRow = memo(({ entry, onTogglePaid }: BudgetEntryRowProps) => {
  const theme = useTheme();

  if (entry.kind === 'CATEGORY_LIMIT') {
    const status = getLimitStatus(entry);
    return (
      <View
        testID={`budget-entry-${entry.id}`}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${entry.name}: gastado ${formatMoney(status.spent)} de ${formatMoney(status.limit)}`}
        accessibilityValue={{ min: 0, max: status.limit, now: Math.min(status.spent, status.limit) }}
        style={styles.limitRow}>
        <View style={styles.limitHeader}>
          <ThemedText numberOfLines={1} style={styles.name}>
            {entry.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatMoney(status.spent)} de {formatMoney(status.limit)}
          </ThemedText>
        </View>
        <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
          <View
            style={[
              styles.fill,
              { width: `${status.ratio * 100}%`, backgroundColor: status.isOver ? theme.expense : theme.primary },
            ]}
          />
        </View>
        <ThemedText type="small" themeColor={status.isOver ? 'expense' : 'textSecondary'}>
          {status.isOver
            ? `Te pasas ${formatMoney(Math.abs(status.remaining))}`
            : `Quedan ${formatMoney(status.remaining)}`}
        </ThemedText>
      </View>
    );
  }

  const isRefund = Number(entry.amount) < 0;
  return (
    <AnimatedPressable
      testID={`budget-entry-${entry.id}`}
      accessibilityRole="checkbox"
      accessibilityLabel={`${entry.name}, ${formatMoney(entry.amount)}`}
      accessibilityState={{ checked: entry.paid }}
      onPress={() => onTogglePaid(entry)}
      style={styles.row}>
      <Feather
        name={entry.paid ? 'check-square' : 'square'}
        size={20}
        color={entry.paid ? theme.primary : theme.textSecondary}
      />
      <ThemedText numberOfLines={1} themeColor={entry.paid ? 'textSecondary' : 'text'} style={styles.name}>
        {entry.name}
      </ThemedText>
      <ThemedText type="smallBold" themeColor={isRefund ? 'income' : entry.paid ? 'textSecondary' : 'text'}>
        {formatMoney(entry.amount)}
      </ThemedText>
    </AnimatedPressable>
  );
});
BudgetEntryRow.displayName = 'BudgetEntryRow';
