import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ThemedText } from '@/components/themed-text';
import { useBudgetMonth } from '@/features/budgets/useBudgets';
import { getEntryActual } from '@/features/budgets/budgets.utils';
import { useTheme } from '@/hooks/use-theme';
import type { YearMonth } from '@/utils/date';
import { formatMoney } from '@/utils/format';
import { styles } from './BudgetLinkPicker.styles';

export interface LinkedLine {
  name: string;
  plannedAmount: string;
  // Sobre: lo previsto es para todos sus gastos, no para este.
  envelope: boolean;
}

interface BudgetLinkPickerProps {
  // Un gasto se enlaza con las lineas de gasto y un reembolso (lo que te devuelven por algo que pagas a medias), con
  // las de reembolso. Por defecto, un gasto.
  refund?: boolean;
  // Mes del gasto: solo se ofrecen las lineas de su presupuesto.
  month: YearMonth;
  value: string | null;
  // Segundo argumento: nombre e importe previsto de la linea elegida (para rellenar importe y descripcion vacios);
  // nada si se quita el enlace.
  onChange: (budgetEntryId: string | null, line?: LinkedLine) => void;
  // Gasto que se esta editando: su propia linea sigue disponible aunque ya este enlazada a el.
  ownTransactionId?: string;
  // Nombre de la linea ya enlazada ("Luz · Hogar"): se ve aunque el presupuesto aun no haya cargado.
  currentLabel?: string;
  // Grupo elegido para que el gasto cree su propia linea puntual (alternativa a enlazar una linea que ya existe).
  groupValue?: string | null;
  onGroupChange?: (groupId: string) => void;
  // Linea que nacio con este gasto y lo sigue (si cambia de mes se rehace en el nuevo): nunca se quita sola.
  ownLineId?: string;
}

