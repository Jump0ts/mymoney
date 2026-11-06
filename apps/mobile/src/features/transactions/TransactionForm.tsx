import { yupResolver } from '@hookform/resolvers/yup';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Button } from '@/components/Button';
import { CalendarGrid } from '@/components/CalendarGrid';
import { CategoryPill } from '@/components/CategoryPill';
import { FieldError } from '@/components/FieldError';
import { Input } from '@/components/Input';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCategories } from '@/features/categories/useCategories';
import { formatDateKey, type YearMonth } from '@/utils/date';
import { formatDate } from '@/utils/format';
import { BudgetLinkPicker } from './BudgetLinkPicker';
import { addTransactionSchema, type AddTransactionFormValues } from './transactions.schema';
import { styles } from './TransactionForm.styles';

type TransactionKind = 'EXPENSE' | 'INCOME' | 'REFUND';

const KIND_OPTIONS: SegmentOption<TransactionKind>[] = [
  { label: 'Gasto', value: 'EXPENSE', testID: 'transaction-type-EXPENSE' },
  { label: 'Ingreso', value: 'INCOME', testID: 'transaction-type-INCOME' },
  { label: 'Reembolso', value: 'REFUND', testID: 'transaction-type-REFUND' },
];

interface TransactionFormProps {
  defaultValues?: AddTransactionFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: AddTransactionFormValues) => void;
  // Movimiento que se esta editando: su propia linea del presupuesto sigue disponible para elegirla.
  ownTransactionId?: string;
  // Nombre ("Luz · Hogar") de la linea a la que ya esta enlazado el movimiento que se edita.
  linkedBudgetLabel?: string;
  // Linea que nacio con el movimiento que se edita: lo sigue aunque cambie de mes, asi que no se desenlaza sola.
  ownBudgetLineId?: string;
}

