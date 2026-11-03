import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

// Vuelve a pedir los datos cada vez que la pestana recupera el foco. Las pestañas siguen montadas al cambiar
// de una a otra, asi que sin esto una lista podia quedarse con datos de hasta 30 s (staleTime) aunque otro
// cliente (el movil, otra ventana) hubiera creado o borrado movimientos entre medias.
// La primera vez no hace nada: la propia consulta ya se lanza al montar.
export const useRefetchOnFocus = (refetch: () => unknown) => {
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refetch();
    }, [refetch]),
  );
};
