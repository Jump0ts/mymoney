import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useAuthStore } from '@/features/auth/auth.store';
import { queryClient } from '@/lib/queryClient';

const RootLayout = () => {
  const colorScheme = useColorScheme();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const token = useAuthStore((s) => s.token);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [hasStartedHydration, setHasStartedHydration] = useState(false);

  useEffect(() => {
    if (!hasStartedHydration) {
      setHasStartedHydration(true);
      hydrate();
    }
  }, [hasStartedHydration, hydrate]);

  if (!isHydrated) {
    return <ThemedView style={{ flex: 1 }} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!!token}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="add-transaction"
              options={{ presentation: 'modal', headerShown: true, title: 'Nuevo movimiento' }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!token}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default RootLayout;
