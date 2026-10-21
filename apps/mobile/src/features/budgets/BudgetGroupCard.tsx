import { Feather } from '@expo/vector-icons';
import { memo, useEffect, useState } from 'react';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { getReadableTextColor } from '@/utils/color';
import type { YearMonth } from '@/utils/date';
import type { BudgetEntry, BudgetGroup } from './budgets.types';
import { getGroupTotals } from './budgets.utils';
import { BudgetAmountCell } from './BudgetAmountCell';
import { BudgetEntryEditor } from './BudgetEntryEditor';
import { BudgetEntryRow } from './BudgetEntryRow';
import { BudgetGroupEditor } from './BudgetGroupEditor';
import { BudgetLimitBar } from './BudgetLimitBar';
import { BudgetNewLine } from './BudgetNewLine';
import { styles } from './BudgetGroupCard.styles';

interface BudgetGroupCardProps {
  group: BudgetGroup;
  onTogglePaid: (entry: BudgetEntry) => void;
  editMode?: boolean;
  // Solo hace falta en modo edicion (formularios de linea).
  target?: YearMonth;
}

export const BudgetGroupCard = memo(
  ({ group, onTogglePaid, editMode = false, target }: BudgetGroupCardProps) => {
    const theme = useTheme();
    const totals = getGroupTotals(group.entries);
    const headerTextColor = getReadableTextColor(group.color);
    const [editingGroup, setEditingGroup] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [addingLine, setAddingLine] = useState(false);

    // Al salir del modo edicion o cambiar de mes se cierra cualquier formulario abierto: la
    // tarjeta se conserva entre meses y el formulario acabaria guardando en el mes equivocado.
    useEffect(() => {
      setEditingGroup(false);
      setEditingEntryId(null);
      setAddingLine(false);
    }, [editMode, target?.year, target?.month]);

    const closeForms = () => {
      setEditingGroup(false);
      setEditingEntryId(null);
      setAddingLine(false);
    };

    return (
      <Card style={styles.card}>
        <View style={[styles.header, { backgroundColor: group.color }]}>
          <ThemedText
            type="smallBold"
            accessibilityRole="header"
            style={[styles.title, { color: headerTextColor }]}>
            {group.name}
          </ThemedText>
          {editMode && (
            <AnimatedPressable
              testID={`budget-group-edit-${group.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Editar grupo ${group.name}`}
              onPress={() => {
                closeForms();
                setEditingGroup(true);
              }}
              style={styles.headerButton}>
              <Feather name="edit-2" size={18} color={headerTextColor} />
            </AnimatedPressable>
          )}
        </View>

        <View style={styles.body}>
          {editingGroup ? (
            <BudgetGroupEditor group={group} onDone={closeForms} />
          ) : group.entries.length === 0 && !editMode ? (
            <ThemedText type="small" themeColor="textSecondary">
              Sin líneas este mes.
            </ThemedText>
          ) : (
            group.entries.map((entry) =>
              editingEntryId === entry.id && target ? (
                <BudgetEntryEditor key={entry.id} entry={entry} onDone={closeForms} />
              ) : (
                <BudgetEntryRow
                  key={entry.id}
                  entry={entry}
                  onTogglePaid={onTogglePaid}
                  editMode={editMode}
                  onEdit={(selected) => {
                    closeForms();
                    setEditingEntryId(selected.id);
                  }}
                />
              ),
            )
          )}

          {editMode && !editingGroup && target && (
            addingLine ? (
              <BudgetNewLine group={group} target={target} onDone={closeForms} />
            ) : (
              <AnimatedPressable
                testID={`budget-add-line-${group.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Añadir línea a ${group.name}`}
                onPress={() => {
                  closeForms();
                  setAddingLine(true);
                }}
                style={styles.addLine}>
                <Feather name="plus" size={18} color={theme.primary} />
                <ThemedText type="smallBold" themeColor="primary">
                  Añadir línea
                </ThemedText>
              </AnimatedPressable>
            )
          )}
        </View>

        {!editingGroup && <BudgetLimitBar group={group} />}

        <View style={styles.footer}>
          <ThemedText type="smallBold" style={styles.footerLabel}>
            Total
          </ThemedText>
          <BudgetAmountCell label="Previsto" value={totals.planned} />
          <BudgetAmountCell label="Pagado" value={totals.paid} />
        </View>
      </Card>
    );
  },
);
BudgetGroupCard.displayName = 'BudgetGroupCard';
