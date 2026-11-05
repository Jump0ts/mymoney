import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { TransactionForm } from '@/features/transactions/TransactionForm';
import type { AddTransactionFormValues } from '@/features/transactions/transactions.schema';
import { toUpdateInput } from '@/features/transactions/transactions.utils';
import { useCachedTransaction, useUpdateTransaction } from '@/features/transactions/useTransactions';
import { ApiError } from '@/lib/api';
import { notify } from '@/utils/alert';

// Solo el id llega por la URL (ver transactions.tsx); el movimiento en si se
// busca en la cache de React Query que dejo la lista de Movimientos, sin
// necesidad de un endpoint de detalle ni de volver a meterlo en la URL.
const EditTransactionScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const updateTransaction = useUpdateTransaction();
  const transaction = useCachedTransaction(id);

  useEffect(() => {
    if (!id || !transaction) {
      notify('No se pudo abrir el movimiento', 'Vuelve a intentarlo desde la lista de Movimientos.');
      // Si se entra por enlace directo (sin pantalla anterior en la pila),
      // router.back() falla con "GO_BACK was not handled" y deja la pantalla
      // en blanco; en ese caso se manda a la lista en vez de intentar volver.
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/transactions');
      }
    }
  }, [id, transaction]);

  if (!id || !transaction) return null;

  const defaultValues: AddTransactionFormValues = {
    type: transaction.type,
    categoryId: transaction.category.id,
    // Un reembolso es un gasto de importe negativo: el formulario lo muestra en positivo y con el tipo "Reembolso".
    amount: Math.abs(Number(transaction.amount)),
    refund: transaction.type === 'EXPENSE' && Number(transaction.amount) < 0,
    description: transaction.description ?? '',
    occurredAt: new Date(transaction.occurredAt),
    budgetEntryId: transaction.budgetEntry?.id ?? null,
    budgetGroupId: null,
  };

  const handleSubmit = (values: AddTransactionFormValues) => {
    setSubmitError(null);
    updateTransaction.mutate(
      { id, ...toUpdateInput(values) },
      {
        onSuccess: () => router.back(),
        onError: (err) => setSubmitError(err instanceof ApiError ? err.message : 'Error inesperado'),
      },
    );
  };

  return (
    <TransactionForm
      defaultValues={defaultValues}
      submitLabel="Guardar cambios"
      isSubmitting={updateTransaction.isPending}
      submitError={submitError}
      onSubmit={handleSubmit}
      ownTransactionId={id}
      ownBudgetLineId={transaction.budgetEntry?.fromTransaction ? transaction.budgetEntry.id : undefined}
      linkedBudgetLabel={
        transaction.budgetEntry ? `${transaction.budgetEntry.name} · ${transaction.budgetEntry.group.name}` : undefined
      }
    />
  );
};

export default EditTransactionScreen;
