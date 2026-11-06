import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';

import { AnimatedPressable } from './AnimatedPressable';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { addMonths, compareYearMonth, getCurrentYearMonth, type YearMonth } from '@/utils/date';
import { formatMonthYearLabel } from '@/utils/format';
import { styles } from './MonthYearPicker.styles';

interface MonthYearPickerProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  // Cuantos meses por delante del actual se puede avanzar (0 = hasta el mes actual).
  maxMonthsAhead?: number;
}

const LABEL_DURATION = 200;
const LABEL_LINE_HEIGHT = 20;
// Tope de escalado de la etiqueta: el contenedor tiene minWidth 170 entre dos
// flechas de 44px, y a 2x el texto ya no cabe en una pantalla de movil.
const LABEL_MAX_FONT_SCALE = 1.3;

export const MonthYearPicker = ({ year, month, onChange, maxMonthsAhead = 0 }: MonthYearPickerProps) => {
  const theme = useTheme();
  // La etiqueta va en posicion absoluta, asi que el contenedor necesita una
  // altura explicita; si fuera fija (20) se quedaria corta con texto grande.
  const { fontScale } = useWindowDimensions();
  const labelHeight = Math.ceil(LABEL_LINE_HEIGHT * Math.min(fontScale, LABEL_MAX_FONT_SCALE));

  // El mes puede cambiar por las flechas o pulsando una barra del grafico (Resumen),
  // asi que la direccion se deduce comparando con el ultimo valor visto, no con un
  // simple flag de "se pulso prev/next".
  // Se guarda en estado (no en una ref, que no se puede leer al pintar): al cambiar el mes se compara con el anterior en
  // el propio render y la direccion se queda hasta el siguiente cambio.
  const [seen, setSeen] = useState<YearMonth>({ year, month });
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  if (seen.year !== year || seen.month !== month) {
    setDirection(compareYearMonth({ year, month }, seen) < 0 ? 'backward' : 'forward');
    setSeen({ year, month });
  }

  const goTo = (deltaMonths: number) => {
    const target = addMonths({ year, month }, deltaMonths);
    onChange(target.year, target.month);
  };

  const next = addMonths({ year, month }, 1);
  const disableNext = compareYearMonth(next, addMonths(getCurrentYearMonth(), maxMonthsAhead)) > 0;

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
      <View testID="month-year-label-wrap" style={[styles.labelWrap, { height: labelHeight }]}>
        <Animated.View
          key={`${year}-${month}`}
          testID="month-year-label"
          entering={(direction === 'forward' ? FadeInRight : FadeInLeft).duration(LABEL_DURATION)}
          exiting={(direction === 'forward' ? FadeOutLeft : FadeOutRight).duration(LABEL_DURATION)}
          style={styles.labelAnimated}>
          <ThemedText type="smallBold" maxFontSizeMultiplier={LABEL_MAX_FONT_SCALE} style={styles.label}>
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
