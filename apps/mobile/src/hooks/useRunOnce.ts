import { useEffect, useRef } from 'react';

// Ejecuta `run` una sola vez al montar el componente, aunque React repita los efectos (modo estricto en desarrollo).
// Sirve para arrancar algo que no debe lanzarse dos veces, como leer la sesion guardada.
export const useRunOnce = (run: () => void) => {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);
};
