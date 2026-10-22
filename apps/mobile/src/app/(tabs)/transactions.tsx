import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, LinearTransition, useReducedMotion } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { CalendarGrid } from '@/components/CalendarGrid';
import { CategoryPill } from '@/components/CategoryPill';
import { Input } from '@/components/Input';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCategories } from '@/features/categories/useCategories';
import { TRANSACTION_TYPE_FILTERS } from '@/features/transactions/transactions.constants';
import type { Transaction, TransactionType } from '@/features/transactions/transactions.types';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import { TransactionRowSkeleton } from '@/features/transactions/TransactionRowSkeleton';
import { useDeleteTransaction, useTransactions } from '@/features/transactions/useTransactions';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import { getCurrentYearMonth, getDayRange, getMonthRange } from '@/utils/date';
import { styles } from '@/screens/tabs/transactions.styles';
import { confirmAsync, notify } from '@/utils/alert';

const CHIP_SCROLL_STEP = 160;
const SKELETON_ROWS = 5;
const DELETE_FADE_MS = 180;
const CONTENT_FADE_IN = FadeIn.duration(200);
// Cierra el hueco que deja una fila borrada deslizando las demas, sin
// animar el montaje/desmontaje de cada fila (ver TransactionRow.tsx).
const ROW_REFLOW = LinearTransition.duration(200);

