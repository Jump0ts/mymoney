import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemedView } from '@/components/themed-view';
import { PAY_ENTRY_SCREEN_OPTIONS } from '@/constants/screen-options';
import { useAuthStore } from '@/features/auth/auth.store';
import { useRunOnce } from '@/hooks/useRunOnce';
import { queryClient } from '@/lib/queryClient';
import PageTitle from '@/web/PageTitle';

const RootLayout = () => {
  const colorScheme = useColorScheme();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const token = useAuthStore((s) => s.token);
  const hydrate = useAuthStore((s) => s.hydrate);

  useRunOnce(hydrate);

  // El titulo de la pestana va tambien mientras se hidrata la sesion: sale en el HTML estatico.
  if (!isHydrated) {
    return (
      <>
        <PageTitle />
        <ThemedView style={{ flex: 1 }} />
      </>
    );
  }

  // GestureHandlerRootView: sin el, los gestos (el selector de color) no responden y no avisa de nada.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <PageTitle />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!token}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="add-transaction"
                options={{ presentation: 'modal', headerShown: true, title: 'Nuevo movimiento' }}
              />
              <Stack.Screen name="pay-entry" options={PAY_ENTRY_SCREEN_OPTIONS} />
              <Stack.Screen
                name="edit-transaction/[id]"
                options={{ presentation: 'modal', headerShown: true, title: 'Editar movimiento' }}
              />
            </Stack.Protected>
            <Stack.Protected guard={!token}>
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
            </Stack.Protected>
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
