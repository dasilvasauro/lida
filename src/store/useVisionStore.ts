import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appStorage } from '../lib/storage';
import type { Vision, GoalState } from '../types';
import { format, addDays, endOfMonth, differenceInDays } from 'date-fns';

interface VisionState {
  vision: Vision | null;
  updatedAt?: number;
  setVision: (vision: Vision) => void;
  updateGoalState: (goalId: string, newState: GoalState) => void;
  checkAndGenerateCheckpoints: () => void;
}

export const useVisionStore = create<VisionState>()(
  persist(
    (set, get) => ({
      vision: null,
      updatedAt: 0,
      setVision: (vision) => set({ vision, updatedAt: Date.now() }),
      updateGoalState: (goalId, newState) => set((state) => {
        if (!state.vision) return state;
        return {
          vision: {
            ...state.vision,
            goals: state.vision.goals.map((g) => g.id === goalId ? { ...g, state: newState } : g)
          },
          updatedAt: Date.now()
        };
      }),
      checkAndGenerateCheckpoints: () => {
                const { vision } = get();
                if (!vision) return;
                
                const checkpoints = vision.checkpoints || []; // Lida com o undefined
                const today = format(new Date(), 'yyyy-MM-dd');
                const futureCheckpoints = checkpoints.filter((cp: string) => cp >= today);
                
                if (futureCheckpoints.length > 0) return;

        // Caso contrário, gera 3 novos checkpoints até o fim do mês
        const now = new Date();
        const eom = endOfMonth(now);
        const diff = differenceInDays(eom, now);
        
        let cp1, cp2, cp3;
        if (diff < 3) {
           // Se estivermos nos últimos 3 dias do mês, projeta para o próximo mês
           cp1 = addDays(now, 10);
           cp2 = addDays(now, 20);
           cp3 = addDays(now, 30);
        } else {
           // Divide os dias restantes do mês por 3
           const step = Math.floor(diff / 3);
           cp1 = addDays(now, step);
           cp2 = addDays(now, step * 2);
           cp3 = eom;
        }

        set({
          vision: {
            ...vision,
            checkpoints: [format(cp1, 'yyyy-MM-dd'), format(cp2, 'yyyy-MM-dd'), format(cp3, 'yyyy-MM-dd')]
          },
          updatedAt: Date.now()
        });
      }
    }),
    { name: 'lida-vision', storage: appStorage }
  )
);