// Elige de donde sale este gasto en el presupuesto del mes: una linea que ya existe (solo salen lineas de gasto, no
// reembolsos; una linea normal solo si no tiene ya otro gasto, un sobre siempre) o un grupo, para que el gasto cree su
// propia linea puntual. Con un reembolso salen solo las lineas de reembolso que aun no tienen el suyo, y el grupo
// crea una linea de reembolso nueva.
export const BudgetLinkPicker = ({
  refund = false,
  month,
  value,
  onChange,
  ownTransactionId,
  currentLabel,
  groupValue = null,
  onGroupChange,
  ownLineId,
}: BudgetLinkPickerProps) => {
  const theme = useTheme();
  // Una linea de reembolso se guarda con importe negativo; al enlazar un reembolso se ofrece y se rellena lo que te
  // devuelven, sin signo.
  const plannedOf = (amount: string) => (refund ? amount.replace(/^-/, '') : amount);
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, isError, isFetching } = useBudgetMonth(month);

  // Un mes futuro sin guardar aun no tiene lineas reales: no se puede enlazar a ellas.
  const isPreview = data?.preview === true;

  const groups = useMemo(
    () =>
      (isPreview ? [] : (data?.groups ?? []))
        .map((group) => ({
          ...group,
          entries: group.entries.filter(
            (entry) =>
              (refund ? Number(entry.amount) < 0 : Number(entry.amount) > 0) &&
              (entry.envelope || entry.transactions.every((expense) => expense.id === ownTransactionId)),
          ),
        }))
        .filter((group) => group.entries.length > 0),
    [data, isPreview, ownTransactionId, refund],
  );

  const selected = useMemo(
    () =>
      groups.flatMap((group) => group.entries.map((entry) => ({ entry, group }))).find(({ entry }) => entry.id === value),
    [groups, value],
  );

  const selectedGroup = useMemo(
    () => (groupValue ? data?.groups.find((group) => group.id === groupValue) : undefined),
    [data, groupValue],
  );

  // Si el gasto cambia de mes, la linea elegida deja de ser de este presupuesto y se quita el enlace. Solo se
  // decide con datos ya actualizados: un dato antiguo en cache podria no incluir una linea recien creada.
  // La linea que nacio con el gasto no se quita: el servidor la rehace en el mes nuevo.
  useEffect(() => {
    if (value && value !== ownLineId && data && !isFetching && !selected) onChange(null);
  }, [value, ownLineId, data, isFetching, selected, onChange]);

  const choose = (budgetEntryId: string | null, line?: LinkedLine) => {
    onChange(budgetEntryId, line);
    setExpanded(false);
  };

  // Con una linea elegida que aun no se ha podido resolver (cargando o sin conexion) no se dice "Sin enlazar":
  // el enlace sigue ahi y se conserva al guardar.
  const summary = groupValue
    ? `${refund ? 'Nuevo reembolso' : 'Nuevo gasto'} en ${selectedGroup?.name ?? 'un grupo'}`
    : selected
      ? `${selected.entry.name} · ${selected.group.name}`
      : value
        ? (currentLabel ?? 'Línea del presupuesto')
        : 'Sin enlazar';
  const linked = Boolean(groupValue || selected);

  return (
    <View style={styles.container}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`Línea del presupuesto: ${summary}`}
        accessibilityState={{ expanded }}
        testID="budget-link-toggle"
        onPress={() => setExpanded((open) => !open)}
        style={styles.toggle}>
        <Feather name="link" size={18} color={linked ? theme.primary : theme.textSecondary} />
        <ThemedText numberOfLines={1} themeColor={linked ? 'text' : 'textSecondary'} style={styles.toggleText}>
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
              {isPreview
                ? 'Este mes aún no está preparado en Presupuesto: edítalo allí para poder enlazar.'
                : refund
                  ? 'No hay reembolsos libres en el presupuesto de este mes.'
                  : 'No hay líneas de gasto libres en el presupuesto de este mes.'}
            </ThemedText>
          )}

          <AnimatedPressable
            accessibilityRole="radio"
            accessibilityLabel="Sin enlazar"
            accessibilityState={{ selected: value === null && !groupValue }}
            testID="budget-link-none"
            // Opciones apiladas de 44 pt: el hitSlop de 8 por defecto haria que se solaparan con las vecinas.
            hitSlop={0}
            onPress={() => choose(null)}
            style={[styles.option, value === null && !groupValue && { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText style={styles.optionName}>Sin enlazar</ThemedText>
            {value === null && !groupValue && <Feather name="check" size={18} color={theme.primary} />}
          </AnimatedPressable>

          {onGroupChange && (data?.groups.length ?? 0) > 0 && (
            <View>
              <ThemedText type="smallBold" themeColor="textSecondary" accessibilityRole="header" style={styles.groupTitle}>
                {refund ? 'Reembolso nuevo en un grupo' : 'Gasto nuevo en un grupo'}
              </ThemedText>
              {data?.groups.map((group) => {
                const active = group.id === groupValue;
                return (
                  <AnimatedPressable
                    key={group.id}
                    accessibilityRole="radio"
                    accessibilityLabel={`${refund ? 'Nuevo reembolso' : 'Nuevo gasto'} en ${group.name}`}
                    accessibilityState={{ selected: active }}
                    testID={`budget-group-option-${group.id}`}
                    hitSlop={0}
                    onPress={() => {
                      onGroupChange(group.id);
                      setExpanded(false);
                    }}
                    style={[styles.option, active && { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={styles.optionName}>{group.name}</ThemedText>
                    {active && <Feather name="check" size={18} color={theme.primary} />}
                  </AnimatedPressable>
                );
              })}
            </View>
          )}

          {onGroupChange && groups.length > 0 && (
            <ThemedText type="smallBold" themeColor="textSecondary" accessibilityRole="header" style={styles.groupTitle}>
              Enlazar con una línea
            </ThemedText>
          )}

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
                    accessibilityLabel={
                      entry.envelope
                        ? `${entry.name}, variable, gastado ${formatMoney(getEntryActual(entry))} de ${formatMoney(entry.amount)}`
                        : refund
                          ? `${entry.name}, reembolso previsto ${formatMoney(plannedOf(entry.amount))}`
                          : `${entry.name}, previsto ${formatMoney(entry.amount)}`
                    }
                    accessibilityState={{ selected: active }}
                    testID={`budget-link-option-${entry.id}`}
                    hitSlop={0}
                    onPress={() =>
                      choose(entry.id, {
                        name: entry.name,
                        plannedAmount: plannedOf(entry.amount),
                        envelope: entry.envelope,
                      })
                    }
                    style={[styles.option, active && { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText style={styles.optionName}>{entry.name}</ThemedText>
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.optionAmount}>
                      {entry.envelope
                        ? `${formatMoney(getEntryActual(entry))} de ${formatMoney(entry.amount)}`
                        : formatMoney(plannedOf(entry.amount))}
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
