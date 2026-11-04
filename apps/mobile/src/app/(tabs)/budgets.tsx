import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BudgetGroupCard } from '@/features/budgets/BudgetGroupCard';
import { BudgetNewGroup } from '@/features/budgets/BudgetNewGroup';
import { BudgetSkeleton } from '@/features/budgets/BudgetSkeleton';
import { BudgetSummary } from '@/features/budgets/BudgetSummary';
import type { BudgetEntry, BudgetGroup } from '@/features/budgets/budgets.types';
import { MAX_MONTHS_AHEAD } from '@/features/budgets/budgets.constants';
import {
  canAddExpenseIn,
  expenseDateFor,
  getMonthTotals,
  getRemainderAvailable,
  payEntryParams,
  shouldRegisterPayment,
} from '@/features/budgets/budgets.utils';
import {
  useBudgetMonth,
  useMoveInBudget,
  useToggleEntryPaid,
  useUpdateMonthIncome,
} from '@/features/budgets/useBudgets';
import { EditGuardProvider, useEditGuard } from '@/features/budgets/useEditGuard';
import { usePreviewMonth } from '@/features/budgets/usePreviewMonth';
import { useTheme } from '@/hooks/use-theme';
import { styles } from '@/screens/tabs/budgets.styles';
import { notify } from '@/utils/alert';
import { getCurrentYearMonth } from '@/utils/date';

const CONTENT_FADE_IN = FadeIn.duration(200);

const BudgetsScreen = () => {
  const theme = useTheme();
  const [selected, setSelected] = useState(getCurrentYearMonth());
  const [editMode, setEditMode] = useState(false);
  const { data, isLoading, refetch } = useBudgetMonth(selected);
  const { mutate: togglePaid } = useToggleEntryPaid(selected);
  const { mutateAsync: saveIncome } = useUpdateMonthIncome(selected);
  const { isPreview, ensureSaved, resolveEntryId } = usePreviewMonth(selected, data);
  const { moveGroup, moveEntry } = useMoveInBudget(selected);
  const { guard, confirmDiscard } = useEditGuard();

  const handleTogglePaid = useCallback(
    async (entry: BudgetEntry) => {
      // Pagar una linea del mes actual o de uno pasado es un gasto real: la hoja pide la categoria y lo crea.
      if (shouldRegisterPayment(entry, selected)) {
        router.push({ pathname: '/pay-entry', params: payEntryParams(entry, selected) });
        return;
      }
      const fail = () => notify('No se pudo actualizar', `No se pudo cambiar "${entry.name}". Inténtalo de nuevo.`);
      try {
        const id = await resolveEntryId(entry);
        if (!id) return fail();
        togglePaid({ id, paid: !entry.paid }, { onError: fail });
      } catch {
        fail();
      }
    },
    [resolveEntryId, selected, togglePaid],
  );

  const handleMoveGroup = useCallback(
    (group: BudgetGroup, delta: -1 | 1) =>
      moveGroup(group.id, delta, () =>
        notify('No se pudo mover', `No se pudo cambiar el orden de "${group.name}". Inténtalo de nuevo.`),
      ),
    [moveGroup],
  );

  const handleMoveEntry = useCallback(
    (group: BudgetGroup, entry: BudgetEntry, delta: -1 | 1) =>
      moveEntry(group.id, entry.id, delta, () =>
        notify('No se pudo mover', `No se pudo cambiar el orden de "${entry.name}". Inténtalo de nuevo.`),
      ),
    [moveEntry],
  );

  // Un gasto real del grupo: abre el formulario de Movimientos con el grupo elegido, que crea el gasto y su linea.
  const handleAddExpense = useCallback(
    (group: BudgetGroup) => {
      const date = expenseDateFor(selected);
      router.push({ pathname: '/add-transaction', params: { groupId: group.id, ...(date ? { date } : {}) } });
    },
    [selected],
  );

  // Cerrar el modo edicion o cambiar de mes descarta los formularios abiertos: antes se confirma.
  const toggleEditMode = async () => {
    if (editMode && !(await confirmDiscard())) return;
    // Editar un mes sin guardar lo guarda primero: las lineas que se editan tienen que existir.
    if (!editMode) {
      try {
        await ensureSaved();
      } catch {
        notify('No se pudo preparar el mes', 'Inténtalo de nuevo.');
        return;
      }
    }
    setEditMode((value) => !value);
  };

  const changeMonth = async (year: number, month: number) => {
    if (!(await confirmDiscard())) return;
    setSelected({ year, month });
  };

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
        <View style={styles.list}>
          <Card>
            <ThemedText themeColor="textSecondary">
              Todavía no hay grupos en tu presupuesto. Crea uno (Hogar, Alquiler, Deseos...) y añade sus líneas.
            </ThemedText>
          </Card>
          <BudgetNewGroup />
        </View>
      );
    }

    const income = Number(data.month.income);
    const remainderAvailable = getRemainderAvailable(data.groups, income);

    return (
      <Animated.View entering={CONTENT_FADE_IN} style={styles.list}>
        <BudgetSummary
          key={`${selected.year}-${selected.month}`}
          totals={getMonthTotals(data.groups, income)}
          onSaveIncome={saveIncome}
        />
        {data.groups.map((group, index) => (
          <BudgetGroupCard
            key={group.id}
            group={group}
            onTogglePaid={handleTogglePaid}
            editMode={editMode}
            remainderAvailable={remainderAvailable}
            onMoveGroup={handleMoveGroup}
            isFirst={index === 0}
            isLast={index === data.groups.length - 1}
            groupPosition={index}
            groupCount={data.groups.length}
            onMoveEntry={handleMoveEntry}
            onAddExpense={canAddExpenseIn(selected) ? handleAddExpense : undefined}
            target={selected}
          />
        ))}
        {editMode && <BudgetNewGroup />}
      </Animated.View>
    );
  };

  return (
    <EditGuardProvider value={guard}>
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <View style={styles.headerRow}>
            <ThemedText type="title" accessibilityRole="header" style={styles.title}>
              Presupuesto
            </ThemedText>
            <AnimatedPressable
              testID="budget-edit-toggle"
              accessibilityRole="button"
              accessibilityLabel={editMode ? 'Terminar de editar el presupuesto' : 'Editar el presupuesto'}
              accessibilityState={{ selected: editMode }}
              onPress={toggleEditMode}
              style={[
                styles.editButton,
                { backgroundColor: editMode ? theme.primary : theme.backgroundElement },
              ]}>
              <ThemedText type="smallBold" themeColor={editMode ? 'primaryText' : 'text'}>
                {editMode ? 'Listo' : 'Editar'}
              </ThemedText>
            </AnimatedPressable>
          </View>
          <MonthYearPicker
            year={selected.year}
            month={selected.month}
            onChange={changeMonth}
            maxMonthsAhead={MAX_MONTHS_AHEAD}
          />
          {isPreview && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.previewNote}>
              Mes por preparar: se guarda cuando lo edites o marques una línea.
            </ThemedText>
          )}
          <View>{renderContent()}</View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
    </EditGuardProvider>
  );
};

export default BudgetsScreen;
