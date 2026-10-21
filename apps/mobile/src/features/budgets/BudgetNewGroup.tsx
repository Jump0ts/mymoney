import { Feather } from '@expo/vector-icons';
import { useState } from 'react';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { toGroupPayload } from './budgets.utils';
import { BudgetGroupForm } from './BudgetGroupForm';
import { useCreateGroup } from './useBudgets';
import { styles } from './BudgetNewGroup.styles';

export const BudgetNewGroup = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const { mutateAsync: createGroup } = useCreateGroup();

  if (open) {
    return (
      <Card>
        <BudgetGroupForm
          submitLabel="Crear grupo"
          onSubmit={async (values) => {
            await createGroup(toGroupPayload(values));
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      </Card>
    );
  }

  return (
    <AnimatedPressable
      testID="budget-new-group"
      accessibilityRole="button"
      accessibilityLabel="Añadir grupo"
      onPress={() => setOpen(true)}
      style={[styles.button, { borderColor: theme.border }]}>
      <Feather name="plus" size={18} color={theme.primary} />
      <ThemedText type="smallBold" themeColor="primary">
        Añadir grupo
      </ThemedText>
    </AnimatedPressable>
  );
};
