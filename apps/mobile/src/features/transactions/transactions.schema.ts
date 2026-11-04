import * as yup from 'yup';

export const addTransactionSchema = yup.object({
  categoryId: yup.string().required('Elige una categoría'),
  type: yup.mixed<'INCOME' | 'EXPENSE'>().oneOf(['INCOME', 'EXPENSE']).required(),
  amount: yup
    .number()
    .typeError('Introduce un importe válido')
    .positive('El importe debe ser mayor que 0')
    .required('El importe es obligatorio'),
  description: yup.string().trim().max(200).optional(),
  occurredAt: yup.date().required(),
  // Linea del presupuesto que cubre este gasto (opcional; solo para gastos).
  budgetEntryId: yup.string().nullable().optional(),
  // Grupo del presupuesto del que sale el gasto: crea una linea puntual nueva (no se combina con budgetEntryId).
  budgetGroupId: yup.string().nullable().optional(),
});

export type AddTransactionFormValues = yup.InferType<typeof addTransactionSchema>;
