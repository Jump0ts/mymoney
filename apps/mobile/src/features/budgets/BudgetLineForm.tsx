import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { FieldError } from '@/components/FieldError';
import { Input } from '@/components/Input';
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
import { ThemedText } from '@/components/themed-text';
import { ApiError } from '@/lib/api';
import { confirmAsync } from '@/utils/alert';
import { budgetLineSchema, type BudgetLineFormValues } from './budgets.schema';
import { LINE_TYPE_OPTIONS } from './budgets.constants';
import type { BudgetScope } from './budgets.types';
import { useReportDirty } from './useEditGuard';
import { styles } from './BudgetLineForm.styles';

interface BudgetLineFormProps {
  defaultValues: BudgetLineFormValues;
  // null = sin selector de alcance (la linea no esta en la plantilla).
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
  const scope = watch('scope');
  useReportDirty(isDirty);
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

      <Controller
        control={control}
        name="lineType"
        render={({ field }) => (
          <SegmentedControl
            accessibilityLabel="Tipo de línea"
            options={LINE_TYPE_OPTIONS}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <Input
            testID="budget-line-amount"
            accessibilityLabel="Importe en euros"
            placeholder="Importe (€)"
            keyboardType="decimal-pad"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      <FieldError message={errors.amount?.message} />

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
