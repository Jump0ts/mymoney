import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/features/auth/auth.store';
import { styles } from './settings.styles';

const SettingsScreen = () => {
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
          </Card>

          <Button label="Cerrar sesión" variant="secondary" onPress={() => logout()} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
};

export default SettingsScreen;
