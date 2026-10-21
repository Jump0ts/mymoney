import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { styles } from './BudgetMoveButtons.styles';

interface BudgetMoveButtonsProps {
  // Nombre de lo que se mueve (grupo o linea), para el lector de pantalla.
  label: string;
  testIDPrefix: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: -1 | 1) => void;
  color: string;
}

// Subir/bajar en la lista: flechas en vez de arrastrar, que funcionan igual con teclado y lector de pantalla.
export const BudgetMoveButtons = ({
  label,
  testIDPrefix,
  canMoveUp,
  canMoveDown,
  onMove,
  color,
}: BudgetMoveButtonsProps) => (
  <View style={styles.container}>
    <AnimatedPressable
      testID={`${testIDPrefix}-up`}
      accessibilityRole="button"
      accessibilityLabel={`Subir ${label}`}
      accessibilityState={{ disabled: !canMoveUp }}
      disabled={!canMoveUp}
      onPress={() => onMove(-1)}
      style={[styles.button, !canMoveUp && styles.disabled]}>
      <Feather name="chevron-up" size={20} color={color} />
    </AnimatedPressable>
    <AnimatedPressable
      testID={`${testIDPrefix}-down`}
      accessibilityRole="button"
      accessibilityLabel={`Bajar ${label}`}
      accessibilityState={{ disabled: !canMoveDown }}
      disabled={!canMoveDown}
      onPress={() => onMove(1)}
      style={[styles.button, !canMoveDown && styles.disabled]}>
      <Feather name="chevron-down" size={20} color={color} />
    </AnimatedPressable>
  </View>
);
