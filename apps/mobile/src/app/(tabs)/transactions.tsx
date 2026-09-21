import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarGrid } from '@/components/CalendarGrid';
import { CategoryPill } from '@/components/CategoryPill';
import { Input } from '@/components/Input';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCategories } from '@/features/categories/useCategories';
import { TRANSACTION_TYPE_FILTERS } from '@/features/transactions/transactions.constants';
import type { Transaction, TransactionType } from '@/features/transactions/transactions.types';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import { useDeleteTransaction, useTransactions } from '@/features/transactions/useTransactions';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { getCurrentYearMonth, getDayRange, getMonthRange } from '@/utils/date';
import { styles } from '@/screens/tabs/transactions.styles';
import { confirmAsync, notify } from '@/utils/alert';

const CHIP_SCROLL_STEP = 160;

const TransactionsScreen = () => {
  const theme = useTheme();
  const [type, setType] = useState<TransactionType | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [page, setPage] = useState(1);
  const [canScrollChipsLeft, setCanScrollChipsLeft] = useState(false);
  const [canScrollChipsRight, setCanScrollChipsRight] = useState(false);
  const chipScrollRef = useRef<ScrollView>(null);

  const { data: categories } = useCategories();
  const deleteTransaction = useDeleteTransaction();
  const filters = useMemo(
    () => ({
      type,
      categoryId,
      search: search.trim() || undefined,
      page,
      ...(selectedDay ? getDayRange(selectedDay) : getMonthRange(selectedMonth.year, selectedMonth.month)),
    }),
    [type, categoryId, search, page, selectedMonth, selectedDay],
  );
  const { data, isLoading } = useTransactions(filters);
  const pagination = data?.pagination;

  const visibleCategories = categories?.filter((c) => !type || c.type === type) ?? [];

  // Un dia solo tiene sentido dentro del mes que hay seleccionado.
  useEffect(() => {
    setSelectedDay(undefined);
  }, [selectedMonth]);

  useEffect(() => {
    setPage(1);
  }, [type, categoryId, search, selectedMonth, selectedDay]);

  const getChipScrollNode = () =>
    (chipScrollRef.current as unknown as { getScrollableNode?: () => HTMLElement })?.getScrollableNode?.();

  // En web no hay gesto tactil: se ofrecen flechas de navegacion en su lugar.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = getChipScrollNode();
    if (!node) return;

    const updateScrollState = () => {
      setCanScrollChipsLeft(node.scrollLeft > 0);
      setCanScrollChipsRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 1);
    };

    updateScrollState();
    node.addEventListener('scroll', updateScrollState);
    return () => node.removeEventListener('scroll', updateScrollState);
  }, [visibleCategories.length]);

  const scrollChips = (direction: 'left' | 'right') => {
    const node = getChipScrollNode();
    node?.scrollBy({ left: direction === 'left' ? -CHIP_SCROLL_STEP : CHIP_SCROLL_STEP, behavior: 'smooth' });
  };

  const handleEditTransaction = (transaction: Transaction) => {
    router.push({
      pathname: '/edit-transaction/[id]',
      params: { id: transaction.id, transaction: JSON.stringify(transaction) },
    });
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    const confirmed = await confirmAsync({
      title: 'Borrar movimiento',
      message: `¿Seguro que quieres borrar "${transaction.description || transaction.category.name}"?`,
      confirmLabel: 'Borrar',
      destructive: true,
    });
    if (!confirmed) return;

    deleteTransaction.mutate(transaction.id, {
      onError: (err) => notify('No se pudo borrar', err instanceof ApiError ? err.message : 'Error inesperado'),
    });
  };

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
          <View style={styles.monthRow}>
            <MonthYearPicker
              year={selectedMonth.year}
              month={selectedMonth.month}
              onChange={(year, month) => setSelectedMonth({ year, month })}
            />
            <Pressable
              accessibilityRole="button"
              testID="day-picker-toggle"
              onPress={() => setShowDayPicker((v) => !v)}
              style={[
                styles.dayToggle,
                {
                  backgroundColor: selectedDay ? theme.primary : theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}>
              <Feather name="calendar" size={16} color={selectedDay ? theme.primaryText : theme.text} />
            </Pressable>
          </View>

          {showDayPicker && (
            <View style={styles.dayPickerPanel}>
              <CalendarGrid
                year={selectedMonth.year}
                month={selectedMonth.month}
                selectedDate={selectedDay}
                maxDate={new Date()}
                onSelectDate={(dateKey) => setSelectedDay(dateKey === selectedDay ? undefined : dateKey)}
              />
              {selectedDay && (
                <Pressable accessibilityRole="button" onPress={() => setSelectedDay(undefined)}>
                  <ThemedText type="small" themeColor="primary">
                    Ver todo el mes
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )}

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
            <View style={styles.chipScrollWrap}>
              {Platform.OS === 'web' && canScrollChipsLeft && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => scrollChips('left')}
                  style={[
                    styles.chipArrow,
                    styles.chipArrowLeft,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}>
                  <Feather name="chevron-left" size={16} color={theme.text} />
                </Pressable>
              )}
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
              {Platform.OS === 'web' && canScrollChipsRight && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => scrollChips('right')}
                  style={[
                    styles.chipArrow,
                    styles.chipArrowRight,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}>
                  <Feather name="chevron-right" size={16} color={theme.text} />
                </Pressable>
              )}
            </View>
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
          renderItem={({ item }) => (
            <TransactionRow transaction={item} onEdit={handleEditTransaction} onDelete={handleDeleteTransaction} />
          )}
          ListFooterComponent={
            pagination && pagination.totalPages > 1 ? (
              <View style={styles.pagination}>
                <Pressable
                  accessibilityRole="button"
                  disabled={pagination.page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  style={[
                    styles.paginationButton,
                    { backgroundColor: theme.backgroundElement, opacity: pagination.page <= 1 ? 0.4 : 1 },
                  ]}>
                  <Feather name="chevron-left" size={16} color={theme.text} />
                </Pressable>
                <ThemedText type="small" themeColor="textSecondary">
                  Página {pagination.page} de {pagination.totalPages}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onPress={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  style={[
                    styles.paginationButton,
                    {
                      backgroundColor: theme.backgroundElement,
                      opacity: pagination.page >= pagination.totalPages ? 0.4 : 1,
                    },
                  ]}>
                  <Feather name="chevron-right" size={16} color={theme.text} />
                </Pressable>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
};

export default TransactionsScreen;
