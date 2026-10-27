import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// === POMODORO ===
// Store própria, fora da useTaskStore: o tique de 1s não regrava as tarefas,
// não re-renderiza os componentes de tarefas e não interfere no sync da nuvem
// (esta store não é sincronizada).
//
// O tempo é calculado a partir de um horário de término (endsAt), não contando
// tiques. Assim o timer continua certo mesmo com a aba em segundo plano, a tela
// do celular desligada ou o app recarregado.

export type PomodoroMode = 'focus' | 'break';

export interface PomodoroTickResult {
  rang: boolean;
  vouchers: number;
}

interface PomodoroState {
  isOpen: boolean;
  isMinimized: boolean;
  isActive: boolean;
  mode: PomodoroMode;
  timeLeft: number;            // segundos restantes (para exibição)
  endsAt: number | null;       // timestamp do fim do ciclo atual, se ativo
  lastTickAt: number | null;   // último instante já contabilizado no acumulador
  focusDuration: number;       // minutos
  breakDuration: number;       // minutos
  accumulatedSeconds: number;  // tempo de foco acumulado para o próximo voucher
  soundEnabled: boolean;

  open: () => void;
  close: () => void;
  setMinimized: (value: boolean) => void;
  toggleRunning: () => void;
  reset: () => void;
  setFocusDuration: (minutes: number) => void;
  setBreakDuration: (minutes: number) => void;
  toggleSound: () => void;
  tick: (now?: number) => PomodoroTickResult;
}

const VOUCHER_SECONDS = 3600;

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isMinimized: false,
      isActive: false,
      mode: 'focus',
      timeLeft: 25 * 60,
      endsAt: null,
      lastTickAt: null,
      focusDuration: 25,
      breakDuration: 5,
      accumulatedSeconds: 0,
      soundEnabled: true,

      open: () => set({ isOpen: true, isMinimized: false }),
      close: () => set({ isOpen: false }),
      setMinimized: (isMinimized) => set({ isMinimized }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

      toggleRunning: () => {
        const s = get();
        const now = Date.now();
        if (s.isActive) {
          // Pausa: contabiliza o foco até agora e congela o tempo restante.
          get().tick(now);
          const after = get();
          if (!after.isActive) return; // o ciclo terminou exatamente agora
          set({ isActive: false, endsAt: null, lastTickAt: null, timeLeft: after.endsAt ? Math.max(0, Math.ceil((after.endsAt - now) / 1000)) : after.timeLeft });
        } else {
          set({ isActive: true, endsAt: now + s.timeLeft * 1000, lastTickAt: now });
        }
      },

      reset: () => set((s) => ({ isActive: false, mode: 'focus', endsAt: null, lastTickAt: null, timeLeft: s.focusDuration * 60 })),

      setFocusDuration: (minutes) => set((s) => ({ focusDuration: minutes, timeLeft: s.mode === 'focus' && !s.isActive ? minutes * 60 : s.timeLeft })),
      setBreakDuration: (minutes) => set((s) => ({ breakDuration: minutes, timeLeft: s.mode === 'break' && !s.isActive ? minutes * 60 : s.timeLeft })),

      // Função sem efeitos colaterais além do próprio estado: quem chama decide
      // tocar som ou creditar vouchers a partir do resultado.
      tick: (now = Date.now()) => {
        const s = get();
        if (!s.isActive || !s.endsAt) return { rang: false, vouchers: 0 };

        let mode = s.mode;
        let endsAt: number = s.endsAt;
        let last = s.lastTickAt ?? now;
        let acc = s.accumulatedSeconds;
        let active = true;
        let rang = false;

        // Recupera ciclos que terminaram enquanto o app estava em segundo plano.
        while (active && now >= endsAt) {
          if (mode === 'focus') acc += Math.max(0, endsAt - last) / 1000;
          last = endsAt;
          rang = true;
          if (mode === 'focus') {
            mode = 'break';
            endsAt = endsAt + s.breakDuration * 60 * 1000;
          } else {
            mode = 'focus';
            active = false;
          }
        }

        if (active) {
          if (mode === 'focus') acc += Math.max(0, now - last) / 1000;
          last = now;
        }

        let vouchers = 0;
        while (acc >= VOUCHER_SECONDS) { acc -= VOUCHER_SECONDS; vouchers++; }

        set({
          mode,
          isActive: active,
          endsAt: active ? endsAt : null,
          lastTickAt: active ? last : null,
          accumulatedSeconds: acc,
          timeLeft: active ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : s.focusDuration * 60,
        });

        return { rang, vouchers };
      },
    }),
    { name: 'lida-pomodoro' }
  )
);
