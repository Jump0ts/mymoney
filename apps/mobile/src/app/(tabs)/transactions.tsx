import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryPill } from '@/components/CategoryPill';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCategories } from '@/features/categories/useCategories';
import { TRANSACTION_TYPE_FILTERS } from '@/features/transactions/transactions.constants';
import type { TransactionType } from '@/features/transactions/transactions.types';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import { useTransactions } from '@/features/transactions/useTransactions';
import { useTheme } from '@/hooks/use-theme';
import { styles } from '@/screens/tabs/transactions.styles';

const TransactionsScreen = () => {
  const theme = useTheme();
  const [type, setType] = useState<TransactionType | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const chipScrollRef = useRef<ScrollView>(null);

  const { data: categories } = useCategories();
  const filters = useMemo(
    () => ({ type, categoryId, search: search.trim() || undefined }),
    [type, categoryId, search],
  );
  const { data, isLoading } = useTransactions(filters);

  const visibleCategories = categories?.filter((c) => !type || c.type === type) ?? [];

  // En web, el gesto tactil horizontal no existe: traducimos la rueda vertical del raton a scroll horizontal.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = (chipScrollRef.current as unknown as { getScrollableNode?: () => HTMLElement })?.getScrollableNode?.();
    if (!node) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      node.scrollLeft += event.deltaY;
      event.preventDefault();
    };

    node.addEventListener('wheel', handleWheel);
    return () => node.removeEventListener('wheel', handleWheel);
  }, [visibleCategories.length]);

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
            {TRANSACTION_TYPE_FILTERS.map((option) => {
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
            <ScrollView
              ref={chipScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}>
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
};

export default TransactionsScreen;
