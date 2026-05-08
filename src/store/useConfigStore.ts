import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useRef } from 'react';

// === MOTOR DE NAVEGAÇÃO NATIVA ===
export const backHandlers: Array<() => boolean> = [];
export const registerBackHandler = (handler: () => boolean) => backHandlers.push(handler);
export const unregisterBackHandler = (handler: () => boolean) => {
    const index = backHandlers.indexOf(handler);
    if (index > -1) backHandlers.splice(index, 1);
};
export const triggerBack = () => {
    for (let i = backHandlers.length - 1; i >= 0; i--) { if (backHandlers[i]()) return true; }
    return false;
};

export const useBackHandler = (isActive: boolean, handler: () => boolean) => {
    const handlerRef = useRef(handler);
    useEffect(() => { handlerRef.current = handler; }, [handler]);
    useEffect(() => {
        if (!isActive) return;
        const fn = () => handlerRef.current();
        registerBackHandler(fn);
        return () => unregisterBackHandler(fn);
    }, [isActive]);
};

// ATUALIZADO: Os 6 novos temas premium adicionados
export type Theme = 'light' | 'dark-amoled' | 'soft-dark' | 'butter' | 'navy' | 'darcula' | 'macos' | 'matrix' | 'pink' | 'todoist' | 'light-gray' | 'orange';
type Font = 'sans' | 'serif' | 'special';
type ModusOperandi = 'multitask' | 'minimalist' | 'punctual' | 'ambitious' | null;

interface ConfigState {
  theme: Theme; font: Font; userClass: ModusOperandi; userName: string;
  isOnboarded: boolean; lastLoginDate: string | null;
  uid: string | null; e2eePin: string | null; isLocalMode: boolean;
  
  defaultDaysOff: number[]; hasDismissedDayOffWarning: boolean;
  enableEditWindow: boolean; enablePunishments: boolean; hasDismissedEditWarning: boolean;
  showExitWarning: boolean; isExitModalOpen: boolean; isVisionOpen: boolean;
  isSettingsOpen: boolean; isGoogleConnectOpen: boolean; isChangelogOpen: boolean;

  // OFFLINE E TOMBSTONES
  isManualOffline: boolean;
  tombstones: Record<string, number>;
  setManualOffline: (val: boolean) => void;
  addTombstone: (id: string) => void;
  mergeTombstones: (cloudTombstones: Record<string, number>) => void;

  setTheme: (theme: Theme) => void; setFont: (font: Font) => void;
  setUserName: (name: string) => void; setUserClass: (userClass: ModusOperandi) => void;
  completeOnboarding: () => void; setLastLoginDate: (date: string) => void;
  setAuth: (uid: string, pin: string) => void; setLocalMode: (isLocal: boolean) => void;
  logout: () => void;
  setDefaultDaysOff: (days: number[]) => void; dismissDayOffWarning: () => void; 
  setEnableEditWindow: (val: boolean) => void; setEnablePunishments: (val: boolean) => void; dismissEditWarning: () => void;
  setShowExitWarning: (show: boolean) => void; setExitModalOpen: (open: boolean) => void;
  setVisionOpen: (open: boolean) => void; setSettingsOpen: (open: boolean) => void;
  setGoogleConnectOpen: (open: boolean) => void; setChangelogOpen: (open: boolean) => void;
}

export const useConfigStore = create<ConfigState>()(persist((set) => ({
  theme: 'dark-amoled', font: 'sans', userClass: null, userName: '',
  isOnboarded: false, lastLoginDate: null, uid: null, e2eePin: null, isLocalMode: false,
  defaultDaysOff: [], hasDismissedDayOffWarning: false,
  enableEditWindow: true, enablePunishments: true, hasDismissedEditWarning: false,
  showExitWarning: true, isExitModalOpen: false, isVisionOpen: false,
  isSettingsOpen: false, isGoogleConnectOpen: false, isChangelogOpen: false,

  isManualOffline: false, tombstones: {},
  setManualOffline: (val) => set({ isManualOffline: val }),
  addTombstone: (id) => set((state) => ({ tombstones: { ...state.tombstones, [id]: Date.now() } })),
  mergeTombstones: (cloudTombstones) => set((state) => {
      const merged = { ...state.tombstones };
      for (const id in cloudTombstones) { merged[id] = Math.max(merged[id] || 0, cloudTombstones[id]); }
      return { tombstones: merged };
  }),
  
  setTheme: (theme) => set({ theme }), setFont: (font) => set({ font }),
  setUserName: (userName) => set({ userName }), setUserClass: (userClass) => set({ userClass }),
  completeOnboarding: () => set({ isOnboarded: true }), setLastLoginDate: (date) => set({ lastLoginDate: date }),
  setAuth: (uid, pin) => set({ uid, e2eePin: pin, isLocalMode: false }), setLocalMode: (isLocalMode) => set({ isLocalMode }),
  logout: () => set({ uid: null, e2eePin: null, isOnboarded: false, isLocalMode: false }),
  setDefaultDaysOff: (days) => set({ defaultDaysOff: days }), dismissDayOffWarning: () => set({ hasDismissedDayOffWarning: true }),
  setEnableEditWindow: (val) => set({ enableEditWindow: val }), setEnablePunishments: (val) => set({ enablePunishments: val }), dismissEditWarning: () => set({ hasDismissedEditWarning: true }),
  setShowExitWarning: (show) => set({ showExitWarning: show }), setExitModalOpen: (open) => set({ isExitModalOpen: open }),
  setVisionOpen: (open) => set({ isVisionOpen: open }), setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setGoogleConnectOpen: (open) => set({ isGoogleConnectOpen: open }), setChangelogOpen: (open) => set({ isChangelogOpen: open }),
}), { name: 'lida-config' }));