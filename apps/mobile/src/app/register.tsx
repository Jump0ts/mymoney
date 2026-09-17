import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useRegister } from '@/hooks/useAuthApi';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const register = useRegister();

  const errorMessage = register.isError
    ? register.error instanceof ApiError
      ? register.error.message
      : 'No se pudo conectar con el servidor'
    : null;

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

          <Input placeholder="Tu nombre" value={name} onChangeText={setName} />
          <Input
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />

          {errorMessage && (
            <ThemedText themeColor="danger" type="small">
              {errorMessage}
            </ThemedText>
          )}

          <Button
            label="Crear cuenta"
            loading={register.isPending}
            onPress={() => register.mutate({ name, email, password })}
          />

          <Link href="/login" style={styles.link}>
            <ThemedText type="link" themeColor="primary">
              Ya tengo cuenta
            </ThemedText>
          </Link>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  form: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  title: { fontSize: 34, lineHeight: 40 },
  subtitle: { marginBottom: Spacing.two },
  link: { alignSelf: 'center', marginTop: Spacing.two },
});
