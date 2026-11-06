import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ProgressFill } from '@/components/ProgressFill';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/utils/format';
import type { BudgetEntry } from './budgets.types';
import { getEnvelopeStatus } from './budgets.utils';
import { ENVELOPE_ICON_SIZE, styles } from './BudgetEnvelopeRow.styles';

interface BudgetEnvelopeRowProps {
  entry: BudgetEntry;
  // Tocar el sobre apunta un gasto nuevo en el (o avisa de que el mes aun no ha empezado).
  onPress: (entry: BudgetEntry) => void;
}

// Una linea variable (supermercado, gasolina): en vez de un check, lo gastado hasta ahora, lo previsto y cuanto queda.
// El nombre va solo en su fila con lo gastado (el importe corto), para que no se parta a mitad de palabra.
export const BudgetEnvelopeRow = ({ entry, onPress }: BudgetEnvelopeRowProps) => {
  const theme = useTheme();
  const { planned, spent, remaining, ratio, isOver } = getEnvelopeStatus(entry);
  const statusText = isOver ? `Te pasas ${formatMoney(Math.abs(remaining))}` : `Quedan ${formatMoney(remaining)}`;

  return (
    <AnimatedPressable
      testID={`budget-entry-${entry.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, gastado ${formatMoney(spent)} de ${formatMoney(planned)}. ${statusText}`}
      accessibilityHint="Para apuntar un gasto en esta línea"
      onPress={() => onPress(entry)}
      style={styles.row}>
      <View style={styles.top}>
        <Feather name="plus-circle" size={ENVELOPE_ICON_SIZE} color={theme.primary} />
        <ThemedText style={styles.name}>{entry.name}</ThemedText>
        <ThemedText type="smallBold" style={styles.amount}>
          {formatMoney(spent)}
        </ThemedText>
      </View>
      <View testID={`budget-envelope-bar-${entry.id}`} style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <ProgressFill
          testID={`budget-envelope-fill-${entry.id}`}
          ratio={ratio}
          color={isOver ? theme.expense : theme.primary}
        />
      </View>
      <View style={styles.bottom}>
        <ThemedText type="small" themeColor={isOver ? 'expense' : 'textSecondary'} style={styles.status}>
          {statusText}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          de {formatMoney(planned)}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
};
