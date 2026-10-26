import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ThemedText } from '@/components/themed-text';
import { useBudgetMonth } from '@/features/budgets/useBudgets';
import { useTheme } from '@/hooks/use-theme';
import type { YearMonth } from '@/utils/date';
import { formatMoney } from '@/utils/format';
import { styles } from './BudgetLinkPicker.styles';

interface BudgetLinkPickerProps {
  // Mes del gasto: solo se ofrecen las lineas de su presupuesto.
  month: YearMonth;
  value: string | null;
  onChange: (budgetEntryId: string | null) => void;
  // Gasto que se esta editando: su propia linea sigue disponible aunque ya este enlazada a el.
  ownTransactionId?: string;
  // Nombre de la linea ya enlazada ("Luz · Hogar"): se ve aunque el presupuesto aun no haya cargado.
  currentLabel?: string;
}

// Elige la linea del presupuesto del mes que cubre este gasto. Solo salen lineas de gasto (un reembolso no
// se enlaza) y que no tengan ya otro gasto enlazado.
export const BudgetLinkPicker = ({ month, value, onChange, ownTransactionId, currentLabel }: BudgetLinkPickerProps) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, isError, isFetching } = useBudgetMonth(month);

  const groups = useMemo(
    () =>
      (data?.groups ?? [])
        .map((group) => ({
          ...group,
          entries: group.entries.filter(
            (entry) => Number(entry.amount) > 0 && (!entry.transaction || entry.transaction.id === ownTransactionId),
          ),
        }))
        .filter((group) => group.entries.length > 0),
    [data, ownTransactionId],
  );

  const selected = useMemo(
    () =>
      groups.flatMap((group) => group.entries.map((entry) => ({ entry, group }))).find(({ entry }) => entry.id === value),
    [groups, value],
  );

  // Si el gasto cambia de mes, la linea elegida deja de ser de este presupuesto y se quita el enlace. Solo se
  // decide con datos ya actualizados: un dato antiguo en cache podria no incluir una linea recien creada.
  useEffect(() => {
    if (value && data && !isFetching && !selected) onChange(null);
  }, [value, data, isFetching, selected, onChange]);

  const choose = (budgetEntryId: string | null) => {
    onChange(budgetEntryId);
    setExpanded(false);
  };

  // Con una linea elegida que aun no se ha podido resolver (cargando o sin conexion) no se dice "Sin enlazar":
  // el enlace sigue ahi y se conserva al guardar.
  const summary = selected
    ? `${selected.entry.name} · ${selected.group.name}`
    : value
      ? (currentLabel ?? 'Línea del presupuesto')
      : 'Sin enlazar';

  return (
    <View style={styles.container}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`Línea del presupuesto: ${summary}`}
        accessibilityState={{ expanded }}
        testID="budget-link-toggle"
        onPress={() => setExpanded((open) => !open)}
        style={styles.toggle}>
        <Feather name="link" size={18} color={selected ? theme.primary : theme.textSecondary} />
        <ThemedText numberOfLines={1} themeColor={selected ? 'text' : 'textSecondary'} style={styles.toggleText}>
          {summary}
        </ThemedText>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
      </AnimatedPressable>

      {expanded && (
        <View accessibilityRole="radiogroup" accessibilityLabel="Línea del presupuesto" style={styles.panel}>
          {isLoading && (
            <ThemedText type="small" themeColor="textSecondary">
              Cargando el presupuesto…
            </ThemedText>
          )}
          {isError && (
            <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
              No se pudo cargar el presupuesto.
            </ThemedText>
          )}
          {!isLoading && !isError && groups.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              No hay líneas de gasto libres en el presupuesto de este mes.
            </ThemedText>
          )}

          <AnimatedPressable
            accessibilityRole="radio"
            accessibilityLabel="Sin enlazar"
            accessibilityState={{ selected: value === null }}
            testID="budget-link-none"
            // Opciones apiladas de 44 pt: el hitSlop de 8 por defecto haria que se solaparan con las vecinas.
            hitSlop={0}
            onPress={() => choose(null)}
            style={[styles.option, value === null && { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText style={styles.optionName}>Sin enlazar</ThemedText>
            {value === null && <Feather name="check" size={18} color={theme.primary} />}
          </AnimatedPressable>

          {groups.map((group) => (
            <View key={group.id}>
              <ThemedText type="smallBold" themeColor="textSecondary" accessibilityRole="header" style={styles.groupTitle}>
                {group.name}
              </ThemedText>
              {group.entries.map((entry) => {
                const active = entry.id === value;
                return (
                  <AnimatedPressable
                    key={entry.id}
                    accessibilityRole="radio"
                    accessibilityLabel={`${entry.name}, previsto ${formatMoney(entry.amount)}`}
                    accessibilityState={{ selected: active }}
                    testID={`budget-link-option-${entry.id}`}
                    hitSlop={0}
                    onPress={() => choose(entry.id)}
                    style={[styles.option, active && { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={styles.optionName}>{entry.name}</ThemedText>
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.optionAmount}>
                      {formatMoney(entry.amount)}
                    </ThemedText>
                    {active && <Feather name="check" size={18} color={theme.primary} />}
                  </AnimatedPressable>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
