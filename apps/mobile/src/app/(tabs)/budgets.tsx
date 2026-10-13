import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BudgetGroupCard } from '@/features/budgets/BudgetGroupCard';
import { BudgetSkeleton } from '@/features/budgets/BudgetSkeleton';
import { BudgetSummary } from '@/features/budgets/BudgetSummary';
import type { BudgetEntry } from '@/features/budgets/budgets.types';
import { getMonthTotals } from '@/features/budgets/budgets.utils';
import { useBudgetMonth, useToggleEntryPaid, useUpdateMonthIncome } from '@/features/budgets/useBudgets';
import { styles } from '@/screens/tabs/budgets.styles';
import { notify } from '@/utils/alert';
import { getCurrentYearMonth } from '@/utils/date';

const CONTENT_FADE_IN = FadeIn.duration(200);

const BudgetsScreen = () => {
  const [selected, setSelected] = useState(getCurrentYearMonth());
  const { data, isLoading, refetch } = useBudgetMonth(selected);
  const { mutate: togglePaid } = useToggleEntryPaid(selected);
  const { mutateAsync: saveIncome } = useUpdateMonthIncome(selected);

  const handleTogglePaid = useCallback(
    (entry: BudgetEntry) =>
      togglePaid(
        { id: entry.id, paid: !entry.paid },
        { onError: () => notify('No se pudo actualizar', `No se pudo cambiar "${entry.name}". Inténtalo de nuevo.`) },
      ),
    [togglePaid],
  );

  const renderContent = () => {
    if (isLoading) return <BudgetSkeleton />;

    // Con datos en caché no se tapa el presupuesto por un fallo de refresco en segundo plano.
    if (!data) {
      return (
        <Card style={styles.message}>
          <ThemedText accessibilityRole="alert">No se pudo cargar el presupuesto.</ThemedText>
          <Button label="Reintentar" variant="secondary" onPress={() => refetch()} />
        </Card>
      );
    }

    if (!data.month) {
      return (
        <Card>
          <ThemedText themeColor="textSecondary">No hay presupuesto de este mes.</ThemedText>
        </Card>
      );
    }

    if (data.groups.length === 0) {
      return (
        <Card>
          <ThemedText themeColor="textSecondary">Todavía no hay grupos en tu presupuesto.</ThemedText>
        </Card>
      );
    }

    return (
      <Animated.View entering={CONTENT_FADE_IN} style={styles.list}>
        <BudgetSummary
          key={`${selected.year}-${selected.month}`}
          totals={getMonthTotals(data.groups, Number(data.month.income))}
          onSaveIncome={saveIncome}
        />
        {data.groups.map((group) => (
          <BudgetGroupCard key={group.id} group={group} onTogglePaid={handleTogglePaid} />
        ))}
      </Animated.View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" accessibilityRole="header" style={styles.title}>
            Presupuesto
          </ThemedText>
          <MonthYearPicker
            year={selected.year}
            month={selected.month}
            onChange={(year, month) => setSelected({ year, month })}
          />
          <View>{renderContent()}</View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
};

export default BudgetsScreen;
