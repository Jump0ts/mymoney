import { Feather } from '@expo/vector-icons';
import { memo } from 'react';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/format';
import type { BudgetEntry } from './budgets.types';
import { styles } from './BudgetEntryRow.styles';

interface BudgetEntryRowProps {
  entry: BudgetEntry;
  onTogglePaid: (entry: BudgetEntry) => void;
  // En modo edicion la fila deja de ser un check y abre el formulario de la linea.
  editMode?: boolean;
  onEdit?: (entry: BudgetEntry) => void;
}

export const BudgetEntryRow = memo(({ entry, onTogglePaid, editMode = false, onEdit }: BudgetEntryRowProps) => {
  const theme = useTheme();

  if (editMode) {
    return (
      <AnimatedPressable
        testID={`budget-entry-${entry.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Editar ${entry.name}`}
        onPress={() => onEdit?.(entry)}
        style={styles.row}>
        <Feather name="edit-2" size={18} color={theme.textSecondary} />
        <ThemedText style={styles.name}>{entry.name}</ThemedText>
        <ThemedText type="smallBold">{formatMoney(entry.amount)}</ThemedText>
      </AnimatedPressable>
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
      <ThemedText themeColor={entry.paid ? 'textSecondary' : 'text'} style={styles.name}>
        {entry.name}
      </ThemedText>
      <ThemedText type="smallBold" themeColor={isRefund ? 'income' : entry.paid ? 'textSecondary' : 'text'}>
        {formatMoney(entry.amount)}
      </ThemedText>
    </AnimatedPressable>
  );
});
BudgetEntryRow.displayName = 'BudgetEntryRow';
