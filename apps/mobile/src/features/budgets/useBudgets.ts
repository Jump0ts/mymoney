import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import type { YearMonth } from '@/utils/date';
import type {
  BudgetEntry,
  BudgetGroupPayload,
  BudgetLinePayload,
  BudgetMonthResponse,
  BudgetScope,
} from './budgets.types';
import { moveId, setEntryOrder, setEntryPaid, setGroupOrder } from './budgets.utils';

export const budgetMonthKey = ({ year, month }: YearMonth) => ['budgets', 'month', year, month] as const;

export const useBudgetMonth = (target: YearMonth) =>
  useQuery({
    queryKey: budgetMonthKey(target),
    queryFn: () => apiRequest<BudgetMonthResponse>(`/api/budgets/months/${target.year}/${target.month}`),
  });

// El check se refleja al instante (los totales se recalculan en cliente) y se
// deshace si el servidor lo rechaza.
export const useToggleEntryPaid = (target: YearMonth) => {
  const queryClient = useQueryClient();
  const key = budgetMonthKey(target);

  return useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) =>
      apiRequest<{ entry: BudgetEntry }>(`/api/budgets/entries/${id}`, { method: 'PATCH', body: { paid } }),
    onMutate: async ({ id, paid }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BudgetMonthResponse>(key);
      if (previous) queryClient.setQueryData<BudgetMonthResponse>(key, setEntryPaid(previous, id, paid));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
};

export const useUpdateMonthIncome = (target: YearMonth) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (income: number) =>
      apiRequest<BudgetMonthResponse>(`/api/budgets/months/${target.year}/${target.month}`, {
        method: 'PATCH',
        body: { income },
      }),
    onSuccess: (data) => queryClient.setQueryData(budgetMonthKey(target), data),
  });
};

// ---- Editar la estructura del presupuesto (grupos y lineas) ----

const useRefreshBudgets = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['budgets'] });
};

export const useCreateGroup = () => {
  const refresh = useRefreshBudgets();
  return useMutation({
    mutationFn: (input: BudgetGroupPayload) =>
      apiRequest('/api/budgets/groups', { method: 'POST', body: input }),
    onSuccess: refresh,
  });
};

export const useUpdateGroup = () => {
  const refresh = useRefreshBudgets();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & BudgetGroupPayload) =>
      apiRequest(`/api/budgets/groups/${id}`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });
};

export const useDeleteGroup = () => {
  const refresh = useRefreshBudgets();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/api/budgets/groups/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
};

export const useCreateEntry = (target: YearMonth) => {
  const refresh = useRefreshBudgets();
  return useMutation({
    mutationFn: ({ groupId, line, scope }: { groupId: string; line: BudgetLinePayload; scope: BudgetScope }) =>
      apiRequest(`/api/budgets/months/${target.year}/${target.month}/entries`, {
        method: 'POST',
        body: { groupId, ...line, recurring: scope === 'template' },
      }),
    onSuccess: refresh,
  });
};

// Si lo que se quiere cambiar o quitar ya no existe (404), para quien lo pide es un exito:
// asi un reintento tras un fallo a medias de las dos peticiones puede terminar el trabajo.
const ignoreNotFound = async (request: Promise<unknown>) => {
  try {
    await request;
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
};

// Con scope "template" el cambio tambien llega a la plantilla (y por tanto a los meses
// que se generen despues); los meses ya generados no se tocan. Son dos peticiones: el
// refresco va en onSettled para que la pantalla refleje lo que si se llego a guardar.
export const useUpdateEntry = () => {
  const refresh = useRefreshBudgets();
  return useMutation({
    mutationFn: async ({ entry, line, scope }: { entry: BudgetEntry; line: BudgetLinePayload; scope: BudgetScope }) => {
      const body = { name: line.name, amount: line.amount };
      await apiRequest(`/api/budgets/entries/${entry.id}`, { method: 'PATCH', body });
      if (scope === 'template' && entry.itemId) {
        await ignoreNotFound(apiRequest(`/api/budgets/items/${entry.itemId}`, { method: 'PATCH', body }));
      }
    },
    onSettled: refresh,
  });
};

// Primero la plantilla y despues la linea del mes: si falla a medias, la linea sigue ahi
// y se puede volver a borrar (el item ya inexistente cuenta como hecho).
export const useDeleteEntry = () => {
  const refresh = useRefreshBudgets();
  return useMutation({
    mutationFn: async ({ entry, scope }: { entry: BudgetEntry; scope: BudgetScope }) => {
      if (scope === 'template' && entry.itemId) {
        await ignoreNotFound(apiRequest(`/api/budgets/items/${entry.itemId}`, { method: 'DELETE' }));
      }
      await ignoreNotFound(apiRequest(`/api/budgets/entries/${entry.id}`, { method: 'DELETE' }));
    },
    onSettled: refresh,
  });
};

// ---- Ordenar grupos y lineas ----

interface ReorderVariables {
  url: string;
  ids: string[];
  // Estado anterior de la cache, para deshacer el cambio optimista si el servidor lo rechaza.
  previous: BudgetMonthResponse;
}

// Sube o baja un grupo, o una linea de un grupo, una posicion. El orden se refleja al instante en la
// cache (partiendo siempre de lo ultimo que se ve, asi varios toques seguidos se suman) y se deshace
// si el servidor falla. El servidor guarda el orden completo y deja la plantilla igual que el mes.
export const useMoveInBudget = (target: YearMonth) => {
  const queryClient = useQueryClient();
  const key = budgetMonthKey(target);
  const { mutate } = useMutation({
    mutationFn: ({ url, ids }: ReorderVariables) => apiRequest(url, { method: 'PUT', body: { ids } }),
    onError: (_error, { previous }) => queryClient.setQueryData(key, previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
  });

  const moveGroup = useCallback(
    (groupId: string, delta: -1 | 1, onError?: () => void) => {
      const previous = queryClient.getQueryData<BudgetMonthResponse>(key);
      if (!previous) return;
      const ids = moveId(
        previous.groups.map((group) => group.id),
        groupId,
        delta,
      );
      queryClient.setQueryData(key, setGroupOrder(previous, ids));
      mutate({ url: '/api/budgets/groups/order', ids, previous }, { onError });
    },
    [key, mutate, queryClient],
  );

  const moveEntry = useCallback(
    (groupId: string, entryId: string, delta: -1 | 1, onError?: () => void) => {
      const previous = queryClient.getQueryData<BudgetMonthResponse>(key);
      const group = previous?.groups.find((candidate) => candidate.id === groupId);
      if (!previous || !group) return;
      const ids = moveId(
        group.entries.map((entry) => entry.id),
        entryId,
        delta,
      );
      queryClient.setQueryData(key, setEntryOrder(previous, groupId, ids));
      mutate(
        { url: `/api/budgets/months/${target.year}/${target.month}/groups/${groupId}/entries/order`, ids, previous },
        { onError },
      );
    },
    [key, mutate, queryClient, target.month, target.year],
  );

  return { moveGroup, moveEntry };
};
