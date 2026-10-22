import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef } from 'react';

import { confirmAsync } from '@/utils/alert';

interface EditGuard {
  setDirty: (id: string, dirty: boolean) => void;
}

const EditGuardContext = createContext<EditGuard | null>(null);

export const EditGuardProvider = EditGuardContext.Provider;

// Para quien contiene los formularios (la pantalla): sabe si alguno tiene cambios sin guardar y, antes
// de cerrar el modo edicion o cambiar de mes (que descartan los formularios abiertos), pide confirmacion.
export const useEditGuard = () => {
  const dirtyForms = useRef(new Set<string>());

  const guard = useMemo<EditGuard>(
    () => ({
      setDirty: (id, dirty) => {
        if (dirty) dirtyForms.current.add(id);
        else dirtyForms.current.delete(id);
      },
    }),
    [],
  );

  // true si se puede seguir: no hay cambios sin guardar o el usuario acepta descartarlos.
  const confirmDiscard = useCallback(async (): Promise<boolean> => {
    if (dirtyForms.current.size === 0) return true;
    return confirmAsync({
      title: 'Descartar cambios',
      message: 'Tienes cambios sin guardar en un formulario. ¿Quieres descartarlos?',
      confirmLabel: 'Descartar',
      destructive: true,
    });
  }, []);

  return { guard, confirmDiscard };
};

// Para cada formulario: avisa a la pantalla mientras tenga cambios sin guardar. Sin guarda (en tests
// o fuera de la pantalla) no hace nada.
export const useReportDirty = (isDirty: boolean) => {
  const guard = useContext(EditGuardContext);
  const id = useId();

  useEffect(() => {
    guard?.setDirty(id, isDirty);
    return () => guard?.setDirty(id, false);
  }, [guard, id, isDirty]);
};
