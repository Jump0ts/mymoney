import { useCallback } from 'react';
import type { YearMonth } from '@/utils/date';
import type { BudgetEntry, BudgetMonthResponse } from './budgets.types';
import { useOpenMonth } from './useBudgets';

// Un mes futuro sin guardar se ve como quedaria, pero sus lineas llevan un id provisional. Antes de editarlo
// o de marcar una linea hay que guardarlo; este hook lo hace y devuelve lo necesario para seguir.
export const usePreviewMonth = (target: YearMonth, data: BudgetMonthResponse | undefined) => {
  const { mutateAsync: openMonth } = useOpenMonth(target);
  const isPreview = data?.preview === true;

  // Guarda el mes si solo era una vista previa; si ya estaba guardado no hace nada. Falla si el servidor falla.
  const ensureSaved = useCallback(async () => {
    if (isPreview) await openMonth();
  }, [isPreview, openMonth]);

  // Id real de una linea: el suyo si el mes ya estaba guardado; si no, se guarda el mes y se busca la linea
  // equivalente por su plantilla (null si no aparece, p. ej. porque se quito de la plantilla entretanto).
  const resolveEntryId = useCallback(
    async (entry: BudgetEntry): Promise<string | null> => {
      if (!isPreview) return entry.id;
      const saved = await openMonth();
      const same = saved.groups.flatMap((group) => group.entries).find((item) => item.itemId === entry.itemId);
      return same?.id ?? null;
    },
    [isPreview, openMonth],
  );

  return { isPreview, ensureSaved, resolveEntryId };
};
