import * as yup from 'yup';
import { normalizeHex } from '@/utils/color';

// El campo de texto del selector de color (vacio lo rechaza `required`, no el formato): #RRGGBB, con o sin #, y tambien la forma corta #RGB.
export const customColorSchema = yup.object({
  hex: yup
    .string()
    .required('Escribe un color')
    .test('valid-hex', 'Escribe un color como #1A2B3C', (value) => !value || normalizeHex(value) !== null),
});

export type CustomColorFormValues = yup.InferType<typeof customColorSchema>;
