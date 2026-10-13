import * as yup from 'yup';
import type { BudgetLineType, BudgetScope } from './budgets.types';
import { parseAmountInput } from './budgets.utils';

export const budgetGroupSchema = yup.object({
  name: yup.string().trim().required('El nombre es obligatorio').max(40, 'Máximo 40 caracteres'),
  color: yup.string().required('Elige un color'),
});

export type BudgetGroupFormValues = yup.InferType<typeof budgetGroupSchema>;

export const budgetLineSchema = yup.object({
  name: yup.string().trim().required('El nombre es obligatorio').max(60, 'Máximo 60 caracteres'),
  lineType: yup.mixed<BudgetLineType>().oneOf(['FIXED', 'REFUND', 'LIMIT']).required(),
  // El signo lo decide el tipo (reembolso), asi el teclado numerico basta.
  amount: yup
    .string()
    .required('El importe es obligatorio')
    .test('valid-amount', 'Introduce un importe válido mayor que 0', (value) => {
      const amount = parseAmountInput(value ?? '');
      // Maximo dos decimales: la base guarda centimos y 0,001 se quedaria en 0,00.
      return amount !== null && amount > 0 && amount <= 1_000_000 && Math.round(amount * 100) / 100 === amount;
    }),
  categoryId: yup.string().when('lineType', {
    is: 'LIMIT',
    then: (schema) => schema.required('Elige una categoría'),
    otherwise: (schema) => schema.optional(),
  }),
  scope: yup.mixed<BudgetScope>().oneOf(['month', 'template']).required(),
});

export type BudgetLineFormValues = yup.InferType<typeof budgetLineSchema>;
