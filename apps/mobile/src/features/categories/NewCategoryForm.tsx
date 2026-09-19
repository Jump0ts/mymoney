import { yupResolver } from '@hookform/resolvers/yup';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { ApiError } from '@/lib/api';
import { notify } from '@/utils/alert';
import { CategoryPalette } from './categories.constants';
import { createCategorySchema, type CreateCategoryFormValues } from './categories.schema';
import { useCreateCategory } from './useCategories';
import { styles } from './NewCategoryForm.styles';

export const NewCategoryForm = ({ onDone }: { onDone: () => void }) => {
  const createCategory = useCreateCategory();
  const { control, handleSubmit, watch } = useForm<CreateCategoryFormValues>({
    resolver: yupResolver(createCategorySchema),
    defaultValues: { name: '', type: 'EXPENSE', color: CategoryPalette[0], icon: 'tag' },
  });
  const selectedColor = watch('color');
  const selectedType = watch('type');

  const onSubmit = (values: CreateCategoryFormValues) => {
    createCategory.mutate(values, {
      onSuccess: onDone,
      onError: (err) =>
        notify('No se pudo crear', err instanceof ApiError ? err.message : 'Error inesperado'),
    });
  };

  return (
    <Card style={styles.form}>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            placeholder="Nombre de la categoría"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />

      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <View style={styles.segmentRow}>
            {(['EXPENSE', 'INCOME'] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => field.onChange(option)}
                style={[styles.segment, { opacity: selectedType === option ? 1 : 0.5 }]}>
                <ThemedText type="small">{option === 'EXPENSE' ? 'Gasto' : 'Ingreso'}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      />

      <Controller
        control={control}
        name="color"
        render={({ field }) => (
          <View style={styles.paletteRow}>
            {CategoryPalette.map((swatch) => (
              <Pressable
                key={swatch}
                onPress={() => field.onChange(swatch)}
                style={[
                  styles.swatch,
                  { backgroundColor: swatch, borderWidth: selectedColor === swatch ? 3 : 0 },
                ]}
              />
            ))}
          </View>
        )}
      />

      <Button label="Crear categoría" loading={createCategory.isPending} onPress={handleSubmit(onSubmit)} />
    </Card>
  );
};
