import type { Category } from '@/features/categories/categories.types';
import type { YearMonth } from '@/utils/date';
import { LINE_TYPE_OPTIONS_ALL, SCOPE_OPTIONS_CREATE } from './budgets.constants';
import type { BudgetGroup } from './budgets.types';
import { toLinePayload } from './budgets.utils';
import { BudgetLineForm } from './BudgetLineForm';
import { useCreateEntry } from './useBudgets';

interface BudgetNewLineProps {
  group: BudgetGroup;
  categories: Category[];
  target: YearMonth;
  onDone: () => void;
}

export const BudgetNewLine = ({ group, categories, target, onDone }: BudgetNewLineProps) => {
  const { mutateAsync: createEntry } = useCreateEntry(target);

  return (
    <BudgetLineForm
      // Por defecto "Todos los meses": lo normal al montar el presupuesto es definir lineas recurrentes.
      defaultValues={{ name: '', lineType: 'FIXED', amount: '', categoryId: undefined, scope: 'template' }}
      categories={categories}
      typeOptions={LINE_TYPE_OPTIONS_ALL}
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
