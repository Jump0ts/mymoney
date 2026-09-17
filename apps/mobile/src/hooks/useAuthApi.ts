import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/store/auth';

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiRequest<AuthResponse>('/api/auth/login', { method: 'POST', body: input, auth: false }),
    onSuccess: (data) => setSession(data.token, data.user),
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) =>
      apiRequest<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: input,
        auth: false,
      }),
    onSuccess: (data) => setSession(data.token, data.user),
  });
}
