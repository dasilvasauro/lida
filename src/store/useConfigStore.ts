import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark-amoled';
type Font = 'sans' | 'serif' | 'special';
type ModusOperandi = 'multitask' | 'minimalist' | 'punctual' | 'ambitious' | null;

interface ConfigState {
  theme: Theme;
  font: Font;
  userClass: ModusOperandi;
  userName: string;
  isOnboarded: boolean;
  setTheme: (theme: Theme) => void;
  setFont: (font: Font) => void;
  setUserName: (name: string) => void;
  setUserClass: (userClass: ModusOperandi) => void;
  completeOnboarding: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      theme: 'dark-amoled',
      font: 'sans',
      userClass: null,
      userName: '',
      isOnboarded: false,
      setTheme: (theme) => set({ theme }),
      setFont: (font) => set({ font }),
      setUserName: (userName) => set({ userName }),
      setUserClass: (userClass) => set({ userClass }),
      completeOnboarding: () => set({ isOnboarded: true }),
    }),
    { name: 'lida-config' }
  )
);