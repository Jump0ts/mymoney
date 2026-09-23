import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Card } from '@/components/Card';
import { DonutChart } from '@/components/DonutChart';
import { DonutChartLegendSkeleton, DonutChartSkeleton } from '@/components/DonutChartSkeleton';
import { MonthlyBarChart } from '@/components/MonthlyBarChart';
import { MonthlyBarChartSkeleton } from '@/components/MonthlyBarChartSkeleton';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { Skeleton } from '@/components/Skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/features/auth/auth.store';
import { useSummary } from '@/features/transactions/useTransactions';
import { useTheme } from '@/hooks/use-theme';
import { getCurrentYearMonth, getMonthRange } from '@/utils/date';
import { formatMoney } from '@/utils/format';
import { styles } from '@/screens/tabs/index.styles';

// Constructor de la animacion fuera del componente: reutilizarlo evita
// reconstruirlo en cada render (ver skill animate-expo, "List entrances").
const CONTENT_FADE_IN = FadeIn.duration(200);

const DashboardScreen = () => {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const [selected, setSelected] = useState(getCurrentYearMonth());
  const selectedMonthKey = `${selected.year}-${String(selected.month).padStart(2, '0')}`;

  const { data: summary, isLoading } = useSummary(getMonthRange(selected.year, selected.month));
  // Historico completo (sin filtro de mes) solo para el grafico de barras.
  const { data: history, isLoading: isHistoryLoading } = useSummary();

  const expenseSlices =
    summary?.byCategory
      .filter((c) => c.type === 'EXPENSE')
      .map((c) => ({ label: c.categoryName, value: c.total, color: c.color })) ?? [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <ThemedText type="small" themeColor="textSecondary">
                Hola, {user?.name}
              </ThemedText>
              {isLoading ? (
                <Skeleton height={38} width={140} />
              ) : (
                <Animated.View entering={CONTENT_FADE_IN}>
                  <ThemedText type="title" style={styles.balance}>
                    {formatMoney(summary?.balance ?? 0)}
                  </ThemedText>
                </Animated.View>
              )}
            </View>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Añadir movimiento"
              onPress={() => router.push('/add-transaction')}
              style={[styles.fab, { backgroundColor: theme.primary }]}>
              <Feather name="plus" size={24} color={theme.primaryText} />
            </AnimatedPressable>
          </View>

          <MonthYearPicker
            year={selected.year}
            month={selected.month}
            onChange={(year, month) => setSelected({ year, month })}
          />

          <View style={styles.totalsRow}>
            <Card style={styles.totalCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Ingresos
              </ThemedText>
              {isLoading ? (
                <Skeleton height={26} width={90} style={styles.totalAmountSkeleton} />
              ) : (
                <Animated.View entering={CONTENT_FADE_IN}>
                  <ThemedText type="subtitle" themeColor="income" style={styles.totalAmount}>
                    {formatMoney(summary?.totalIncome ?? 0)}
                  </ThemedText>
                </Animated.View>
              )}
            </Card>
            <Card style={styles.totalCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Gastos
              </ThemedText>
              {isLoading ? (
                <Skeleton height={26} width={90} style={styles.totalAmountSkeleton} />
              ) : (
                <Animated.View entering={CONTENT_FADE_IN}>
                  <ThemedText type="subtitle" themeColor="expense" style={styles.totalAmount}>
                    {formatMoney(summary?.totalExpense ?? 0)}
                  </ThemedText>
                </Animated.View>
              )}
            </Card>
          </View>

          <Card style={styles.card}>
            <ThemedText type="smallBold" style={styles.cardTitle}>
              Gastos por categoría
            </ThemedText>
            {isLoading ? (
              <View style={styles.donutRow}>
                <DonutChartSkeleton />
                <DonutChartLegendSkeleton />
              </View>
            ) : expenseSlices.length > 0 ? (
              <Animated.View entering={CONTENT_FADE_IN} style={styles.donutRow}>
                <DonutChart
                  data={expenseSlices}
                  centerLabel={formatMoney(summary?.totalExpense ?? 0)}
                  centerSubLabel="total"
                />
                <View style={styles.legend}>
                  {expenseSlices.slice(0, 6).map((slice) => (
                    <View key={slice.label} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                      <ThemedText type="small" style={styles.legendLabel} numberOfLines={1}>
                        {slice.label}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatMoney(slice.value)}
                      </ThemedText>
                    </View>
                  ))}
                  {expenseSlices.length > 6 && (
                    <ThemedText type="small" themeColor="textSecondary">
                      +{expenseSlices.length - 6} más
                    </ThemedText>
                  )}
                </View>
              </Animated.View>
            ) : (
              <Animated.View entering={CONTENT_FADE_IN} style={styles.emptyCategoryState}>
                <ThemedText type="small" themeColor="textSecondary">
                  Todavía no hay gastos registrados.
                </ThemedText>
              </Animated.View>
            )}
          </Card>

          <Card style={styles.card}>
            <ThemedText type="smallBold" style={styles.cardTitle}>
              Ingresos y gastos por mes
            </ThemedText>
            {isHistoryLoading ? (
              <MonthlyBarChartSkeleton />
            ) : (
              <Animated.View entering={CONTENT_FADE_IN}>
                <MonthlyBarChart
                  data={history?.byMonth ?? []}
                  selectedMonth={selectedMonthKey}
                  onSelectMonth={(monthKey) => {
                    const [year, month] = monthKey.split('-').map(Number);
                    setSelected({ year, month });
                  }}
                />
              </Animated.View>
            )}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
};

export default DashboardScreen;
