import { yupResolver } from '@hookform/resolvers/yup';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRegister } from '@/features/auth/useAuthApi';
import { registerSchema, type RegisterFormValues } from '@/features/auth/auth.schema';
import { ApiError } from '@/lib/api';
import { styles } from '@/screens/register.styles';

const RegisterScreen = () => {
  const register = useRegister();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: yupResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const errorMessage = register.isError
    ? register.error instanceof ApiError
      ? register.error.message
      : 'No se pudo conectar con el servidor'
    : null;

  const onSubmit = (values: RegisterFormValues) => register.mutate(values);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}>
          <ThemedText type="title" style={styles.title}>
            Crea tu cuenta
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
            Tus datos son privados: solo tú puedes verlos
          </ThemedText>

          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input
                placeholder="Tu nombre"
                textContentType="name"
                autoComplete="name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          {errors.name && (
            <ThemedText themeColor="danger" type="small">
              {errors.name.message}
            </ThemedText>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="username"
                autoComplete="email"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          {errors.email && (
            <ThemedText themeColor="danger" type="small">
              {errors.email.message}
            </ThemedText>
          )}

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <Input
                placeholder="Contraseña"
                secureTextEntry
                textContentType="newPassword"
                autoComplete="password-new"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          {errors.password && (
            <ThemedText themeColor="danger" type="small">
              {errors.password.message}
            </ThemedText>
          )}

          {errorMessage && (
            <ThemedText themeColor="danger" type="small">
              {errorMessage}
            </ThemedText>
          )}

          <Button label="Crear cuenta" loading={register.isPending} onPress={handleSubmit(onSubmit)} />

          <Link href="/login" style={styles.link}>
            <ThemedText type="link" themeColor="primary">
              Ya tengo cuenta
            </ThemedText>
          </Link>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
};

export default RegisterScreen;
