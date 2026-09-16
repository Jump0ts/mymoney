import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ApiError, apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useMutation } from '@tanstack/react-query';

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Ajustes
          </ThemedText>

          <Card style={styles.card}>
            <ThemedText type="smallBold">Tu cuenta</ThemedText>
            <ThemedText>{user?.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {user?.email}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Rol: {user?.role === 'OWNER' ? 'Propietario' : 'Miembro'}
            </ThemedText>
          </Card>

          {user?.role === 'OWNER' && <InviteMemberCard />}

          <Button label="Cerrar sesión" variant="secondary" onPress={() => logout()} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function InviteMemberCard() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const invite = useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) =>
      apiRequest('/api/auth/invite-member', { method: 'POST', body: input }),
    onSuccess: () => {
      setName('');
      setEmail('');
      setPassword('');
      Alert.alert('Listo', 'Miembro de la familia invitado correctamente.');
    },
    onError: (err) =>
      Alert.alert('No se pudo invitar', err instanceof ApiError ? err.message : 'Error inesperado'),
  });

  return (
    <Card style={styles.card}>
      <ThemedText type="smallBold">Invitar a un familiar</ThemedText>
      <Input placeholder="Nombre" value={name} onChangeText={setName} />
      <Input placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <Input placeholder="Contraseña temporal" secureTextEntry value={password} onChangeText={setPassword} />
      <Button
        label="Invitar"
        loading={invite.isPending}
        onPress={() => invite.mutate({ name, email, password })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontSize: 28, lineHeight: 34 },
  card: { gap: Spacing.two },
});
