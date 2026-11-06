import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FieldError } from '@/components/FieldError';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { ColorField } from '@/features/colors/ColorField';
import { ApiError } from '@/lib/api';
import { notify } from '@/utils/alert';
import { ColorPalette } from '@/features/colors/colors.constants';
import type { Category } from './categories.types';
import { createCategorySchema, type CreateCategoryFormValues } from './categories.schema';
import { useCreateCategory, useUpdateCategory } from './useCategories';
import { styles } from './CategoryForm.styles';

interface CategoryFormProps {
  // Si se da, el formulario edita esa categoria (nombre y color); si no, crea una nueva.
  category?: Category;
  onDone: () => void;
}

const sameColor = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();

export const CategoryForm = ({ category, onDone }: CategoryFormProps) => {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const editing = Boolean(category);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCategoryFormValues>({
    resolver: yupResolver(createCategorySchema),
    defaultValues: category
      ? { name: category.name, type: category.type, color: category.color, icon: category.icon }
      : { name: '', type: 'EXPENSE', color: ColorPalette[0], icon: 'tag' },
  });
  const selectedType = useWatch({ control, name: 'type' });

  const onSubmit = (values: CreateCategoryFormValues) => {
    if (!category) {
      createCategory.mutate(values, {
        onSuccess: onDone,
        onError: (err) => notify('No se pudo crear', err instanceof ApiError ? err.message : 'Error inesperado'),
      });
      return;
    }

    // Solo se manda lo que ha cambiado; si no ha cambiado nada, no hay nada que pedir al servidor.
    const name = values.name.trim();
    const changes = {
      ...(name !== category.name ? { name } : {}),
      ...(!sameColor(values.color, category.color) ? { color: values.color } : {}),
    };
    if (Object.keys(changes).length === 0) {
      onDone();
      return;
    }
    updateCategory.mutate(
      { id: category.id, ...changes },
      {
        onSuccess: onDone,
        onError: (err) => notify('No se pudo guardar', err instanceof ApiError ? err.message : 'Error inesperado'),
      },
    );
  };

  return (
    <Card style={styles.form}>
      {category && (
        <View style={styles.heading}>
          <ThemedText type="smallBold" accessibilityRole="header">
            Editar categoría
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {category.type === 'EXPENSE' ? 'Categoría de gasto' : 'Categoría de ingreso'}
          </ThemedText>
        </View>
      )}

      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            testID="category-name-input"
            accessibilityLabel="Nombre de la categoría"
            placeholder="Nombre de la categoría"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      <FieldError message={errors.name?.message} />

      {/* El tipo se elige al crear; una categoria con movimientos no puede cambiar de gasto a ingreso. */}
      {!editing && (
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <View accessibilityRole="radiogroup" style={styles.segmentRow}>
              {(['EXPENSE', 'INCOME'] as const).map((option) => (
                <AnimatedPressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityLabel={option === 'EXPENSE' ? 'Gasto' : 'Ingreso'}
                  accessibilityState={{ selected: selectedType === option }}
                  onPress={() => field.onChange(option)}
                  style={[styles.segment, { opacity: selectedType === option ? 1 : 0.5 }]}>
                  <ThemedText type="small">{option === 'EXPENSE' ? 'Gasto' : 'Ingreso'}</ThemedText>
                </AnimatedPressable>
              ))}
            </View>
          )}
        />
      )}

      <Controller
        control={control}
        name="color"
        render={({ field }) => <ColorField value={field.value} onChange={field.onChange} />}
      />

      <Button
        testID="category-submit"
        label={editing ? 'Guardar cambios' : 'Crear categoría'}
        loading={editing ? updateCategory.isPending : createCategory.isPending}
        onPress={handleSubmit(onSubmit)}
      />
      {editing && (
        <Button testID="category-cancel" label="Cancelar" variant="secondary" disabled={updateCategory.isPending} onPress={onDone} />
      )}
    </Card>
  );
};
