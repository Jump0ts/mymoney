import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Feather } from '@expo/vector-icons';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Button } from '@/components/Button';
import { ColorPicker } from '@/components/ColorPicker';
import { FieldError } from '@/components/FieldError';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { CategoryPalette } from '@/features/categories/categories.constants';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { confirmAsync } from '@/utils/alert';
import { budgetGroupSchema, type BudgetGroupFormValues } from './budgets.schema';
import { styles } from './BudgetGroupForm.styles';

interface BudgetGroupFormProps {
  defaultValues?: BudgetGroupFormValues;
  submitLabel: string;
  onSubmit: (values: BudgetGroupFormValues) => Promise<unknown>;
  onCancel: () => void;
  // Solo al editar un grupo existente.
  onDelete?: () => Promise<unknown>;
}

const messageOf = (error: unknown) => (error instanceof ApiError ? error.message : 'Error inesperado');

export const BudgetGroupForm = ({ defaultValues, submitLabel, onSubmit, onCancel, onDelete }: BudgetGroupFormProps) => {
  const theme = useTheme();
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BudgetGroupFormValues>({
    resolver: yupResolver(budgetGroupSchema),
    defaultValues: defaultValues ?? { name: '', color: CategoryPalette[0], limit: '', isRemainder: false },
  });
  const isRemainder = watch('isRemainder');
  // Con una peticion en curso no se puede cancelar, borrar ni volver a enviar.
  const busy = isSubmitting || deleting;

  const cancel = async () => {
    if (isDirty) {
      const discard = await confirmAsync({
        title: 'Descartar cambios',
        message: 'Tienes cambios sin guardar en este grupo. ¿Quieres descartarlos?',
        confirmLabel: 'Descartar',
        destructive: true,
      });
      if (!discard) return;
    }
    onCancel();
  };

  const submit = async (values: BudgetGroupFormValues) => {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(messageOf(error));
    }
  };

  const confirmDelete = async () => {
    if (!onDelete) return;
    const confirmed = await confirmAsync({
      title: 'Borrar grupo',
      message: `¿Seguro que quieres borrar "${defaultValues?.name}"?`,
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (!confirmed) return;
    setServerError(null);
    setDeleting(true);
    try {
      await onDelete();
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
            testID="budget-group-name"
            autoFocus
            accessibilityLabel="Nombre del grupo"
            placeholder="Nombre del grupo"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      <FieldError message={errors.name?.message} />

      <Controller
        control={control}
        name="color"
        render={({ field }) => (
          <ColorPicker
            accessibilityLabel="Color del grupo"
            colors={CategoryPalette}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <Controller
        control={control}
        name="isRemainder"
        render={({ field }) => (
          <AnimatedPressable
            testID="budget-group-remainder"
            accessibilityRole="switch"
            accessibilityLabel="Recibe lo que sobra del sueldo"
            accessibilityHint="El disponible del grupo es el sueldo menos lo previsto en el resto de grupos"
            accessibilityState={{ checked: field.value }}
            onPress={() => {
              // Un grupo del sobrante no tiene limite propio: se vacia al marcarlo.
              if (!field.value) setValue('limit', '');
              field.onChange(!field.value);
            }}
            style={styles.toggle}>
            <Feather
              name={field.value ? 'check-square' : 'square'}
              size={20}
              color={field.value ? theme.primary : theme.textSecondary}
            />
            <ThemedText style={styles.toggleLabel}>Recibe lo que sobra del sueldo</ThemedText>
          </AnimatedPressable>
        )}
      />

      {!isRemainder && (
        <>
          <Controller
            control={control}
            name="limit"
            render={({ field }) => (
              <Input
                testID="budget-group-limit"
                accessibilityLabel="Límite del grupo en euros (opcional)"
                placeholder="Límite (€, opcional)"
                keyboardType="decimal-pad"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <FieldError message={errors.limit?.message} />
        </>
      )}

      <FieldError message={serverError} />

      <Button
        testID="budget-group-submit"
        label={submitLabel}
        loading={isSubmitting}
        disabled={busy}
        onPress={handleSubmit(submit)}
      />
      <Button testID="budget-group-cancel" label="Cancelar" variant="secondary" disabled={busy} onPress={cancel} />
      {onDelete && (
        <Button
          testID="budget-group-delete"
          label="Eliminar grupo"
          variant="danger"
          loading={deleting}
          disabled={busy}
          onPress={confirmDelete}
        />
      )}
    </View>
  );
};
