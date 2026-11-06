import { Stack, useLocalSearchParams } from 'expo-router';

import { PayEntryForm } from '@/features/budgets/PayEntryForm';
import type { PayEntryParams } from '@/features/budgets/budgets.utils';
import { usePayEntry } from '@/features/budgets/usePayEntry';

// Hoja de "marcar como pagada" de Presupuesto: crea el gasto real de la linea (ya enlazado) con su categoria. En un
// sobre apunta un gasto mas, sin proponer importe. En un reembolso crea lo que te devuelven (un gasto de importe
// negativo). Al confirmar vibra una vez y se cierra (ver usePayEntry).
const PayEntryScreen = () => {
  const params = useLocalSearchParams<Record<keyof PayEntryParams, string>>();
  const { handleSubmit, isSubmitting, submitError } = usePayEntry(params);

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
        isSubmitting={isSubmitting}
        submitError={submitError}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default PayEntryScreen;
