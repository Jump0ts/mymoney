import { useState } from 'react';

// Deshace un estado cuando cambia `key`, durante el propio render: es lo que recomienda React en lugar de un efecto que
// llame a setState (el efecto deja un render intermedio con el estado viejo y el valor nuevo, y en una lista pagina
// llega a pedir la pagina 3 de un filtro nuevo antes de volver a la 1). `reset` debe llamar a los setState del propio
// componente. La primera vez no se llama: solo cuando `key` cambia despues.
export const useResetWhenChanged = (key: string, reset: () => void) => {
  const [seen, setSeen] = useState(key);
  if (seen !== key) {
    setSeen(key);
    reset();
  }
};
