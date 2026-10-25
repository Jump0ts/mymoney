import { View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey } from '@/utils/date';
import { styles } from './CalendarGrid.styles';

interface CalendarGridProps {
  year: number;
  month: number;
  selectedDate?: string;
  onSelectDate: (dateKey: string) => void;
  maxDate?: Date;
}

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export const CalendarGrid = ({ year, month, selectedDate, onSelectDate, maxDate }: CalendarGridProps) => {
  const theme = useTheme();

  const daysInMonth = new Date(year, month, 0).getDate();
  // Date.getDay(): 0 = domingo .. 6 = sabado. La semana en la UI empieza en lunes.
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <ThemedText key={label} type="small" themeColor="textSecondary" style={styles.weekdayLabel}>
            {label}
          </ThemedText>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) return <View key={`empty-${index}`} style={styles.cell} />;

          const date = new Date(year, month - 1, day);
          const dateKey = formatDateKey(date);
          const isSelected = dateKey === selectedDate;
          const isDisabled = Boolean(maxDate) && date > (maxDate as Date);

          return (
            <AnimatedPressable
              key={dateKey}
              testID={`calendar-day-${dateKey}`}
              accessibilityRole="button"
              accessibilityLabel={date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
              accessibilityState={{ selected: isSelected, disabled: isDisabled }}
              disabled={isDisabled}
              onPress={() => onSelectDate(dateKey)}
              style={[styles.cell, styles.dayCell, isSelected && { backgroundColor: theme.primary }, isDisabled && styles.disabledCell]}>
              <ThemedText type="small" themeColor={isSelected ? 'primaryText' : 'text'}>
                {day}
              </ThemedText>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
};
