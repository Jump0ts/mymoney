import { yupResolver } from '@hookform/resolvers/yup';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/Button';
import { CategoryPill } from '@/components/CategoryPill';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCategories } from '@/features/categories/useCategories';
import { addTransactionSchema, type AddTransactionFormValues } from '@/features/transactions/transactions.schema';
import { useCreateTransaction } from '@/features/transactions/useTransactions';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/utils/format';
import { styles } from './add-transaction.styles';

const AddTransactionScreen = () => {
  const theme = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');

  const { data: categories } = useCategories();
  const createTransaction = useCreateTransaction();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddTransactionFormValues>({
    resolver: yupResolver(addTransactionSchema),
    defaultValues: { type: 'EXPENSE', categoryId: '', amount: undefined, description: '', occurredAt: new Date() },
  });

  const type = watch('type');
  const categoryId = watch('categoryId');
  const occurredAt = watch('occurredAt');

  const visibleCategories = useMemo(
    () => categories?.filter((c) => c.type === type) ?? [],
    [categories, type],
  );

  const onSubmit = (values: AddTransactionFormValues) => {
    setSubmitError(null);
    createTransaction.mutate(
      {
        categoryId: values.categoryId,
        type: values.type,
        amount: values.amount,
        description: values.description || undefined,
        occurredAt: values.occurredAt.toISOString(),
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => setSubmitError(err instanceof ApiError ? err.message : 'Error inesperado'),
      },
    );
  };

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
                  <Pressable
                    key={option}
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
                  </Pressable>
                );
              })}
            </View>
          )}
        />

        <Input
          placeholder="0,00 €"
          keyboardType="decimal-pad"
          value={amountText}
          onChangeText={(text) => {
            setAmountText(text);
            const normalized = text.replace(',', '.');
            setValue('amount', normalized === '' ? undefined : Number(normalized), {
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
              <Pressable
                key={category.id}
                onPress={() => setValue('categoryId', category.id)}
                style={{ opacity: !categoryId || categoryId === category.id ? 1 : 0.4 }}>
                <CategoryPill category={category} />
              </Pressable>
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
          <Pressable onPress={() => setShowDatePicker(true)}>
            <Input editable={false} value={formatDate(occurredAt.toISOString())} pointerEvents="none" />
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={occurredAt}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={(_event, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setValue('occurredAt', date);
              }}
            />
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

        <Button label="Guardar" loading={createTransaction.isPending} onPress={handleSubmit(onSubmit)} />
      </ScrollView>
    </ThemedView>
  );
};

export default AddTransactionScreen;
