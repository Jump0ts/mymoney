import { useCallback, useEffect, useRef } from 'react';

// Una funcion de identidad fija que siempre llama a la ultima version de `callback`. Hace falta cuando una funcion se
// entrega a algo que la guarda y no se vuelve a crear (un gesto, un listener) pero tiene que ver los valores mas recientes
// del componente. La referencia se lee solo al llamarla, nunca durante el render.
export const useStableCallback = <Args extends unknown[], Result>(callback: (...args: Args) => Result) => {
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  return useCallback((...args: Args) => latest.current(...args), []);
};
