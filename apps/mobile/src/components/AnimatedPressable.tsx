import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

// Animamos el propio Pressable (no un View interno envolviendolo) para que
// estilos relativos al contenedor (flex: 1, anchos en %, como los usan los
// segmentos de tipo Gasto/Ingreso o la rejilla del calendario) se sigan
// resolviendo contra el mismo padre que antes. Envolver en una capa extra
// sin estilo rompe ese calculo porque el % pasaria a ser relativo a esa
// capa, no a la fila/rejilla original.
const AnimatedPressableHost = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Feedback al pulsar para toda la app: encoge un 3% en 120ms. Es el techo
// recomendado para algo que se toca decenas de veces por sesion (ver
// skill animate-expo) — transicion CSS de Reanimated, sin shared values,
// porque no hay ningun gesto continuo detras, solo un estado pulsado/no.
export const AnimatedPressable = ({
  style,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: AnimatedPressableProps) => {
  const [pressed, setPressed] = useState(false);
  // La transicion CSS de Reanimated no respeta Reducir movimiento por si sola
  // (a diferencia de withTiming/entering/exiting, que si lo hacen por defecto);
  // aqui se desactiva a mano poniendo la duracion a 0.
  const reduceMotion = useReducedMotion();

  return (
    <AnimatedPressableHost
      hitSlop={8}
      pressRetentionOffset={12}
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={[style, transitionStyle, reduceMotion && noTransitionDuration, pressed && !disabled && pressedStyle]}
    />
  );
};

const transitionStyle = {
  transform: [{ scale: 1 }],
  transitionProperty: 'transform' as const,
  transitionDuration: 120,
  transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' as const,
};

const noTransitionDuration = { transitionDuration: 0 };

const pressedStyle = {
  transform: [{ scale: 0.97 }],
};
