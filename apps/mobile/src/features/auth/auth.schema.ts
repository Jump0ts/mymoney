import * as yup from 'yup';

export const loginSchema = yup.object({
  email: yup.string().required('El email es obligatorio').email('Email no válido'),
  password: yup.string().required('La contraseña es obligatoria').min(8, 'Mínimo 8 caracteres'),
});

export type LoginFormValues = yup.InferType<typeof loginSchema>;

export const registerSchema = yup.object({
  name: yup.string().trim().required('El nombre es obligatorio').min(2, 'Mínimo 2 caracteres'),
  email: yup.string().required('El email es obligatorio').email('Email no válido'),
  password: yup.string().required('La contraseña es obligatoria').min(8, 'Mínimo 8 caracteres'),
});

export type RegisterFormValues = yup.InferType<typeof registerSchema>;
