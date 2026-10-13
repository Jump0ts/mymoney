import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Card } from '@/components/Card';
import { FieldError } from '@/components/FieldError';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/format';
import type { BudgetMonthTotals } from './budgets.types';
import { BudgetAmountCell } from './BudgetAmountCell';
import { styles } from './BudgetSummary.styles';

interface BudgetSummaryProps {
  totals: BudgetMonthTotals;
  onSaveIncome: (income: number) => Promise<unknown>;
}

export const BudgetSummary = ({ totals, onSaveIncome }: BudgetSummaryProps) => {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setText(String(totals.income).replace('.', ','));
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const value = Number(text.replace(',', '.'));
    if (text.trim() === '' || !Number.isFinite(value) || value < 0) {
      setError('Escribe un importe válido (0 o más)');
      return;
    }
    try {
      await onSaveIncome(value);
      setEditing(false);
    } catch {
      setError('No se pudo guardar el sueldo');
    }
  };

  return (
    <Card style={styles.card}>
      {editing ? (
        <View style={styles.editRow}>
          <Input
            testID="budget-income-input"
            accessibilityLabel="Sueldo previsto"
            keyboardType="decimal-pad"
            autoFocus
            value={text}
            onChangeText={setText}
            onSubmitEditing={save}
            style={styles.incomeInput}
          />
          <AnimatedPressable
            testID="budget-income-save"
            accessibilityRole="button"
            accessibilityLabel="Guardar sueldo"
            onPress={save}
            style={[styles.saveButton, { backgroundColor: theme.primary }]}>
            <ThemedText type="smallBold" themeColor="primaryText">
              Guardar
            </ThemedText>
          </AnimatedPressable>
        </View>
      ) : (
        <AnimatedPressable
          testID="budget-income-edit"
          accessibilityRole="button"
          accessibilityLabel={`Sueldo: ${formatMoney(totals.income)}. Pulsa para editar`}
          onPress={startEditing}
          style={styles.incomeRow}>
          <ThemedText type="smallBold" style={styles.incomeLabel}>
            Sueldo
          </ThemedText>
          <ThemedText type="smallBold">{formatMoney(totals.income)}</ThemedText>
          <Feather name="edit-2" size={16} color={theme.textSecondary} />
        </AnimatedPressable>
      )}
      <FieldError message={error} />

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.totalsRow}>
        <ThemedText type="smallBold" style={styles.rowLabel}>
          Total a gastar
        </ThemedText>
        <BudgetAmountCell label="Previsto" value={totals.planned} />
        <BudgetAmountCell label="Pagado" value={totals.paid} />
      </View>

      <View style={styles.totalsRow}>
        <ThemedText type="smallBold" style={styles.rowLabel}>
          Resto
        </ThemedText>
        <BudgetAmountCell
          label="Previsto"
          value={totals.remainingPlanned}
          themeColor={totals.remainingPlanned < 0 ? 'expense' : 'text'}
        />
        <BudgetAmountCell
          label="Real"
          value={totals.remainingReal}
          themeColor={totals.remainingReal < 0 ? 'expense' : 'text'}
        />
      </View>
    </Card>
  );
};
