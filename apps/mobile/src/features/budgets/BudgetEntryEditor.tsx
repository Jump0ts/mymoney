import { SCOPE_OPTIONS_EDIT } from './budgets.constants';
import type { BudgetEntry } from './budgets.types';
import { formatAmountForInput, getLineType, toLinePayload } from './budgets.utils';
import { BudgetLineForm } from './BudgetLineForm';
import { useDeleteEntry, useUpdateEntry } from './useBudgets';

interface BudgetEntryEditorProps {
  entry: BudgetEntry;
  onDone: () => void;
}

export const BudgetEntryEditor = ({ entry, onDone }: BudgetEntryEditorProps) => {
  const { mutateAsync: updateEntry } = useUpdateEntry();
  const { mutateAsync: deleteEntry } = useDeleteEntry();

  return (
    <BudgetLineForm
      defaultValues={{
        name: entry.name,
        lineType: getLineType(entry),
        amount: formatAmountForInput(entry.amount),
        scope: 'month',
      }}
      scopeOptions={entry.itemId ? SCOPE_OPTIONS_EDIT : null}
      submitLabel="Guardar"
      onSubmit={async (values) => {
        await updateEntry({ entry, line: toLinePayload(values), scope: values.scope });
        onDone();
      }}
      onDelete={async (scope) => {
        await deleteEntry({ entry, scope });
        onDone();
      }}
      onCancel={onDone}
    />
  );
};
