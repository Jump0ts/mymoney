import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { notify } from '@/utils/alert';
import { formatMoney } from '@/utils/format';
import type { BudgetEntry } from './budgets.types';
import { getEntryActual, isEntryLinked } from './budgets.utils';
import { BudgetMoveButtons } from './BudgetMoveButtons';
import { styles } from './BudgetEntryRow.styles';

const LINKED_TITLE = 'Línea enlazada a un gasto';
const LINKED_MESSAGE = 'Está pagada por un movimiento. Para cambiarlo, quita el enlace desde ese movimiento en Movimientos.';

interface BudgetEntryRowProps {
  entry: BudgetEntry;
  onTogglePaid: (entry: BudgetEntry) => void;
  // En modo edicion la fila deja de ser un check y abre el formulario de la linea.
  editMode?: boolean;
  onEdit?: (entry: BudgetEntry) => void;
  // En modo edicion, subir/bajar la linea dentro de su grupo.
  onMove?: (entry: BudgetEntry, delta: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  // Lugar de la linea en su grupo (desde 0) y numero de lineas, para anunciar el movimiento.
  position?: number;
  total?: number;
}

export const BudgetEntryRow = memo(
  ({
    entry,
    onTogglePaid,
    editMode = false,
    onEdit,
    onMove,
    canMoveUp = false,
    canMoveDown = false,
    position,
    total,
  }: BudgetEntryRowProps) => {
    const theme = useTheme();

    if (editMode) {
      return (
        <View style={styles.editRow}>
          <AnimatedPressable
            testID={`budget-entry-${entry.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${entry.name}`}
            onPress={() => onEdit?.(entry)}
            style={styles.editMain}>
            <Feather name="edit-2" size={18} color={theme.textSecondary} />
            <ThemedText style={styles.name}>{entry.name}</ThemedText>
            <ThemedText type="smallBold" style={styles.amount}>
              {formatMoney(entry.amount)}
            </ThemedText>
          </AnimatedPressable>
          {onMove && (
            <BudgetMoveButtons
              label={entry.name}
              testIDPrefix={`budget-entry-move-${entry.id}`}
              canMoveUp={canMoveUp}
              canMoveDown={canMoveDown}
              onMove={(delta) => onMove(entry, delta)}
              color={theme.textSecondary}
              position={position}
              total={total}
            />
          )}
        </View>
      );
    }

    const isRefund = Number(entry.amount) < 0;
    const linked = isEntryLinked(entry);
    const actual = getEntryActual(entry);
    // Enlazada: el importe que se ve es el real del gasto y, si difiere, debajo queda el previsto.
    const differs = linked && actual !== Number(entry.amount);
    const shownAmount = linked ? String(actual) : entry.amount;
    return (
      <AnimatedPressable
        testID={`budget-entry-${entry.id}`}
        accessibilityRole="checkbox"
        accessibilityLabel={
          linked
            ? `${entry.name}, ${formatMoney(shownAmount)}${differs ? `, previsto ${formatMoney(entry.amount)}` : ''}, enlazada a un movimiento`
            : `${entry.name}, ${formatMoney(entry.amount)}`
        }
        accessibilityHint={linked ? 'Para cambiarla, quita el enlace desde el movimiento en Movimientos' : undefined}
        accessibilityState={{ checked: entry.paid }}
        // No se deshabilita: un toque sin respuesta confunde. Explica por que no se puede marcar a mano.
        onPress={() => (linked ? notify(LINKED_TITLE, LINKED_MESSAGE) : onTogglePaid(entry))}
        style={styles.row}>
        <Feather
          name={entry.paid ? 'check-square' : 'square'}
          size={20}
          color={entry.paid ? theme.primary : theme.textSecondary}
        />
        <View style={styles.nameBlock}>
          <View style={styles.nameLine}>
            <ThemedText themeColor={entry.paid ? 'textSecondary' : 'text'} style={styles.nameText}>
              {entry.name}
            </ThemedText>
            {linked && <Feather testID={`budget-entry-link-${entry.id}`} name="link" size={14} color={theme.textSecondary} />}
          </View>
          {differs && (
            <ThemedText type="small" themeColor="textSecondary">
              Previsto {formatMoney(entry.amount)}
            </ThemedText>
          )}
        </View>
        <ThemedText type="smallBold" themeColor={isRefund ? 'income' : entry.paid ? 'textSecondary' : 'text'}>
          {formatMoney(shownAmount)}
        </ThemedText>
      </AnimatedPressable>
    );
  },
);
BudgetEntryRow.displayName = 'BudgetEntryRow';