export const TransactionForm = ({
  defaultValues,
  submitLabel,
  isSubmitting,
  submitError,
  onSubmit,
  ownTransactionId,
  linkedBudgetLabel,
  ownBudgetLineId,
}: TransactionFormProps) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewedMonth, setViewedMonth] = useState<YearMonth>(() => {
    const initial = defaultValues?.occurredAt ?? new Date();
    return { year: initial.getFullYear(), month: initial.getMonth() + 1 };
  });
  const [amountText, setAmountText] = useState(
    defaultValues?.amount != null ? String(defaultValues.amount).replace('.', ',') : '',
  );

  const { data: categories } = useCategories();

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<AddTransactionFormValues>({
    resolver: yupResolver(addTransactionSchema),
    defaultValues: defaultValues ?? {
      type: 'EXPENSE',
      categoryId: '',
      amount: undefined,
      description: '',
      occurredAt: new Date(),
      budgetEntryId: null,
      budgetGroupId: null,
    },
  });

  const type = useWatch({ control, name: 'type' });
  const refund = Boolean(useWatch({ control, name: 'refund' }));
  // Gasto, ingreso o reembolso (un gasto de importe negativo: lo que te devuelven por un gasto).
  const kind: TransactionKind = type === 'INCOME' ? 'INCOME' : refund ? 'REFUND' : 'EXPENSE';
  const categoryId = useWatch({ control, name: 'categoryId' });
  const occurredAt = useWatch({ control, name: 'occurredAt' });
  const budgetEntryId = useWatch({ control, name: 'budgetEntryId' });
  const budgetGroupId = useWatch({ control, name: 'budgetGroupId' });

  const visibleCategories = useMemo(
    () => categories?.filter((c) => c.type === type) ?? [],
    [categories, type],
  );

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SegmentedControl
          accessibilityLabel="Tipo de movimiento"
          options={KIND_OPTIONS}
          value={kind}
          onChange={(option) => {
            if (option === kind) return;
            const nextType = option === 'INCOME' ? 'INCOME' : 'EXPENSE';
            // Las categorias de gasto sirven para un gasto y un reembolso; un ingreso tiene las suyas.
            if (nextType !== type) setValue('categoryId', '');
            setValue('type', nextType);
            setValue('refund', option === 'REFUND');
            // La linea elegida ya no encaja (un gasto con las de gasto, un reembolso con las de reembolso) y un
            // ingreso no cubre ninguna ni sale de un grupo. Un grupo vale para un gasto y para un reembolso.
            setValue('budgetEntryId', null);
            if (nextType === 'INCOME') setValue('budgetGroupId', null);
          }}
        />
        {kind === 'REFUND' && (
          <ThemedText type="small" themeColor="textSecondary">
            Lo que te devuelven por un gasto (la mitad de una cena): resta de su categoría en los resúmenes y no cuenta
            como ingreso. Elige la categoría del gasto.
          </ThemedText>
        )}

        <Input
          testID="transaction-amount-input"
          placeholder="0,00 €"
          keyboardType="decimal-pad"
          value={amountText}
          onChangeText={(text) => {
            setAmountText(text);
            const normalized = text.replace(',', '.');
            // El tipo del schema exige un number (required), pero mientras el usuario
            // escribe el campo puede estar legitimamente vacio a nivel de runtime.
            setValue('amount', (normalized === '' ? undefined : Number(normalized)) as number, {
              shouldValidate: false,
            });
          }}
          style={styles.amountInput}
        />
        <FieldError message={errors.amount?.message} />

        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Categoría
          </ThemedText>
          <View accessibilityRole="radiogroup" style={styles.chipWrap}>
            {visibleCategories.map((category) => (
              <AnimatedPressable
                key={category.id}
                accessibilityRole="radio"
                accessibilityLabel={category.name}
                accessibilityState={{ selected: categoryId === category.id }}
                testID={`category-chip-${category.id}`}
                onPress={() => setValue('categoryId', category.id)}
                style={[styles.chipTouchArea, { opacity: !categoryId || categoryId === category.id ? 1 : 0.4 }]}>
                <CategoryPill category={category} />
              </AnimatedPressable>
            ))}
          </View>
          <FieldError message={errors.categoryId?.message} />
        </View>

        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Fecha
          </ThemedText>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={`Fecha: ${formatDate(occurredAt.toISOString())}`}
            accessibilityState={{ expanded: showDatePicker }}
            testID="transaction-date-toggle"
            onPress={() => {
              setViewedMonth({ year: occurredAt.getFullYear(), month: occurredAt.getMonth() + 1 });
              setShowDatePicker((v) => !v);
            }}>
            <Input
              testID="transaction-date-input"
              editable={false}
              value={formatDate(occurredAt.toISOString())}
              style={styles.dateInput}
              importantForAccessibility="no"
              accessibilityElementsHidden
            />
          </AnimatedPressable>
          {showDatePicker && (
            <View style={styles.datePickerPanel}>
              <MonthYearPicker
                year={viewedMonth.year}
                month={viewedMonth.month}
                onChange={(year, month) => setViewedMonth({ year, month })}
              />
              <CalendarGrid
                year={viewedMonth.year}
                month={viewedMonth.month}
                selectedDate={formatDateKey(occurredAt)}
                maxDate={new Date()}
                onSelectDate={(dateKey) => {
                  const [year, month, day] = dateKey.split('-').map(Number);
                  setValue('occurredAt', new Date(year, month - 1, day, 12, 0, 0));
                  setShowDatePicker(false);
                }}
              />
            </View>
          )}
        </View>

        {type === 'EXPENSE' && (
          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Presupuesto
            </ThemedText>
            <BudgetLinkPicker
              refund={refund}
              month={{ year: occurredAt.getFullYear(), month: occurredAt.getMonth() + 1 }}
              value={budgetEntryId ?? null}
              groupValue={budgetGroupId ?? null}
              onGroupChange={(groupId) => {
                // Un grupo crea una linea nueva: sustituye a enlazar una que ya existe.
                setValue('budgetEntryId', null, { shouldDirty: true });
                setValue('budgetGroupId', groupId, { shouldDirty: true });
              }}
              ownLineId={ownBudgetLineId}
              onChange={(id, line) => {
                setValue('budgetEntryId', id, { shouldDirty: true });
                setValue('budgetGroupId', null, { shouldDirty: true });
                // Un sobre recibe muchos gastos: su importe es el de todos juntos y su nombre no describe esta compra.
                if (!id || !line || line.envelope) return;
                // Enlazar rellena lo que este vacio con lo de la linea del presupuesto (importe previsto y nombre
                // como descripcion); lo que ya este escrito no se toca.
                const planned = Number(line.plannedAmount);
                if (amountText.trim() === '' && planned > 0) {
                  setAmountText(String(planned).replace('.', ','));
                  setValue('amount', planned, { shouldValidate: false });
                }
                if ((getValues('description') ?? '').trim() === '') {
                  setValue('description', line.name, { shouldDirty: true });
                }
              }}
              ownTransactionId={ownTransactionId}
              currentLabel={linkedBudgetLabel}
            />
          </View>
        )}

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <Input
              placeholder="Descripción (opcional)"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />

        <FieldError message={submitError} />

        <Button
          testID="transaction-submit"
          label={submitLabel}
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};
