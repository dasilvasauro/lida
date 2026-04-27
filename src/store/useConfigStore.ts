import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark-amoled';
type Font = 'sans' | 'serif' | 'special';
type ModusOperandi = 'multitask' | 'minimalist' | 'punctual' | 'ambitious' | null;

interface ConfigState {
  theme: Theme; font: Font; userClass: ModusOperandi; userName: string;
  isOnboarded: boolean; lastLoginDate: string | null;
  uid: string | null;          // <-- NOVO
  e2eePin: string | null;      // <-- NOVO

  setTheme: (theme: Theme) => void; setFont: (font: Font) => void;
  setUserName: (name: string) => void; setUserClass: (userClass: ModusOperandi) => void;
  completeOnboarding: () => void; setLastLoginDate: (date: string) => void;
  setAuth: (uid: string, pin: string) => void; // <-- NOVO
  logout: () => void;                          // <-- NOVO
}

export const useConfigStore = create<ConfigState>()(persist((set) => ({
  theme: 'dark-amoled', font: 'sans', userClass: null, userName: '',
  isOnboarded: false, lastLoginDate: null, uid: null, e2eePin: null,
  
  setTheme: (theme) => set({ theme }), setFont: (font) => set({ font }),
  setUserName: (userName) => set({ userName }), setUserClass: (userClass) => set({ userClass }),
  completeOnboarding: () => set({ isOnboarded: true }), setLastLoginDate: (date) => set({ lastLoginDate: date }),
  setAuth: (uid, pin) => set({ uid, e2eePin: pin }),
  logout: () => set({ uid: null, e2eePin: null, isOnboarded: false }),
}), { name: 'lida-config' }));