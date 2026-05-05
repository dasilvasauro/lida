import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';

export type EconomyItem = 
  | 'freeze' | 'dayOff' | 'instantLuck'
  | 'magicDice' | 'xpBoost' | 'goldBoost' | 'extraP0' | 'extraP1' | 'respite' | 'relief' | 'bonusTask' | 'luckyCard';

interface EconomyState {
  xp: number;
  level: number;
  gold: number;
  vouchers: number;
  voucherProgress: number;
  inventory: Record<EconomyItem, number>;
  activeXpBoostUntil: number | null;
  activeGoldBoostUntil: number | null;
  dailyHistory: Record<string, { xp: number; gold: number }>;
  
  levelUpData: { level: number; hasReward: boolean } | null;
  claimedMilestones: number[]; // Rastreia as recompensas únicas (níveis 15 e 50)

  addReward: (baseXp: number, baseGold: number) => void;
  removeReward: (baseXp: number, baseGold: number) => void; 
  addVouchers: (amount: number) => void;
  addVoucherProgress: () => void;
  removeVoucherProgress: () => void; 
  buyItem: (item: EconomyItem, cost: number, currency: 'gold' | 'vouchers') => boolean;
  useItem: (item: EconomyItem) => boolean;
  setBoost: (type: 'xp' | 'gold', hours: number) => void;
  clearLevelUp: () => void;
}

const calculateLevel = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;

export const useEconomyStore = create<EconomyState>()(
  persist(
    (set, get) => ({
      xp: 0, level: 1, gold: 1500, vouchers: 20, voucherProgress: 0,
      inventory: { freeze: 0, dayOff: 0, instantLuck: 0, magicDice: 0, xpBoost: 0, goldBoost: 0, extraP0: 0, extraP1: 0, respite: 0, relief: 0, bonusTask: 0, luckyCard: 0 },
      activeXpBoostUntil: null, activeGoldBoostUntil: null,
      dailyHistory: {},
      levelUpData: null,
      claimedMilestones: [],

      clearLevelUp: () => set({ levelUpData: null }),

      addReward: (baseXp, baseGold) => set((state) => {
        const isXpBoosted = state.activeXpBoostUntil && Date.now() < state.activeXpBoostUntil;
        const isGoldBoosted = state.activeGoldBoostUntil && Date.now() < state.activeGoldBoostUntil;
        const xpMultiplier = isXpBoosted ? 1 + (Math.random() * 0.35 + 0.15) : 1;
        const goldMultiplier = isGoldBoosted ? 1 + (Math.random() * 0.20 + 0.25) : 1;

        const finalXp = Math.round(baseXp * xpMultiplier);
        const finalGold = Math.round(baseGold * goldMultiplier);
        const newXp = state.xp + finalXp;
        const newLevel = calculateLevel(newXp);
        
        let newInventory = state.inventory;
        let newVouchers = state.vouchers;
        let newClaimed = [...(state.claimedMilestones || [])];
        let levelUpInfo = null;

        if (newLevel > state.level) {
          let luckyCardsToAdd = 0;
          let hasReward = false;

          for (let l = state.level + 1; l <= newLevel; l++) {
            // A cada 5 níveis
            if (l % 5 === 0) luckyCardsToAdd++;
            // A partir do nível 25 ganha uma em TODO nível (se for múltiplo de 5, ganha as duas!)
            if (l >= 25) luckyCardsToAdd++;
          }

          if (luckyCardsToAdd > 0) {
            newInventory = { ...state.inventory, luckyCard: state.inventory.luckyCard + luckyCardsToAdd };
            hasReward = true;
          }
          levelUpInfo = { level: newLevel, hasReward };
        }

        // CHECAGEM DE MARCOS ÚNICOS (Retroativa, se a pessoa upar e bater o nível)
        if (newLevel >= 15 && !newClaimed.includes(15)) {
          newVouchers += 15;
          newClaimed.push(15);
        }
        if (newLevel >= 50 && !newClaimed.includes(50)) {
          newVouchers += 40;
          newClaimed.push(50);
        }

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const currentHistory = state.dailyHistory[todayStr] || { xp: 0, gold: 0 };

        return { 
          xp: newXp, 
          level: newLevel, 
          gold: state.gold + finalGold, 
          inventory: newInventory,
          vouchers: newVouchers,
          claimedMilestones: newClaimed,
          ...(levelUpInfo ? { levelUpData: levelUpInfo } : {}),
          dailyHistory: { ...state.dailyHistory, [todayStr]: { xp: currentHistory.xp + finalXp, gold: currentHistory.gold + finalGold } } 
        };
      }),

      removeReward: (baseXp, baseGold) => set((state) => {
        const newXp = Math.max(0, state.xp - baseXp);
        const newGold = Math.max(0, state.gold - baseGold);
        const newLevel = calculateLevel(newXp);
        
        let newInventory = state.inventory;
        
        // ANTI-TRAPAÇA para as novas recompensas
        if (newLevel < state.level) {
          let lostItems = 0;
          for (let l = state.level; l > newLevel; l--) {
            if (l % 5 === 0) lostItems++;
            if (l >= 25) lostItems++;
          }
          if (lostItems > 0) {
            newInventory = { ...state.inventory, luckyCard: Math.max(0, state.inventory.luckyCard - lostItems) };
          }
        }

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const currentHistory = state.dailyHistory[todayStr] || { xp: 0, gold: 0 };

        return { 
          xp: newXp, 
          level: newLevel, 
          gold: newGold, 
          inventory: newInventory,
          dailyHistory: { ...state.dailyHistory, [todayStr]: { xp: Math.max(0, currentHistory.xp - baseXp), gold: Math.max(0, currentHistory.gold - baseGold) } } 
        };
      }),

      addVouchers: (amount) => set((state) => ({ vouchers: state.vouchers + amount })),
      addVoucherProgress: () => set((state) => {
        const newProgress = state.voucherProgress + 1;
        if (newProgress >= 3) return { voucherProgress: 0, vouchers: state.vouchers + 1 };
        return { voucherProgress: newProgress };
      }),
      removeVoucherProgress: () => set((state) => {
        if (state.voucherProgress > 0) return { voucherProgress: state.voucherProgress - 1 };
        if (state.vouchers > 0) return { vouchers: state.vouchers - 1, voucherProgress: 2 };
        return state; 
      }),

      buyItem: (item, cost, currency) => {
        const state = get();
        if (state[currency] >= cost) {
          set({ [currency]: state[currency] - cost, inventory: { ...state.inventory, [item]: state.inventory[item] + 1 } });
          return true;
        }
        return false;
      },
      useItem: (item) => {
        const state = get();
        if (state.inventory[item] > 0) {
          set({ inventory: { ...state.inventory, [item]: state.inventory[item] - 1 } });
          return true;
        }
        return false;
      },
      setBoost: (type, hours) => {
        const until = Date.now() + hours * 60 * 60 * 1000;
        set(() => ({ ...(type === 'xp' ? { activeXpBoostUntil: until } : { activeGoldBoostUntil: until }) }));
      },
    }),
    { name: 'lida-economy-v3' }
  )
);