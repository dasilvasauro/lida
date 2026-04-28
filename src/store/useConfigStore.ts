import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark-amoled';
type Font = 'sans' | 'serif' | 'special';
type ModusOperandi = 'multitask' | 'minimalist' | 'punctual' | 'ambitious' | null;

interface ConfigState {
  theme: Theme; font: Font; userClass: ModusOperandi; userName: string;
  isOnboarded: boolean; lastLoginDate: string | null;
  uid: string | null; e2eePin: string | null; isLocalMode: boolean;
  
  // Modais Globais e de Perfil
  showExitWarning: boolean;
  isExitModalOpen: boolean;
  isVisionOpen: boolean;
  isSettingsOpen: boolean;
  isGoogleConnectOpen: boolean;
  isChangelogOpen: boolean;

  setTheme: (theme: Theme) => void; setFont: (font: Font) => void;
  setUserName: (name: string) => void; setUserClass: (userClass: ModusOperandi) => void;
  completeOnboarding: () => void; setLastLoginDate: (date: string) => void;
  setAuth: (uid: string, pin: string) => void; setLocalMode: (isLocal: boolean) => void;
  logout: () => void;

  setShowExitWarning: (show: boolean) => void;
  setExitModalOpen: (open: boolean) => void;
  setVisionOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setGoogleConnectOpen: (open: boolean) => void;
  setChangelogOpen: (open: boolean) => void;
}

export const useConfigStore = create<ConfigState>()(persist((set) => ({
  theme: 'dark-amoled', font: 'sans', userClass: null, userName: '',
  isOnboarded: false, lastLoginDate: null, uid: null, e2eePin: null, isLocalMode: false,
  
  showExitWarning: true, isExitModalOpen: false, isVisionOpen: false,
  isSettingsOpen: false, isGoogleConnectOpen: false, isChangelogOpen: false,
  
  setTheme: (theme) => set({ theme }), setFont: (font) => set({ font }),
  setUserName: (userName) => set({ userName }), setUserClass: (userClass) => set({ userClass }),
  completeOnboarding: () => set({ isOnboarded: true }), setLastLoginDate: (date) => set({ lastLoginDate: date }),
  setAuth: (uid, pin) => set({ uid, e2eePin: pin, isLocalMode: false }),
  setLocalMode: (isLocalMode) => set({ isLocalMode }),
  logout: () => set({ uid: null, e2eePin: null, isOnboarded: false, isLocalMode: false }),

  setShowExitWarning: (show) => set({ showExitWarning: show }),
  setExitModalOpen: (open) => set({ isExitModalOpen: open }),
  setVisionOpen: (open) => set({ isVisionOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setGoogleConnectOpen: (open) => set({ isGoogleConnectOpen: open }),
  setChangelogOpen: (open) => set({ isChangelogOpen: open }),
}), { name: 'lida-config' }));