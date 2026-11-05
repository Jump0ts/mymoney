import { yupResolver } from '@hookform/resolvers/yup';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Button } from '@/components/Button';
import { CategoryPill } from '@/components/CategoryPill';
import { FieldError } from '@/components/FieldError';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCategories } from '@/features/categories/useCategories';
import { formatMoney } from '@/utils/format';
import { payEntrySchema, type PayEntryFormValues } from './budgets.schema';
import { styles } from './PayEntryForm.styles';

interface PayEntryFormProps {
  // Linea que se paga: su nombre encabeza la hoja y el importe previsto es el que se propone.
  entryName: string;
  plannedAmount: string;
  // Solo en un sobre: lo gastado hasta ahora. La hoja apunta entonces un gasto nuevo (importe vacio) y muestra cuanto
  // queda del sobre, en vez de proponer el importe previsto.
  spentAmount?: string;
  // Solo en un reembolso: la hoja registra el ingreso que te devuelven (categorias de ingreso, importe cobrado) en
  // vez de un gasto. `plannedAmount` llega sin signo.
  refund?: boolean;
  // Categoria sugerida (la del ultimo pago de esta misma linea); vacia la primera vez.
  defaultCategoryId?: string;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (values: PayEntryFormValues) => void;
}

// "21.99" -> "21,99": el teclado y lo que se escribe usan la coma.
const toInputText = (amount: string) => String(Number(amount)).replace('.', ',');

export const PayEntryForm = ({
  entryName,
  plannedAmount,
  spentAmount,
  refund = false,
  defaultCategoryId,
  isSubmitting,
  submitError,
  onSubmit,
}: PayEntryFormProps) => {
  const { data: categories } = useCategories();
  const isEnvelope = spentAmount !== undefined;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PayEntryFormValues>({
    resolver: yupResolver(payEntrySchema),
    defaultValues: { categoryId: defaultCategoryId ?? '', amount: isEnvelope ? '' : toInputText(plannedAmount) },
  });

  // Una linea de gasto se paga con un gasto y un reembolso se cobra con un ingreso.
  const paymentType = refund ? 'INCOME' : 'EXPENSE';
  const paymentCategories = useMemo(
    () => categories?.filter((c) => c.type === paymentType) ?? [],
    [categories, paymentType],
  );

  // Ya cargadas y ninguna del tipo que hace falta (mientras cargan no se avisa de nada).
  const noCategories = Boolean(categories) && paymentCategories.length === 0;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <ThemedText type="subtitle" accessibilityRole="header">
              {entryName}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {isEnvelope
                ? `Gastado ${formatMoney(spentAmount)} de ${formatMoney(plannedAmount)}`
                : refund
                  ? `Reembolso previsto ${formatMoney(plannedAmount)}`
                  : `Previsto ${formatMoney(plannedAmount)}`}
            </ThemedText>
          </View>

          <View style={styles.field}>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <Input
                  testID="pay-entry-amount"
                  accessibilityLabel={
                    isEnvelope ? 'Importe del gasto en euros' : refund ? 'Importe recibido en euros' : 'Importe pagado en euros'
                  }
                  autoFocus={isEnvelope}
                  placeholder="0,00 €"
                  keyboardType="decimal-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  style={styles.amountInput}
                />
              )}
            />
            <FieldError message={errors.amount?.message} />
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Categoría
            </ThemedText>
            {noCategories ? (
              // Sin categorias del tipo que toca no hay nada que elegir: el aviso va solo, no dentro de un grupo vacio.
              <ThemedText type="small" themeColor="textSecondary">
                {refund
                  ? 'No tienes categorías de ingreso: crea una en Categorías para registrar el reembolso.'
                  : 'No tienes categorías de gasto: crea una en Categorías para registrar el pago.'}
              </ThemedText>
            ) : (
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <View accessibilityRole="radiogroup" style={styles.chipWrap}>
                    {paymentCategories.map((category) => (
                      <AnimatedPressable
                        key={category.id}
                        accessibilityRole="radio"
                        accessibilityLabel={category.name}
                        accessibilityState={{ selected: field.value === category.id }}
                        testID={`pay-entry-category-${category.id}`}
                        onPress={() => field.onChange(category.id)}
                        style={[styles.chipTouchArea, { opacity: !field.value || field.value === category.id ? 1 : 0.4 }]}>
                        <CategoryPill category={category} />
                      </AnimatedPressable>
                    ))}
                  </View>
                )}
              />
            )}
            <FieldError message={errors.categoryId?.message} />
          </View>

          <FieldError message={submitError} />

          <Button
            testID="pay-entry-submit"
            label={isEnvelope ? 'Añadir gasto' : refund ? 'Marcar como cobrada' : 'Marcar como pagada'}
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
};
