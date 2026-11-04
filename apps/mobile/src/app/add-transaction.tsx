import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { TransactionForm } from '@/features/transactions/TransactionForm';
import type { AddTransactionFormValues } from '@/features/transactions/transactions.schema';
import { toCreateInput, toNewExpenseDefaults } from '@/features/transactions/transactions.utils';
import { useCreateTransaction } from '@/features/transactions/useTransactions';
import { ApiError } from '@/lib/api';

// Desde Presupuesto se llega con el grupo ya elegido (groupId) y, si el mes no es el actual, con un dia de ese mes (date).
const AddTransactionScreen = () => {
  const { groupId, date } = useLocalSearchParams<{ groupId?: string; date?: string }>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createTransaction = useCreateTransaction();

  const handleSubmit = (values: AddTransactionFormValues) => {
    setSubmitError(null);
    createTransaction.mutate(toCreateInput(values), {
      onSuccess: () => router.back(),
      onError: (err) => setSubmitError(err instanceof ApiError ? err.message : 'Error inesperado'),
    });
  };

  return (
    <TransactionForm
      defaultValues={toNewExpenseDefaults(groupId, date)}
      submitLabel="Guardar"
      isSubmitting={createTransaction.isPending}
      submitError={submitError}
      onSubmit={handleSubmit}
    />
  );
};

export default AddTransactionScreen;
