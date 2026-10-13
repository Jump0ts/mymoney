import type { BudgetGroup } from './budgets.types';
import { BudgetGroupForm } from './BudgetGroupForm';
import { useDeleteGroup, useUpdateGroup } from './useBudgets';

interface BudgetGroupEditorProps {
  group: BudgetGroup;
  onDone: () => void;
}

export const BudgetGroupEditor = ({ group, onDone }: BudgetGroupEditorProps) => {
  const { mutateAsync: updateGroup } = useUpdateGroup();
  const { mutateAsync: deleteGroup } = useDeleteGroup();

  return (
    <BudgetGroupForm
      defaultValues={{ name: group.name, color: group.color }}
      submitLabel="Guardar"
      onSubmit={async (values) => {
        await updateGroup({ id: group.id, ...values });
        onDone();
      }}
      onDelete={async () => {
        await deleteGroup(group.id);
        onDone();
      }}
      onCancel={onDone}
    />
  );
};
