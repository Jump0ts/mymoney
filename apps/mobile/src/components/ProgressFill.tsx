import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Duration, EASE_OUT_CSS } from '@/constants/motion';
import { Radius } from '@/constants/theme';

interface ProgressFillProps {
  // Proporcion rellena, de 0 a 1.
  ratio: number;
  color: string;
  testID?: string;
}

// Relleno de una barra de progreso (el limite de un grupo, un sobre). Va dentro de una pista con `overflow: hidden` y
// es absoluto y sin hijos: animar su ancho no recoloca nada mas, y mantiene el radio de las esquinas, que un
// `scaleX` deformaria. Al cambiar lo gastado la barra crece o encoge hasta su nuevo valor en vez de saltar; la
// transicion no se dispara al montarse (aparece ya en su sitio).
export const ProgressFill = ({ ratio, color, testID }: ProgressFillProps) => {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      testID={testID}
      style={[fillStyle, { width: `${ratio * 100}%`, backgroundColor: color }, reduceMotion && noTransitionDuration]}
    />
  );
};

const fillStyle = {
  position: 'absolute' as const,
  top: 0,
  bottom: 0,
  left: 0,
  borderRadius: Radius.pill,
  transitionProperty: 'width' as const,
  transitionDuration: Duration.slide,
  transitionTimingFunction: EASE_OUT_CSS,
};

const noTransitionDuration = { transitionDuration: 0 };
