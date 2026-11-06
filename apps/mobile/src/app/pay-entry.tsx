import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { PayEntryForm } from '@/features/budgets/PayEntryForm';
import type { PayEntryFormValues } from '@/features/budgets/budgets.schema';
import { toPaymentInput, type PayEntryParams } from '@/features/budgets/budgets.utils';
import { useCreateTransaction } from '@/features/transactions/useTransactions';
import { ApiError } from '@/lib/api';

// Hoja de "marcar como pagada" de Presupuesto: crea el gasto real de la linea (ya enlazado) con su categoria. En un
// sobre apunta un gasto mas, sin proponer importe. En un reembolso crea el ingreso que te devuelven.
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
  const isRefund = Boolean(params.refund);

  return (
    <>
      {/* En un sobre no se "marca como pagada" nada: se apunta un gasto mas. */}
      {isEnvelope && <Stack.Screen options={{ title: 'Añadir gasto' }} />}
      {isRefund && <Stack.Screen options={{ title: 'Marcar como cobrada' }} />}
      <PayEntryForm
        entryName={params.name}
        plannedAmount={params.amount}
        spentAmount={isEnvelope ? (params.spent ?? '0') : undefined}
        refund={isRefund}
        defaultCategoryId={params.categoryId}
        isSubmitting={createTransaction.isPending}
        submitError={submitError}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default PayEntryScreen;
