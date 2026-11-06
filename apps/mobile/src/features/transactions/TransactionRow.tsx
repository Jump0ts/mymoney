import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

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
  isDeleting?: boolean;
}

// Fundido normal (no entering/exiting) porque la fila vive dentro de un
// FlatList virtualizado: una animacion ligada al montaje/desmontaje se
// dispararia tambien al reciclarse las filas al hacer scroll, no solo al
// borrar de verdad. Aqui el fundido lo dispara un cambio de prop en un
// componente que sigue montado, asi que el scroll no lo afecta.
const fadeStyle = {
  opacity: 1,
  transitionProperty: 'opacity' as const,
  transitionDuration: 200,
};
const noTransitionDuration = { transitionDuration: 0 };
const fadedOutStyle = { opacity: 0 };

export const TransactionRow = memo(({ transaction, onEdit, onDelete, isDeleting }: TransactionRowProps) => {
  const theme = useTheme();
  // Un reembolso es un gasto de importe negativo: lo que te devuelven por un gasto. Se ve en positivo y en el color
  // de los ingresos, pero sigue siendo de su categoria de gasto.
  const isRefund = transaction.type === 'EXPENSE' && Number(transaction.amount) < 0;
  const isExpense = transaction.type === 'EXPENSE' && !isRefund;
  const reduceMotion = useReducedMotion();
  const label = transaction.description || transaction.category.name;
  return (
    <Animated.View
      testID="transaction-row-fade"
      style={[fadeStyle, reduceMotion && noTransitionDuration, isDeleting && fadedOutStyle]}>
      <Card style={styles.row}>
        <View style={styles.rowInfo}>
          <ThemedText type="default" numberOfLines={1}>
            {label}
          </ThemedText>
          <View style={styles.rowMeta}>
            <CategoryPill category={transaction.category} />
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.date}>
              {formatDate(transaction.occurredAt)}
            </ThemedText>
          </View>
          {transaction.budgetEntry && (
            <View
              testID="transaction-row-budget"
              accessible
              accessibilityLabel={`${isRefund ? 'Reembolso de' : 'Cubre'} ${transaction.budgetEntry.name} del presupuesto, grupo ${transaction.budgetEntry.group.name}`}
              style={styles.budgetMeta}>
              <Feather name="link" size={12} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.budgetText}>
                {transaction.budgetEntry.name} · {transaction.budgetEntry.group.name}
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedText
          type="smallBold"
          themeColor={isExpense ? 'expense' : 'income'}
          accessibilityLabel={isRefund ? `Reembolso de ${formatMoney(String(Math.abs(Number(transaction.amount))))}` : undefined}>
          {isExpense ? '-' : '+'}
          {formatMoney(isRefund ? String(Math.abs(Number(transaction.amount))) : transaction.amount)}
        </ThemedText>
        <View style={styles.actions}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={`Editar ${label}`}
            testID="transaction-row-edit"
            style={styles.actionButton}
            onPress={() => onEdit(transaction)}>
            <Feather name="edit-2" size={16} color={theme.textSecondary} />
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={`Borrar ${label}`}
            testID="transaction-row-delete"
            style={styles.actionButton}
            onPress={() => onDelete(transaction)}>
            <Feather name="trash-2" size={16} color={theme.danger} />
          </AnimatedPressable>
        </View>
      </Card>
    </Animated.View>
  );
});
TransactionRow.displayName = 'TransactionRow';
