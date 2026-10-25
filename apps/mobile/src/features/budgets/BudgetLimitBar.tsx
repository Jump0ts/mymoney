import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/format';
import type { BudgetGroup } from './budgets.types';
import { getLimitStatus } from './budgets.utils';
import { styles } from './BudgetLimitBar.styles';

interface BudgetLimitBarProps {
  group: BudgetGroup;
  // Lo que queda del sueldo tras el resto de grupos: es el tope del grupo del sobrante.
  remainderAvailable?: number;
}

// Cuanto del tope del grupo (su limite, o lo disponible si recibe el sobrante) llevan consumido sus
// lineas previstas. No pinta nada sin tope.
export const BudgetLimitBar = ({ group, remainderAvailable = 0 }: BudgetLimitBarProps) => {
  const theme = useTheme();
  const status = getLimitStatus(group, remainderAvailable);
  if (!status) return null;
  const capLabel = group.isRemainder ? 'Disponible' : 'Límite';

  const statusText = status.isOver
    ? `Te pasas ${formatMoney(Math.abs(status.remaining))}`
    : `Quedan ${formatMoney(status.remaining)}`;

  return (
    <View
      testID={`budget-limit-${group.id}`}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${capLabel} de ${group.name}: ${formatMoney(status.used)} de ${formatMoney(status.limit)}. ${statusText}`}
      accessibilityValue={{ min: 0, max: Math.max(status.limit, 0), now: Math.min(Math.max(status.used, 0), Math.max(status.limit, 0)) }}
      style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary">
          {capLabel} {formatMoney(status.limit)}
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
