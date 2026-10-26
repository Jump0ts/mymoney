import { yupResolver } from '@hookform/resolvers/yup';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Button } from '@/components/Button';
import { CalendarGrid } from '@/components/CalendarGrid';
import { CategoryPill } from '@/components/CategoryPill';
import { FieldError } from '@/components/FieldError';
import { Input } from '@/components/Input';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCategories } from '@/features/categories/useCategories';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, type YearMonth } from '@/utils/date';
import { formatDate } from '@/utils/format';
import { BudgetLinkPicker } from './BudgetLinkPicker';
import { addTransactionSchema, type AddTransactionFormValues } from './transactions.schema';
import { styles } from './TransactionForm.styles';

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
}

export const TransactionForm = ({
  defaultValues,
  submitLabel,
  isSubmitting,
  submitError,
  onSubmit,
  ownTransactionId,
  linkedBudgetLabel,
}: TransactionFormProps) => {
  const theme = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewedMonth, setViewedMonth] = useState<YearMonth>(() => {
    const initial = defaultValues?.occurredAt ?? new Date();
    return { year: initial.getFullYear(), month: initial.getMonth() + 1 };
  });
  const [amountText, setAmountText] = useState(
    defaultValues ? String(defaultValues.amount).replace('.', ',') : '',
  );

  const { data: categories } = useCategories();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
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
    },
  });

  const type = watch('type');
  const categoryId = watch('categoryId');
  const occurredAt = watch('occurredAt');
  const budgetEntryId = watch('budgetEntryId');

  const visibleCategories = useMemo(
    () => categories?.filter((c) => c.type === type) ?? [],
    [categories, type],
  );

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <View accessibilityRole="radiogroup" style={styles.segmentRow}>
              {(['EXPENSE', 'INCOME'] as const).map((option) => {
                const active = field.value === option;
                return (
                  <AnimatedPressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityLabel={option === 'EXPENSE' ? 'Gasto' : 'Ingreso'}
                    accessibilityState={{ selected: active }}
                    testID={`transaction-type-${option}`}
                    onPress={() => {
                      field.onChange(option);
                      setValue('categoryId', '');
                      // Un ingreso no cubre ninguna linea del presupuesto.
                      if (option === 'INCOME') setValue('budgetEntryId', null);
                    }}
                    style={[
                      styles.segment,
                      { backgroundColor: active ? theme.primary : theme.backgroundElement },
                    ]}>
                    <ThemedText style={{ color: active ? theme.primaryText : theme.text }}>
                      {option === 'EXPENSE' ? 'Gasto' : 'Ingreso'}
                    </ThemedText>
                  </AnimatedPressable>
                );
              })}
            </View>
          )}
        />

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
              editable={false}
              value={formatDate(occurredAt.toISOString())}
              pointerEvents="none"
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
              month={{ year: occurredAt.getFullYear(), month: occurredAt.getMonth() + 1 }}
              value={budgetEntryId ?? null}
              onChange={(id, plannedAmount) => {
                setValue('budgetEntryId', id, { shouldDirty: true });
                // Enlazar con el importe vacio lo rellena con el previsto de la linea; uno ya escrito no se toca.
                if (id && plannedAmount && amountText.trim() === '') {
                  const planned = Number(plannedAmount);
                  if (planned > 0) {
                    setAmountText(String(planned).replace('.', ','));
                    setValue('amount', planned, { shouldValidate: false });
                  }
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
