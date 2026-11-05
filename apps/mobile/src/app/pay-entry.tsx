import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { PayEntryForm } from '@/features/budgets/PayEntryForm';
import type { PayEntryFormValues } from '@/features/budgets/budgets.schema';
import { toPaymentInput, type PayEntryParams } from '@/features/budgets/budgets.utils';
import { useCreateTransaction } from '@/features/transactions/useTransactions';
import { ApiError } from '@/lib/api';

// Hoja de "marcar como pagada" de Presupuesto: crea el gasto real de la linea (ya enlazado) con su categoria. En un
// sobre apunta un gasto mas, sin proponer importe.
const PayEntryScreen = () => {
  const params = useLocalSearchParams<Record<keyof PayEntryParams, string>>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createTransaction = useCreateTransaction();

  const handleSubmit = (values: PayEntryFormValues) => {
    setSubmitError(null);
    createTransaction.mutate(toPaymentInput(params, values), {
      onSuccess: () => router.back(),
      onError: (err) => setSubmitError(err instanceof ApiError ? err.message : 'Error inesperado'),
    });
  };

  const isEnvelope = Boolean(params.envelope);

  return (
    <>
      {/* En un sobre no se "marca como pagada" nada: se apunta un gasto mas. */}
      {isEnvelope && <Stack.Screen options={{ title: 'Añadir gasto' }} />}
      <PayEntryForm
        entryName={params.name}
        plannedAmount={params.amount}
        spentAmount={isEnvelope ? (params.spent ?? '0') : undefined}
        defaultCategoryId={params.categoryId}
        isSubmitting={createTransaction.isPending}
        submitError={submitError}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default PayEntryScreen;
