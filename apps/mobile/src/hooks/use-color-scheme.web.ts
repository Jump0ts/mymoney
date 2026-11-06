import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const subscribe = () => () => {};

// En el navegador, true; al generar el HTML estatico (en Node) y mientras se hidrata, false.
const useHasHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export const useColorScheme = () => {
  const hasHydrated = useHasHydrated();
  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
};
