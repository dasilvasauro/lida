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

  addReward: (baseXp: number, baseGold: number) => void;
  removeReward: (baseXp: number, baseGold: number) => void; // <-- Nova
  addVouchers: (amount: number) => void;
  addVoucherProgress: () => void;
  removeVoucherProgress: () => void; // <-- Nova
  buyItem: (item: EconomyItem, cost: number, currency: 'gold' | 'vouchers') => boolean;
  useItem: (item: EconomyItem) => boolean;
  setBoost: (type: 'xp' | 'gold', hours: number) => void;
}

const calculateLevel = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;

export const useEconomyStore = create<EconomyState>()(
  persist(
    (set, get) => ({
      xp: 0, level: 1, gold: 1500, vouchers: 20, voucherProgress: 0,
      inventory: { freeze: 0, dayOff: 0, instantLuck: 0, magicDice: 0, xpBoost: 0, goldBoost: 0, extraP0: 0, extraP1: 0, respite: 0, relief: 0, bonusTask: 0, luckyCard: 0 },
      activeXpBoostUntil: null, activeGoldBoostUntil: null,
      dailyHistory: {},

      addReward: (baseXp, baseGold) => set((state) => {
        const isXpBoosted = state.activeXpBoostUntil && Date.now() < state.activeXpBoostUntil;
        const isGoldBoosted = state.activeGoldBoostUntil && Date.now() < state.activeGoldBoostUntil;
        const xpMultiplier = isXpBoosted ? 1 + (Math.random() * 0.35 + 0.15) : 1;
        const goldMultiplier = isGoldBoosted ? 1 + (Math.random() * 0.20 + 0.25) : 1;

        const finalXp = Math.round(baseXp * xpMultiplier);
        const finalGold = Math.round(baseGold * goldMultiplier);
        const newXp = state.xp + finalXp;
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const currentHistory = state.dailyHistory[todayStr] || { xp: 0, gold: 0 };

        return { xp: newXp, level: calculateLevel(newXp), gold: state.gold + finalGold, dailyHistory: { ...state.dailyHistory, [todayStr]: { xp: currentHistory.xp + finalXp, gold: currentHistory.gold + finalGold } } };
      }),

      // Reverte os ganhos caso o usuário desmarque a tarefa
      removeReward: (baseXp, baseGold) => set((state) => {
        const newXp = Math.max(0, state.xp - baseXp);
        const newGold = Math.max(0, state.gold - baseGold);
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const currentHistory = state.dailyHistory[todayStr] || { xp: 0, gold: 0 };

        return { xp: newXp, level: calculateLevel(newXp), gold: newGold, dailyHistory: { ...state.dailyHistory, [todayStr]: { xp: Math.max(0, currentHistory.xp - baseXp), gold: Math.max(0, currentHistory.gold - baseGold) } } };
      }),

      addVouchers: (amount) => set((state) => ({ vouchers: state.vouchers + amount })),
      addVoucherProgress: () => set((state) => {
        const newProgress = state.voucherProgress + 1;
        if (newProgress >= 3) return { voucherProgress: 0, vouchers: state.vouchers + 1 };
        return { voucherProgress: newProgress };
      }),

      // Reverte o progresso do voucher e até remove saldo se necessário
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