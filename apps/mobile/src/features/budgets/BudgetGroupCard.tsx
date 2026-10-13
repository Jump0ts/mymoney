import { memo } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/Card';
import { ThemedText } from '@/components/themed-text';
import { getReadableTextColor } from '@/utils/color';
import type { BudgetEntry, BudgetGroup } from './budgets.types';
import { getGroupTotals } from './budgets.utils';
import { BudgetAmountCell } from './BudgetAmountCell';
import { BudgetEntryRow } from './BudgetEntryRow';
import { styles } from './BudgetGroupCard.styles';

interface BudgetGroupCardProps {
  group: BudgetGroup;
  onTogglePaid: (entry: BudgetEntry) => void;
}

export const BudgetGroupCard = memo(({ group, onTogglePaid }: BudgetGroupCardProps) => {
  const totals = getGroupTotals(group.entries);

  return (
    <Card style={styles.card}>
      <View style={[styles.header, { backgroundColor: group.color }]}>
        <ThemedText
          type="smallBold"
          accessibilityRole="header"
          style={{ color: getReadableTextColor(group.color) }}>
          {group.name}
        </ThemedText>
      </View>

      <View style={styles.body}>
        {group.entries.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Sin líneas este mes.
          </ThemedText>
        ) : (
          group.entries.map((entry) => <BudgetEntryRow key={entry.id} entry={entry} onTogglePaid={onTogglePaid} />)
        )}
      </View>

      <View style={styles.footer}>
        <ThemedText type="smallBold" style={styles.footerLabel}>
          Total
        </ThemedText>
        <BudgetAmountCell label="Previsto" value={totals.planned} />
        <BudgetAmountCell label="Pagado" value={totals.paid} />
      </View>
    </Card>
  );
});
BudgetGroupCard.displayName = 'BudgetGroupCard';
