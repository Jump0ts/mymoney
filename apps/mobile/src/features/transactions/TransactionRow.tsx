import { View } from 'react-native';
import { Card } from '@/components/Card';
import { CategoryPill } from '@/components/CategoryPill';
import { ThemedText } from '@/components/themed-text';
import { formatDate, formatMoney } from '@/utils/format';
import type { Transaction } from './transactions.types';
import { styles } from './TransactionRow.styles';

export const TransactionRow = ({ transaction }: { transaction: Transaction }) => {
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
    </Card>
  );
};
