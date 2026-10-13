import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';

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

const LABEL_DURATION = 200;

export const MonthYearPicker = ({ year, month, onChange }: MonthYearPickerProps) => {
  const theme = useTheme();

  // El mes puede cambiar por las flechas o pulsando una barra del grafico (Resumen),
  // asi que la direccion se deduce comparando con el ultimo valor visto, no con un
  // simple flag de "se pulso prev/next".
  const previous = useRef<YearMonth>({ year, month });
  const direction = compareYearMonth({ year, month }, previous.current) < 0 ? 'backward' : 'forward';

  useEffect(() => {
    previous.current = { year, month };
  }, [year, month]);

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
        accessibilityLabel="Mes anterior"
        testID="month-picker-prev"
        onPress={() => goTo(-1)}
        style={[styles.arrow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Feather name="chevron-left" size={18} color={theme.text} />
      </AnimatedPressable>
      <View style={styles.labelWrap}>
        <Animated.View
          key={`${year}-${month}`}
          testID="month-year-label"
          entering={(direction === 'forward' ? FadeInRight : FadeInLeft).duration(LABEL_DURATION)}
          exiting={(direction === 'forward' ? FadeOutLeft : FadeOutRight).duration(LABEL_DURATION)}
          style={styles.labelAnimated}>
          <ThemedText type="smallBold" style={styles.label}>
            {formatMonthYearLabel(year, month)}
          </ThemedText>
        </Animated.View>
      </View>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Mes siguiente"
        accessibilityState={{ disabled: disableNext }}
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
