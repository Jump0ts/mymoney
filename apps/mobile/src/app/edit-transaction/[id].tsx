import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { TransactionForm } from '@/features/transactions/TransactionForm';
import type { AddTransactionFormValues } from '@/features/transactions/transactions.schema';
import type { Transaction } from '@/features/transactions/transactions.types';
import { useUpdateTransaction } from '@/features/transactions/useTransactions';
import { ApiError } from '@/lib/api';

const EditTransactionScreen = () => {
  const { id, transaction: transactionParam } = useLocalSearchParams<{ id: string; transaction: string }>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const updateTransaction = useUpdateTransaction();

  const transaction: Transaction | null = transactionParam ? JSON.parse(transactionParam) : null;
  if (!id || !transaction) return null;

  const defaultValues: AddTransactionFormValues = {
    type: transaction.type,
    categoryId: transaction.category.id,
    amount: Number(transaction.amount),
    description: transaction.description ?? '',
    occurredAt: new Date(transaction.occurredAt),
  };

  const handleSubmit = (values: AddTransactionFormValues) => {
    setSubmitError(null);
    updateTransaction.mutate(
      {
        id,
        categoryId: values.categoryId,
        type: values.type,
        amount: values.amount,
        description: values.description || undefined,
        occurredAt: values.occurredAt.toISOString(),
      },
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
    />
  );
};

export default EditTransactionScreen;
