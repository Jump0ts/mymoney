import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { AnimatedPressable } from './AnimatedPressable';
import { styles } from './ColorPicker.styles';

interface ColorPickerProps {
  // La paleta fija: "Color N de M".
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
  accessibilityLabel?: string;
  // Colores propios del usuario (#RRGGBB), a continuacion de la paleta.
  savedColors?: readonly string[];
  // Si se da, aparece el boton "+" para elegir un color cualquiera.
  onCustom?: () => void;
  // El selector de color cualquiera esta abierto (para el estado "expandido" del boton).
  customOpen?: boolean;
}

const sameColor = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();

export const ColorPicker = ({
  colors,
  value,
  onChange,
  accessibilityLabel = 'Color',
  savedColors = [],
  onCustom,
  customOpen = false,
}: ColorPickerProps) => {
  const theme = useTheme();

  // El color elegido que no esta en la paleta ni en los guardados (p. ej. uno nuevo que no se pudo guardar)
  // sigue viendose como elegido, en vez de quedarse sin ninguna marca.
  const inList = (color: string) => colors.some((c) => sameColor(c, color)) || savedColors.some((c) => sameColor(c, color));
  const loose = value && !inList(value) ? value : null;

  const swatch = (color: string, label: string, testID?: string) => {
    const selected = sameColor(value, color);
    return (
      <AnimatedPressable
        key={`${testID ?? 'preset'}-${color}`}
        testID={testID}
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={() => onChange(color)}
        style={[styles.swatch, { borderWidth: selected ? 3 : 0, borderColor: theme.text }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
      </AnimatedPressable>
    );
  };

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.row}>
      {colors.map((color, index) => swatch(color, `Color ${index + 1} de ${colors.length}`))}
      {savedColors.map((color) => swatch(color, `Color guardado ${color}`, `color-saved-${color}`))}
      {loose && swatch(loose, `Color personalizado ${loose}`, 'color-loose')}
      {onCustom && (
        <AnimatedPressable
          testID="color-custom-toggle"
          accessibilityRole="button"
          accessibilityLabel="Elegir otro color"
          accessibilityState={{ expanded: customOpen }}
          onPress={onCustom}
          style={[styles.swatch, styles.add, { borderColor: theme.border, backgroundColor: customOpen ? theme.backgroundSelected : 'transparent' }]}>
          <Feather name={customOpen ? 'chevron-up' : 'plus'} size={20} color={theme.textSecondary} />
        </AnimatedPressable>
      )}
    </View>
  );
};
