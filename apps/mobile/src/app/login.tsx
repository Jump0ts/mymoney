import { yupResolver } from '@hookform/resolvers/yup';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLogin } from '@/features/auth/useAuthApi';
import { loginSchema, type LoginFormValues } from '@/features/auth/auth.schema';
import { ApiError } from '@/lib/api';
import { styles } from '@/screens/login.styles';

const LoginScreen = () => {
  const login = useLogin();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const errorMessage = login.isError
    ? login.error instanceof ApiError
      ? login.error.message
      : 'No se pudo conectar con el servidor'
    : null;

  const onSubmit = (values: LoginFormValues) => login.mutate(values);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.form}>
          <ThemedText type="title" style={styles.title}>
            MyMoney
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
            Entra con tu cuenta
          </ThemedText>

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
                textContentType="password"
                autoComplete="password"
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

          <Button label="Entrar" loading={login.isPending} onPress={handleSubmit(onSubmit)} />

          <Link href="/register" style={styles.link}>
            <ThemedText type="link" themeColor="primary">
              ¿Primera vez? Crea tu cuenta
            </ThemedText>
          </Link>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
};

export default LoginScreen;
