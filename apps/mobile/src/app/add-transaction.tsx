import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { CategoryPill } from '@/components/CategoryPill';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCategories } from '@/hooks/useCategories';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { TransactionType } from '@/types/api';

export default function AddTransactionScreen() {
  const theme = useTheme();
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: categories } = useCategories();
  const createTransaction = useCreateTransaction();

  const visibleCategories = useMemo(
    () => categories?.filter((c) => c.type === type) ?? [],
    [categories, type],
  );

  const submit = () => {
    setError(null);
    const numericAmount = Number(amount.replace(',', '.'));

    if (!categoryId) {
      setError('Elige una categoría');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setError('Introduce un importe válido');
      return;
    }

    createTransaction.mutate(
      {
        categoryId,
        type,
        amount: numericAmount,
        description: description.trim() || undefined,
        occurredAt: occurredAt.toISOString(),
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Error inesperado'),
      },
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmentRow}>
          {(['EXPENSE', 'INCOME'] as const).map((option) => {
            const active = type === option;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  setType(option);
                  setCategoryId(undefined);
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

        <Input
          placeholder="0,00 €"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={styles.amountInput}
        />

        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            Categoría
          </ThemedText>
          <View style={styles.chipWrap}>
            {visibleCategories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => setCategoryId(category.id)}
                style={{ opacity: !categoryId || categoryId === category.id ? 1 : 0.4 }}>
                <CategoryPill category={category} />
              </Pressable>
            ))}
          </View>
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
                if (date) setOccurredAt(date);
              }}
            />
          )}
        </View>

        <Input
          placeholder="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
        />

        {error && (
          <ThemedText themeColor="danger" type="small">
            {error}
          </ThemedText>
        )}

        <Button label="Guardar" loading={createTransaction.isPending} onPress={submit} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  segmentRow: { flexDirection: 'row', gap: Spacing.two },
  segment: { flex: 1, paddingVertical: Spacing.three, borderRadius: 14, alignItems: 'center' },
  amountInput: { fontSize: 28, textAlign: 'center' },
  field: { gap: Spacing.two },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
