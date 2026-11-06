import { router } from 'expo-router';
import { useState } from 'react';

import { useCreateTransaction } from '@/features/transactions/useTransactions';
import { ApiError } from '@/lib/api';
import { confirmHaptic } from '@/lib/haptics';
import type { PayEntryFormValues } from './budgets.schema';
import { toPaymentInput, type PayEntryParams } from './budgets.utils';

// Confirmar la hoja de pago: crea el movimiento enlazado a la linea (un gasto, un reembolso o, en un sobre, un gasto
// mas). Cuando el servidor lo acepta vibra una vez y cierra la hoja; si lo rechaza, deja la hoja abierta con el
// mensaje del servidor y sin vibrar.
export const usePayEntry = (params: Pick<PayEntryParams, 'entryId' | 'name' | 'date' | 'refund'>) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createTransaction = useCreateTransaction();

  const handleSubmit = (values: PayEntryFormValues) => {
    setSubmitError(null);
    createTransaction.mutate(toPaymentInput(params, values), {
      onSuccess: () => {
        confirmHaptic();
        router.back();
      },
      onError: (err) => setSubmitError(err instanceof ApiError ? err.message : 'Error inesperado'),
    });
  };

  return { handleSubmit, isSubmitting: createTransaction.isPending, submitError };
};
