import { create } from 'zustand';
import { deleteItem, getItem, setItem } from '@/lib/secureStorage';

const TOKEN_KEY = 'mymoney_token';
const USER_KEY = 'mymoney_user';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isHydrated: false,

  hydrate: async () => {
    try {
      const [token, userJson] = await Promise.all([getItem(TOKEN_KEY), getItem(USER_KEY)]);
      set({
        token,
        user: userJson ? (JSON.parse(userJson) as AuthUser) : null,
        isHydrated: true,
      });
    } catch {
      set({ token: null, user: null, isHydrated: true });
    }
  },

  setSession: async (token, user) => {
    await Promise.all([setItem(TOKEN_KEY, token), setItem(USER_KEY, JSON.stringify(user))]);
    set({ token, user });
  },

  logout: async () => {
    await Promise.all([deleteItem(TOKEN_KEY), deleteItem(USER_KEY)]);
    set({ token: null, user: null });
  },
}));
