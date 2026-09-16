import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { CategoryPill } from '@/components/CategoryPill';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { formatDate, formatMoney } from '@/lib/format';
import type { Transaction, TransactionType } from '@/types/api';

const TYPE_FILTERS: { label: string; value: TransactionType | undefined }[] = [
  { label: 'Todo', value: undefined },
  { label: 'Gastos', value: 'EXPENSE' },
  { label: 'Ingresos', value: 'INCOME' },
];

export default function TransactionsScreen() {
  const theme = useTheme();
  const [type, setType] = useState<TransactionType | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');

  const { data: categories } = useCategories();
  const filters = useMemo(
    () => ({ type, categoryId, search: search.trim() || undefined }),
    [type, categoryId, search],
  );
  const { data, isLoading } = useTransactions(filters);

  const visibleCategories = categories?.filter((c) => !type || c.type === type) ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerRow}>
          <ThemedText type="title" style={styles.title}>
            Movimientos
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/add-transaction')}
            style={[styles.addButton, { backgroundColor: theme.primary }]}>
            <Feather name="plus" size={20} color={theme.primaryText} />
          </Pressable>
        </View>

        <View style={styles.filters}>
          <Input placeholder="Buscar por descripción" value={search} onChangeText={setSearch} />

          <View style={styles.segmentRow}>
            {TYPE_FILTERS.map((option) => {
              const active = type === option.value;
              return (
                <Pressable
                  key={option.label}
                  onPress={() => {
                    setType(option.value);
                    setCategoryId(undefined);
                  }}
                  style={[
                    styles.segment,
                    { backgroundColor: active ? theme.primary : theme.backgroundElement },
                  ]}>
                  <ThemedText type="small" style={{ color: active ? theme.primaryText : theme.text }}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {visibleCategories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {visibleCategories.map((category) => (
                <Pressable
                  key={category.id}
                  onPress={() => setCategoryId(categoryId === category.id ? undefined : category.id)}
                  style={{ opacity: !categoryId || categoryId === category.id ? 1 : 0.4 }}>
                  <CategoryPill category={category} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <FlatList
          data={data?.transactions ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !isLoading ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                No hay movimientos que coincidan con el filtro.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => <TransactionRow transaction={item} />}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isExpense = transaction.type === 'EXPENSE';
  return (
    <Card style={styles.row}>
      <View style={styles.rowInfo}>
        <ThemedText type="default" numberOfLines={1}>
          {transaction.description || transaction.category.name}
        </ThemedText>
        <View style={styles.rowMeta}>
          <CategoryPill category={transaction.category} />
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(transaction.occurredAt)}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="smallBold" themeColor={isExpense ? 'expense' : 'income'}>
        {isExpense ? '-' : '+'}
        {formatMoney(transaction.amount)}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontSize: 28, lineHeight: 34 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  segmentRow: { flexDirection: 'row', gap: Spacing.two },
  segment: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    alignItems: 'center',
  },
  chipRow: { gap: Spacing.two, paddingVertical: Spacing.one },
  list: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  rowInfo: { flex: 1, gap: Spacing.one },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  empty: { textAlign: 'center', marginTop: Spacing.five },
});
