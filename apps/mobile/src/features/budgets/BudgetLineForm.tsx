import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Button } from '@/components/Button';
import { CategoryPill } from '@/components/CategoryPill';
import { FieldError } from '@/components/FieldError';
import { Input } from '@/components/Input';
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
import { ThemedText } from '@/components/themed-text';
import type { Category } from '@/features/categories/categories.types';
import { ApiError } from '@/lib/api';
import { confirmAsync } from '@/utils/alert';
import { budgetLineSchema, type BudgetLineFormValues } from './budgets.schema';
import type { BudgetLineType, BudgetScope } from './budgets.types';
import { styles } from './BudgetLineForm.styles';

interface BudgetLineFormProps {
  defaultValues: BudgetLineFormValues;
  categories: Category[];
  // null = sin selector (el tipo no se puede cambiar / el alcance no aplica).
  typeOptions: SegmentOption<BudgetLineType>[] | null;
  scopeOptions: SegmentOption<BudgetScope>[] | null;
  submitLabel: string;
  onSubmit: (values: BudgetLineFormValues) => Promise<unknown>;
  onCancel: () => void;
  // Solo al editar una linea existente.
  onDelete?: (scope: BudgetScope) => Promise<unknown>;
}

const messageOf = (error: unknown) => (error instanceof ApiError ? error.message : 'Error inesperado');

export const BudgetLineForm = ({
  defaultValues,
  categories,
  typeOptions,
  scopeOptions,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: BudgetLineFormProps) => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BudgetLineFormValues>({
    resolver: yupResolver(budgetLineSchema),
    defaultValues,
  });
  const lineType = watch('lineType');
  const scope = watch('scope');
  const expenseCategories = categories.filter((category) => category.type === 'EXPENSE');
  // Con una peticion en curso no se puede cancelar, borrar ni volver a enviar.
  const busy = isSubmitting || deleting;

  const cancel = async () => {
    if (isDirty) {
      const discard = await confirmAsync({
        title: 'Descartar cambios',
        message: 'Tienes cambios sin guardar en esta línea. ¿Quieres descartarlos?',
        confirmLabel: 'Descartar',
        destructive: true,
      });
      if (!discard) return;
    }
    onCancel();
  };

  const submit = async (values: BudgetLineFormValues) => {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(messageOf(error));
    }
  };

  const confirmDelete = async () => {
    if (!onDelete) return;
    const alsoTemplate = scopeOptions !== null && scope === 'template';
    const confirmed = await confirmAsync({
      title: 'Borrar línea',
      message: alsoTemplate
        ? `¿Quitar "${defaultValues.name}" de este mes y de los siguientes?`
        : `¿Quitar "${defaultValues.name}" de este mes?`,
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (!confirmed) return;
    setServerError(null);
    setDeleting(true);
    try {
      await onDelete(scope);
    } catch (error) {
      setServerError(messageOf(error));
      setDeleting(false);
    }
  };

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            testID="budget-line-name"
            autoFocus
            accessibilityLabel="Nombre de la línea"
            placeholder="Nombre (Netflix, Hipoteca...)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      <FieldError message={errors.name?.message} />

      {typeOptions && (
        <Controller
          control={control}
          name="lineType"
          render={({ field }) => (
            <SegmentedControl
              accessibilityLabel="Tipo de línea"
              options={typeOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      )}

      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <Input
            testID="budget-line-amount"
            accessibilityLabel={lineType === 'LIMIT' ? 'Límite en euros' : 'Importe en euros'}
            placeholder={lineType === 'LIMIT' ? 'Límite (€)' : 'Importe (€)'}
            keyboardType="decimal-pad"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      <FieldError message={errors.amount?.message} />

      {lineType === 'LIMIT' && (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Categoría
          </ThemedText>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <View accessibilityRole="radiogroup" accessibilityLabel="Categoría" style={styles.chipWrap}>
                {expenseCategories.length === 0 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    No hay categorías de gasto. Crea una en la pestaña Categorías.
                  </ThemedText>
                )}
                {expenseCategories.map((category) => (
                  <AnimatedPressable
                    key={category.id}
                    testID={`budget-line-category-${category.id}`}
                    accessibilityRole="radio"
                    accessibilityLabel={category.name}
                    accessibilityState={{ selected: field.value === category.id }}
                    onPress={() => field.onChange(category.id)}
                    style={[styles.chipTouchArea, { opacity: !field.value || field.value === category.id ? 1 : 0.4 }]}>
                    <CategoryPill category={category} />
                  </AnimatedPressable>
                ))}
              </View>
            )}
          />
          <FieldError message={errors.categoryId?.message} />
        </View>
      )}

      {scopeOptions && (
        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Se aplica a
          </ThemedText>
          <Controller
            control={control}
            name="scope"
            render={({ field }) => (
              <SegmentedControl
                accessibilityLabel="Se aplica a"
                options={scopeOptions}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </View>
      )}

      <FieldError message={serverError} />

      <Button
        testID="budget-line-submit"
        label={submitLabel}
        loading={isSubmitting}
        disabled={busy}
        onPress={handleSubmit(submit)}
      />
      <Button testID="budget-line-cancel" label="Cancelar" variant="secondary" disabled={busy} onPress={cancel} />
      {onDelete && (
        <Button
          testID="budget-line-delete"
          label="Eliminar línea"
          variant="danger"
          loading={deleting}
          disabled={busy}
          onPress={confirmDelete}
        />
      )}
    </View>
  );
};
