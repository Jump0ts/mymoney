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
  const theme = useTheme();
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
    watch,
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

  const type = watch('type');
  const categoryId = watch('categoryId');
  const occurredAt = watch('occurredAt');
  const budgetEntryId = watch('budgetEntryId');
  const budgetGroupId = watch('budgetGroupId');

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
                      // Otro tipo ya no encaja con la linea (un gasto con las de gasto, un ingreso con las de
                      // reembolso) ni con el grupo: se quitan. Volver a tocar el mismo tipo no cambia nada.
                      if (option !== field.value) {
                        setValue('budgetEntryId', null);
                        setValue('budgetGroupId', null);
                      }
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

        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Presupuesto
          </ThemedText>
          <BudgetLinkPicker
            type={type}
            month={{ year: occurredAt.getFullYear(), month: occurredAt.getMonth() + 1 }}
            value={budgetEntryId ?? null}
            groupValue={budgetGroupId ?? null}
            // Un ingreso solo cubre un reembolso ya existente: no crea lineas nuevas desde un grupo.
            onGroupChange={
              type === 'EXPENSE'
                ? (groupId) => {
                    // Un grupo crea una linea nueva: sustituye a enlazar una que ya existe.
                    setValue('budgetEntryId', null, { shouldDirty: true });
                    setValue('budgetGroupId', groupId, { shouldDirty: true });
                  }
                : undefined
            }
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
