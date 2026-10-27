import { create, type StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { extractCounters, diffTree, isEmptyTree, newLedger, recordDelta, recordEvent, getDeviceId, type Ledger } from '../lib/economyLedger';
import { appStorage } from '../lib/storage';
import { format } from 'date-fns';

export type EconomyItem = 'freeze' | 'dayOff' | 'instantLuck' | 'magicDice' | 'xpBoost' | 'goldBoost' | 'extraP0' | 'extraP1' | 'respite' | 'relief' | 'bonusTask' | 'luckyCard' | 'changeModus' | 'extraQuitter';

interface EconomyState {
  xp: number; level: number; gold: number; vouchers: number; voucherProgress: number;
  inventory: Record<EconomyItem, number>; activeXpBoostUntil: number | null; activeGoldBoostUntil: number | null;
  dailyHistory: Record<string, { xp: number; gold: number; lostXp?: number; lostGold?: number }>;
  levelUpData: { level: number; hasReward: boolean } | null;
  claimedMilestones: number[]; 
  purchasedThemes: string[];
  updatedAt?: number;
  ledger?: Ledger;

  buyTheme: (themeId: string, cost: number) => boolean;
  addReward: (finalXp: number, finalGold: number) => void;
  removeReward: (finalXp: number, finalGold: number) => void; 
  applyPenalty: (baseXp: number, baseGold: number) => void; 
  addVouchers: (amount: number) => void;
  spendVouchers: (amount: number) => boolean; 
  addVoucherProgress: () => void; removeVoucherProgress: () => void; 
  buyItem: (item: EconomyItem, cost: number, currency: 'gold' | 'vouchers') => boolean;
  useItem: (item: EconomyItem) => boolean;
  setBoost: (type: 'xp' | 'gold', hours: number) => void;
  clearLevelUp: () => void;
}

export const calculateLevel = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;

// === RASTREADOR DO REGISTRO ===
// Toda alteração nos contadores (por ações da store ou por setState externo, como
// o Desapego) vira uma variação na entrada deste aparelho no registro.
// Dados vindos da nuvem são aplicados com applyRemote() e não geram variação.
let applyingRemote = false;
export const applyRemoteEconomy = (fn: () => void) => {
  applyingRemote = true;
  try { fn(); } finally { applyingRemote = false; }
};

// Variações feitas dentro de withEconomyEvent viram um evento identificado, que
// conta uma vez só mesmo que mais de um aparelho o registre (ex.: punição de uma
// tarefa que falhou, processada por dois aparelhos offline).
let currentEventId: string | null = null;
export const withEconomyEvent = (eventId: string, fn: () => void) => {
  const prev = currentEventId;
  currentEventId = eventId;
  try { fn(); } finally { currentEventId = prev; }
};

const ledgerTracker = (config: StateCreator<EconomyState>): StateCreator<EconomyState> => (set, get, api) => {
  const tracked = ((partial: Parameters<typeof set>[0], replace?: boolean) => {
    const prev = get();
    (set as (p: unknown, r?: boolean) => void)(partial, replace);
    if (applyingRemote) return;
    const next = get();
    const delta = diffTree(extractCounters(prev), extractCounters(next));
    if (isEmptyTree(delta)) return;
    const ledger = next.ledger ?? newLedger(extractCounters(prev));
    (set as (p: unknown) => void)({ ledger: currentEventId ? recordEvent(ledger, currentEventId, delta) : recordDelta(ledger, getDeviceId(), delta) });
  }) as typeof set;
  api.setState = tracked;
  return config(tracked, get, api);
};


export const useEconomyStore = create<EconomyState>()(
  persist(
    ledgerTracker((set, get) => ({
      xp: 0, level: 1, gold: 1500, vouchers: 20, voucherProgress: 0,
      inventory: { freeze: 0, dayOff: 0, instantLuck: 0, magicDice: 0, xpBoost: 0, goldBoost: 0, extraP0: 0, extraP1: 0, respite: 0, relief: 0, bonusTask: 0, luckyCard: 0, changeModus: 0, extraQuitter: 0 },
      activeXpBoostUntil: null, activeGoldBoostUntil: null, dailyHistory: {}, levelUpData: null, claimedMilestones: [], purchasedThemes: [], 
      updatedAt: 0, 
      clearLevelUp: () => set({ levelUpData: null, updatedAt: Date.now() }),

      buyTheme: (themeId, cost) => {
        const state = get();
        if (state.gold >= cost && !state.purchasedThemes.includes(themeId)) {
            set({ gold: state.gold - cost, purchasedThemes: [...state.purchasedThemes, themeId], updatedAt: Date.now() });
            return true;
        }
        return false;
      },

      addReward: (finalXp, finalGold) => set((state) => {
        const newXp = state.xp + finalXp; 
        const newLevel = calculateLevel(newXp);
        
        let newInventory = state.inventory; let newVouchers = state.vouchers; let newClaimed = [...(state.claimedMilestones || [])]; let levelUpInfo = null;

        if (newLevel > state.level) {
          let luckyCardsToAdd = 0; let hasReward = false;
          for (let l = state.level + 1; l <= newLevel; l++) { if (l % 5 === 0) luckyCardsToAdd++; if (l >= 25) luckyCardsToAdd++; }
          if (luckyCardsToAdd > 0) { newInventory = { ...state.inventory, luckyCard: state.inventory.luckyCard + luckyCardsToAdd }; hasReward = true; }
          levelUpInfo = { level: newLevel, hasReward };
        }

        if (newLevel >= 15 && !newClaimed.includes(15)) { newVouchers += 15; newClaimed.push(15); }
        if (newLevel >= 50 && !newClaimed.includes(50)) { newVouchers += 40; newClaimed.push(50); }

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const currentHistory = state.dailyHistory[todayStr] || { xp: 0, gold: 0 };

        return { xp: newXp, level: newLevel, gold: state.gold + finalGold, inventory: newInventory, vouchers: newVouchers, claimedMilestones: newClaimed, ...(levelUpInfo ? { levelUpData: levelUpInfo } : {}), dailyHistory: { ...state.dailyHistory, [todayStr]: { ...currentHistory, xp: currentHistory.xp + finalXp, gold: currentHistory.gold + finalGold } }, updatedAt: Date.now() };
      }),

      removeReward: (finalXp, finalGold) => set((state) => {
        const newXp = Math.max(0, state.xp - finalXp); const newGold = Math.max(0, state.gold - finalGold); const newLevel = calculateLevel(newXp);
        let newInventory = state.inventory;
        if (newLevel < state.level) {
          let lostItems = 0;
          for (let l = state.level; l > newLevel; l--) { if (l % 5 === 0) lostItems++; if (l >= 25) lostItems++; }
          if (lostItems > 0) { newInventory = { ...state.inventory, luckyCard: Math.max(0, state.inventory.luckyCard - lostItems) }; }
        }
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const currentHistory = state.dailyHistory[todayStr] || { xp: 0, gold: 0 };
        return { xp: newXp, level: newLevel, gold: newGold, inventory: newInventory, dailyHistory: { ...state.dailyHistory, [todayStr]: { ...currentHistory, xp: Math.max(0, currentHistory.xp - finalXp), gold: Math.max(0, currentHistory.gold - finalGold) } }, updatedAt: Date.now() };
      }),

      applyPenalty: (baseXp, baseGold) => set((state) => {
        const currentLevelBaseXp = Math.pow(state.level - 1, 2) * 100;
        const newXp = Math.max(currentLevelBaseXp, state.xp - baseXp);
        const actualLostXp = state.xp - newXp; 
        const newGold = Math.max(0, state.gold - baseGold);
        const actualLostGold = state.gold - newGold;

        if (actualLostXp === 0 && actualLostGold === 0) return state;

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const currentHistory = state.dailyHistory[todayStr] || { xp: 0, gold: 0 };
        return { xp: newXp, gold: newGold, dailyHistory: { ...state.dailyHistory, [todayStr]: { ...currentHistory, lostXp: (currentHistory.lostXp || 0) + actualLostXp, lostGold: (currentHistory.lostGold || 0) + actualLostGold } }, updatedAt: Date.now() };
      }),

      addVouchers: (amount) => set((state) => ({ vouchers: state.vouchers + amount, updatedAt: Date.now() })),
      spendVouchers: (amount) => {
        const state = get();
        if (state.vouchers >= amount) { set({ vouchers: state.vouchers - amount, updatedAt: Date.now() }); return true; }
        return false;
      },
      addVoucherProgress: () => set((state) => {
        const newProgress = state.voucherProgress + 1;
        if (newProgress >= 3) return { voucherProgress: 0, vouchers: state.vouchers + 1, updatedAt: Date.now() };
        return { voucherProgress: newProgress, updatedAt: Date.now() };
      }),
      removeVoucherProgress: () => set((state) => {
        if (state.voucherProgress > 0) return { voucherProgress: state.voucherProgress - 1, updatedAt: Date.now() };
        if (state.vouchers > 0) return { vouchers: state.vouchers - 1, voucherProgress: 2, updatedAt: Date.now() };
        return { updatedAt: Date.now() }; 
      }),

      buyItem: (item, cost, currency) => { const state = get(); if (state[currency] >= cost) { set({ [currency]: state[currency] - cost, inventory: { ...state.inventory, [item]: state.inventory[item] + 1 }, updatedAt: Date.now() }); return true; } return false; },
      useItem: (item) => { const state = get(); if (state.inventory[item] > 0) { set({ inventory: { ...state.inventory, [item]: state.inventory[item] - 1 }, updatedAt: Date.now() }); return true; } return false; },
      setBoost: (type, hours) => { const until = Date.now() + hours * 60 * 60 * 1000; set(() => ({ ...(type === 'xp' ? { activeXpBoostUntil: until } : { activeGoldBoostUntil: until }), updatedAt: Date.now() })); },
    })),
    { name: 'lida-economy-v3', storage: appStorage }
  )
);