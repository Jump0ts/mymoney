import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Card } from '@/components/Card';
import { CategoryPill } from '@/components/CategoryPill';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatMoney } from '@/utils/format';
import type { Transaction } from './transactions.types';
import { styles } from './TransactionRow.styles';

interface TransactionRowProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export const TransactionRow = ({ transaction, onEdit, onDelete }: TransactionRowProps) => {
  const theme = useTheme();
  const isExpense = transaction.type === 'EXPENSE';
  return (
    <Card style={styles.row}>
      <View style={styles.rowInfo}>
        <ThemedText type="default" numberOfLines={1}>
          {transaction.description || transaction.category.name}
        </ThemedText>
        <View style={styles.rowMeta}>
          <CategoryPill category={transaction.category} />
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(transaction.occurredAt)}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="smallBold" themeColor={isExpense ? 'expense' : 'income'}>
        {isExpense ? '-' : '+'}
        {formatMoney(transaction.amount)}
      </ThemedText>
      <View style={styles.actions}>
        <AnimatedPressable
          accessibilityRole="button"
          testID="transaction-row-edit"
          onPress={() => onEdit(transaction)}>
          <Feather name="edit-2" size={16} color={theme.textSecondary} />
        </AnimatedPressable>
        <AnimatedPressable
          accessibilityRole="button"
          testID="transaction-row-delete"
          onPress={() => onDelete(transaction)}>
          <Feather name="trash-2" size={16} color={theme.danger} />
        </AnimatedPressable>
      </View>
    </Card>
  );
};
