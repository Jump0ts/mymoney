import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { AnimatedPressable } from './AnimatedPressable';
import { styles } from './ColorPicker.styles';

interface ColorPickerProps {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
  accessibilityLabel?: string;
}

export const ColorPicker = ({ colors, value, onChange, accessibilityLabel = 'Color' }: ColorPickerProps) => {
  const theme = useTheme();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.row}>
      {colors.map((color, index) => (
        <AnimatedPressable
          key={color}
          accessibilityRole="radio"
          accessibilityLabel={`Color ${index + 1} de ${colors.length}`}
          accessibilityState={{ selected: value === color }}
          onPress={() => onChange(color)}
          style={[styles.swatch, { borderWidth: value === color ? 3 : 0, borderColor: theme.text }]}>
          <View style={[styles.dot, { backgroundColor: color }]} />
        </AnimatedPressable>
      ))}
    </View>
  );
};
