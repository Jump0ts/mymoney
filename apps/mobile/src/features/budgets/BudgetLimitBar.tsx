import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/format';
import type { BudgetGroup } from './budgets.types';
import { getLimitStatus } from './budgets.utils';
import { styles } from './BudgetLimitBar.styles';

interface BudgetLimitBarProps {
  group: BudgetGroup;
}

// Cuanto del limite del grupo llevan consumido sus lineas previstas. No pinta nada sin limite.
export const BudgetLimitBar = ({ group }: BudgetLimitBarProps) => {
  const theme = useTheme();
  const status = getLimitStatus(group);
  if (!status) return null;

  const statusText = status.isOver
    ? `Te pasas ${formatMoney(Math.abs(status.remaining))}`
    : `Quedan ${formatMoney(status.remaining)}`;

  return (
    <View
      testID={`budget-limit-${group.id}`}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Límite de ${group.name}: ${formatMoney(status.used)} de ${formatMoney(status.limit)}. ${statusText}`}
      accessibilityValue={{ min: 0, max: status.limit, now: Math.min(Math.max(status.used, 0), status.limit) }}
      style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary">
          Límite {formatMoney(status.limit)}
        </ThemedText>
        <ThemedText type="small" themeColor={status.isOver ? 'expense' : 'textSecondary'}>
          {statusText}
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
    </View>
  );
};
