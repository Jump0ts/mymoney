import type { YearMonth } from '@/utils/date';
import { SCOPE_OPTIONS_CREATE } from './budgets.constants';
import type { BudgetGroup } from './budgets.types';
import { toLinePayload } from './budgets.utils';
import { BudgetLineForm } from './BudgetLineForm';
import { useCreateEntry } from './useBudgets';

interface BudgetNewLineProps {
  group: BudgetGroup;
  target: YearMonth;
  onDone: () => void;
}

export const BudgetNewLine = ({ group, target, onDone }: BudgetNewLineProps) => {
  const { mutateAsync: createEntry } = useCreateEntry(target);

  return (
    <BudgetLineForm
      // Por defecto "Todos los meses": lo normal al montar el presupuesto es definir lineas recurrentes.
      // En el grupo del sobrante (caprichos, imprevistos) lo normal es un gasto puntual.
      defaultValues={{ name: '', lineType: 'FIXED', amount: '', scope: group.isRemainder ? 'month' : 'template' }}
      scopeOptions={SCOPE_OPTIONS_CREATE}
      submitLabel="Añadir línea"
      onSubmit={async (values) => {
        await createEntry({ groupId: group.id, line: toLinePayload(values), scope: values.scope });
        onDone();
      }}
      onCancel={onDone}
    />
  );
};
