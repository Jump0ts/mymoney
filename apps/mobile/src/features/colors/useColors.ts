import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { SavedColor } from './colors.types';

const COLORS_KEY = ['colors'] as const;

// Los colores propios del usuario, del mas antiguo al mas nuevo.
export const useSavedColors = () =>
  useQuery({
    queryKey: COLORS_KEY,
    queryFn: () => apiRequest<{ colors: SavedColor[] }>('/api/colors'),
    select: (data) => data.colors,
  });

// Guardar es idempotente en el servidor: guardar un color que ya estaba no hace nada.
export const useSaveColor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hex: string) => apiRequest<{ color: SavedColor }>('/api/colors', { method: 'POST', body: { hex } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COLORS_KEY }),
  });
};

export const useRemoveColor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/api/colors/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COLORS_KEY }),
  });
};
