import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { compareYearMonth, getCurrentYearMonth, type YearMonth } from '@/utils/date';
import { formatMonthYearLabel } from '@/utils/format';
import { styles } from './MonthYearPicker.styles';

interface MonthYearPickerProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

export const MonthYearPicker = ({ year, month, onChange }: MonthYearPickerProps) => {
  const theme = useTheme();

  const goTo = (deltaMonths: number) => {
    const totalMonths = year * 12 + (month - 1) + deltaMonths;
    onChange(Math.floor(totalMonths / 12), (totalMonths % 12) + 1);
  };

  const next: YearMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const disableNext = compareYearMonth(next, getCurrentYearMonth()) > 0;

  return (
    <View style={styles.container}>
      <AnimatedPressable
        accessibilityRole="button"
        testID="month-picker-prev"
        onPress={() => goTo(-1)}
        style={[styles.arrow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Feather name="chevron-left" size={18} color={theme.text} />
      </AnimatedPressable>
      <ThemedText type="smallBold" style={styles.label}>
        {formatMonthYearLabel(year, month)}
      </ThemedText>
      <AnimatedPressable
        accessibilityRole="button"
        testID="month-picker-next"
        disabled={disableNext}
        onPress={() => goTo(1)}
        style={[
          styles.arrow,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: disableNext ? 0.4 : 1 },
        ]}>
        <Feather name="chevron-right" size={18} color={theme.text} />
      </AnimatedPressable>
    </View>
  );
};
