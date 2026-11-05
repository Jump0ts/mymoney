import * as yup from 'yup';
import { ColorPalette } from '@/features/colors/colors.constants';

export const createCategorySchema = yup.object({
  name: yup.string().trim().required('El nombre es obligatorio').min(1, 'Ponle un nombre'),
  type: yup.mixed<'INCOME' | 'EXPENSE'>().oneOf(['INCOME', 'EXPENSE']).required(),
  color: yup.string().default(ColorPalette[0]).required(),
  icon: yup.string().default('tag').required(),
});

export type CreateCategoryFormValues = yup.InferType<typeof createCategorySchema>;
