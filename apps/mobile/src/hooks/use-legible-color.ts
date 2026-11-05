import { useCallback } from 'react';

import { useTheme } from '@/hooks/use-theme';
import { legibleColor } from '@/utils/color';

// Devuelve una funcion que ajusta, solo al pintarlo, un color de categoria o de grupo para que no se pierda sobre las
// tarjetas del tema actual (un casi blanco en modo claro, un casi negro en modo oscuro). El color guardado no cambia.
export const useLegibleColor = () => {
  const { backgroundElement } = useTheme();
  return useCallback((hex: string) => legibleColor(hex, backgroundElement), [backgroundElement]);
};
