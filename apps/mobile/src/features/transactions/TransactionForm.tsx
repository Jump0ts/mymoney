import { yupResolver } from '@hookform/resolvers/yup';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Button } from '@/components/Button';
import { CalendarGrid } from '@/components/CalendarGrid';
import { CategoryPill } from '@/components/CategoryPill';
import { Input } from '@/components/Input';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCategories } from '@/features/categories/useCategories';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, type YearMonth } from '@/utils/date';
import { formatDate } from '@/utils/format';
import { addTransactionSchema, type AddTransactionFormValues } from './transactions.schema';
import { styles } from './TransactionForm.styles';

interface TransactionFormProps {
  defaultValues?: AddTransactionFormValues;
  submitLabel: string;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: AddTransactionFormValues) => void;
}

export const TransactionForm = ({
  defaultValues,
  submitLabel,
  isSubmitting,
  submitError,
  onSubmit,
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
    },
  });

  const type = watch('type');
  const categoryId = watch('categoryId');
  const occurredAt = watch('occurredAt');

  const visibleCategories = useMemo(
    () => categories?.filter((c) => c.type === type) ?? [],
    [categories, type],
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <View style={styles.segmentRow}>
              {(['EXPENSE', 'INCOME'] as const).map((option) => {
                const active = field.value === option;
                return (
                  <AnimatedPressable
                    key={option}
                    testID={`transaction-type-${option}`}
                    onPress={() => {
                      field.onChange(option);
                      setValue('categoryId', '');
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
        {errors.amount && (
          <ThemedText themeColor="danger" type="small">
            {errors.amount.message}
          </ThemedText>
        )}

        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Categoría
          </ThemedText>
          <View style={styles.chipWrap}>
            {visibleCategories.map((category) => (
              <AnimatedPressable
                key={category.id}
                testID={`category-chip-${category.id}`}
                onPress={() => setValue('categoryId', category.id)}
                style={{ opacity: !categoryId || categoryId === category.id ? 1 : 0.4 }}>
                <CategoryPill category={category} />
              </AnimatedPressable>
            ))}
          </View>
          {errors.categoryId && (
            <ThemedText themeColor="danger" type="small">
              {errors.categoryId.message}
            </ThemedText>
          )}
        </View>

        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Fecha
          </ThemedText>
          <AnimatedPressable
            testID="transaction-date-toggle"
            onPress={() => {
              setViewedMonth({ year: occurredAt.getFullYear(), month: occurredAt.getMonth() + 1 });
              setShowDatePicker((v) => !v);
            }}>
            <Input editable={false} value={formatDate(occurredAt.toISOString())} pointerEvents="none" />
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

        {submitError && (
          <ThemedText themeColor="danger" type="small">
            {submitError}
          </ThemedText>
        )}

        <Button
          testID="transaction-submit"
          label={submitLabel}
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />
      </ScrollView>
    </ThemedView>
  );
};
