import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { DonutChart } from '@/components/DonutChart';
import { MonthlyBarChart } from '@/components/MonthlyBarChart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/features/auth/auth.store';
import { useSummary } from '@/features/transactions/useTransactions';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/format';
import { styles } from './index.styles';

const DashboardScreen = () => {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data: summary, isLoading } = useSummary();

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
              <ThemedText type="title" style={styles.balance}>
                {isLoading ? '···' : formatMoney(summary?.balance ?? 0)}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/add-transaction')}
              style={[styles.fab, { backgroundColor: theme.primary }]}>
              <Feather name="plus" size={24} color={theme.primaryText} />
            </Pressable>
          </View>

          <View style={styles.totalsRow}>
            <Card style={styles.totalCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Ingresos
              </ThemedText>
              <ThemedText type="subtitle" themeColor="income" style={styles.totalAmount}>
                {formatMoney(summary?.totalIncome ?? 0)}
              </ThemedText>
            </Card>
            <Card style={styles.totalCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Gastos
              </ThemedText>
              <ThemedText type="subtitle" themeColor="expense" style={styles.totalAmount}>
                {formatMoney(summary?.totalExpense ?? 0)}
              </ThemedText>
            </Card>
          </View>

          <Card style={styles.card}>
            <ThemedText type="smallBold" style={styles.cardTitle}>
              Gastos por categoría
            </ThemedText>
            {expenseSlices.length > 0 ? (
              <View style={styles.donutRow}>
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
                </View>
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Todavía no hay gastos registrados.
              </ThemedText>
            )}
          </Card>

          <Card style={styles.card}>
            <ThemedText type="smallBold" style={styles.cardTitle}>
              Ingresos y gastos por mes
            </ThemedText>
            <MonthlyBarChart data={summary?.byMonth ?? []} />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
};

export default DashboardScreen;
