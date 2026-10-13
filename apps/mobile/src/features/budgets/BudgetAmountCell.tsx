import type { ThemeColor } from '@/constants/theme';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { formatMoney } from '@/utils/format';
import { styles } from './BudgetAmountCell.styles';

interface BudgetAmountCellProps {
  label: string;
  value: number;
  themeColor?: ThemeColor;
}

export const BudgetAmountCell = ({ label, value, themeColor = 'text' }: BudgetAmountCellProps) => (
  <View style={styles.cell} accessible accessibilityLabel={`${label}: ${formatMoney(value)}`}>
    <ThemedText type="small" themeColor="textSecondary">
      {label}
    </ThemedText>
    <ThemedText type="smallBold" themeColor={themeColor}>
      {formatMoney(value)}
    </ThemedText>
  </View>
);
