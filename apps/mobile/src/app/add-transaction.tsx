import { router } from 'expo-router';
import { useState } from 'react';

import { TransactionForm } from '@/features/transactions/TransactionForm';
import type { AddTransactionFormValues } from '@/features/transactions/transactions.schema';
import { toCreateInput } from '@/features/transactions/transactions.utils';
import { useCreateTransaction } from '@/features/transactions/useTransactions';
import { ApiError } from '@/lib/api';

const AddTransactionScreen = () => {
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
      submitLabel="Guardar"
      isSubmitting={createTransaction.isPending}
      submitError={submitError}
      onSubmit={handleSubmit}
    />
  );
};

export default AddTransactionScreen;