const TransactionsScreen = () => {
  const theme = useTheme();
  const [type, setType] = useState<TransactionType | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth());
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [page, setPage] = useState(1);
  const [canScrollChipsLeft, setCanScrollChipsLeft] = useState(false);
  const [canScrollChipsRight, setCanScrollChipsRight] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const chipScrollRef = useRef<ScrollView>(null);
  const reduceMotion = useReducedMotion();

  const { data: categories } = useCategories();
  const deleteTransaction = useDeleteTransaction();
  const filters = useMemo(
    () => ({
      type,
      categoryId,
      search: debouncedSearch.trim() || undefined,
      page,
      ...(selectedDay ? getDayRange(selectedDay) : getMonthRange(selectedMonth.year, selectedMonth.month)),
    }),
    [type, categoryId, debouncedSearch, page, selectedMonth, selectedDay],
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
  }, [type, categoryId, debouncedSearch, selectedMonth, selectedDay]);

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

  const handleEditTransaction = useCallback((transaction: Transaction) => {
    // Solo el id va en la URL. En web, Expo Router serializa los params en la
    // query string; meter el movimiento entero (importe, descripcion...) ahi
    // lo dejaria en el historial del navegador y en logs de acceso.
    router.push({ pathname: '/edit-transaction/[id]', params: { id: transaction.id } });
  }, []);

  const handleDeleteTransaction = useCallback(
    async (transaction: Transaction) => {
      const confirmed = await confirmAsync({
        title: 'Borrar movimiento',
        message: `¿Seguro que quieres borrar "${transaction.description || transaction.category.name}"?`,
        confirmLabel: 'Borrar',
        destructive: true,
      });
      if (!confirmed) return;

      // Se desvanece primero y se borra de verdad despues: si se quitara del
      // array al instante, un FlatList virtualizado podria confundir ese
      // desmontaje con el reciclado normal de filas al hacer scroll. Con
      // Reducir movimiento activado el fundido es instantaneo, asi que no
      // tiene sentido seguir retrasando el borrado real.
      setDeletingId(transaction.id);
      setTimeout(
        () => {
          deleteTransaction.mutate(transaction.id, {
            onError: (err) => {
              setDeletingId(null);
              notify('No se pudo borrar', err instanceof ApiError ? err.message : 'Error inesperado');
            },
            onSuccess: () => setDeletingId(null),
          });
        },
        reduceMotion ? 0 : DELETE_FADE_MS,
      );
    },
    [deleteTransaction, reduceMotion],
  );

  const renderTransactionRow = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionRow
        transaction={item}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
        isDeleting={item.id === deletingId}
      />
    ),
    [deletingId, handleDeleteTransaction, handleEditTransaction],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerRow}>
          <ThemedText type="title" accessibilityRole="header" style={styles.title}>
            Movimientos
          </ThemedText>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Añadir movimiento"
            onPress={() => router.push('/add-transaction')}
            style={[styles.addButton, { backgroundColor: theme.primary }]}>
            <Feather name="plus" size={20} color={theme.primaryText} />
          </AnimatedPressable>
        </View>

        <View style={styles.filters}>
          <View style={styles.monthRow}>
            <MonthYearPicker
              year={selectedMonth.year}
              month={selectedMonth.month}
              onChange={(year, month) => setSelectedMonth({ year, month })}
            />
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Filtrar por día"
              accessibilityState={{ selected: Boolean(selectedDay) }}
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
            </AnimatedPressable>
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
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Ver todo el mes"
                  style={styles.textButton}
                  onPress={() => setSelectedDay(undefined)}>
                  <ThemedText type="small" themeColor="primary">
                    Ver todo el mes
                  </ThemedText>
                </AnimatedPressable>
              )}
            </View>
          )}

          <Input placeholder="Buscar por descripción" value={search} onChangeText={setSearch} />

          <SegmentedControl
            options={TRANSACTION_TYPE_FILTERS}
            value={type}
            onChange={(next) => {
              setType(next);
              setCategoryId(undefined);
            }}
          />

          {visibleCategories.length > 0 && (
            <View style={styles.chipScrollWrap}>
              {Platform.OS === 'web' && canScrollChipsLeft && (
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Desplazar categorías a la izquierda"
                  onPress={() => scrollChips('left')}
                  style={[
                    styles.chipArrow,
                    styles.chipArrowLeft,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}>
                  <Feather name="chevron-left" size={16} color={theme.text} />
                </AnimatedPressable>
              )}
              <ScrollView
                ref={chipScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}>
                {visibleCategories.map((category) => (
                  <AnimatedPressable
                    key={category.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Filtrar por ${category.name}`}
                    accessibilityState={{ selected: categoryId === category.id }}
                    onPress={() => setCategoryId(categoryId === category.id ? undefined : category.id)}
                    style={[
                      styles.chipTouchArea,
                      { opacity: !categoryId || categoryId === category.id ? 1 : 0.4 },
                    ]}>
                    <CategoryPill category={category} />
                  </AnimatedPressable>
                ))}
              </ScrollView>
              {Platform.OS === 'web' && canScrollChipsRight && (
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Desplazar categorías a la derecha"
                  onPress={() => scrollChips('right')}
                  style={[
                    styles.chipArrow,
                    styles.chipArrowRight,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}>
                  <Feather name="chevron-right" size={16} color={theme.text} />
                </AnimatedPressable>
              )}
            </View>
          )}
        </View>

        {isLoading ? (
          <View style={styles.list}>
            {Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <TransactionRowSkeleton key={i} />
            ))}
          </View>
        ) : (
          <Animated.View entering={CONTENT_FADE_IN} style={styles.listFlex}>
            <Animated.FlatList
              data={data?.transactions ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              itemLayoutAnimation={ROW_REFLOW}
              ListEmptyComponent={
                <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                  No hay movimientos que coincidan con el filtro.
                </ThemedText>
              }
              renderItem={renderTransactionRow}
              ListFooterComponent={
                pagination && pagination.totalPages > 1 ? (
                  <View style={styles.pagination}>
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel="Página anterior"
                      accessibilityState={{ disabled: pagination.page <= 1 }}
                      disabled={pagination.page <= 1}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                      style={[
                        styles.paginationButton,
                        { backgroundColor: theme.backgroundElement, opacity: pagination.page <= 1 ? 0.4 : 1 },
                      ]}>
                      <Feather name="chevron-left" size={16} color={theme.text} />
                    </AnimatedPressable>
                    <ThemedText type="small" themeColor="textSecondary">
                      Página {pagination.page} de {pagination.totalPages}
                    </ThemedText>
                    <AnimatedPressable
                      accessibilityRole="button"
                      accessibilityLabel="Página siguiente"
                      accessibilityState={{ disabled: pagination.page >= pagination.totalPages }}
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
                    </AnimatedPressable>
                  </View>
                ) : null
              }
            />
          </Animated.View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
};

export default TransactionsScreen;
