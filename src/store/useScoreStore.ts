import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { DailyScore, MonthlyArchive, ScoreGrade } from '../types';

const obfuscatedStorage: StateStorage = {
  getItem: (name) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    try { JSON.parse(str); return str; } catch { try { return decodeURIComponent(atob(str)); } catch { return null; } }
  },
  setItem: (name, value) => { localStorage.setItem(name, btoa(encodeURIComponent(value))); },
  removeItem: (name) => localStorage.removeItem(name),
};

export const calculateGrade = (score: number): ScoreGrade => {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 66) return 'D+';
  if (score >= 60) return 'D';
  if (score >= 57) return 'D-';
  if (score >= 53) return 'E+';
  if (score >= 50) return 'E';
  if (score >= 45) return 'E-';
  return 'F';
};

export const getGradeMessage = (grade: ScoreGrade): string => {
  const messages: Record<ScoreGrade, string> = {
    'A+': 'Parabéns, nesse ritmo você conquistará todos os seus objetivos 💪',
    'A': 'Excelente. Você está no controle quase total do seu tempo.',
    'A-': 'Muito bom. Pequenos deslizes, mas uma consistência admirável.',
    'B+': 'Bom trabalho. Você está acima da média, mas pode refinar.',
    'B': 'Sólido. Produtividade funcional, mas sem grande tração.',
    'B-': 'Razoável. Você está fazendo o mínimo necessário.',
    'C+': 'Atenção. A procrastinação está começando a vencer.',
    'C': 'Medíocre. Muitas pontas soltas e prazos perdidos.',
    'C-': 'Perigoso. Seu sistema de organização está falhando.',
    'D+': 'Cuidado, está prestes a perder o controle.',
    'D': 'Ruim. Você perdeu o controle sobre a sua rotina.',
    'D-': 'Dá tempo de recuperar, se organize e produza!',
    'E+': 'Não caia na inércia. Tome controle da sua vida',
    'E': 'Dessa forma você não vai atrair coisas boas para sua vida.',
    'E-': 'Você está tentando, pelo menos?.',
    'F': 'Caos total. É hora de parar tudo e recalibrar sua vida.'
  };
  return messages[grade];
};

interface ScoreState {
  dailyScores: DailyScore[];
  monthlyArchives: MonthlyArchive[];
  isInitialSetupDone: boolean;
  
  setInitialSetupDone: () => void;
  recordDailyScore: (dateStr: string, score: number, tasksDone: number, habitsDone: number, penalties: number) => void;
  archiveMonth: (monthStr: string) => void;
  getCurrentMonthScore: () => number;
}

export const useScoreStore = create<ScoreState>()(
  persist(
    (set, get) => ({
      dailyScores: [],
      monthlyArchives: [],
      isInitialSetupDone: false,

      setInitialSetupDone: () => set({ isInitialSetupDone: true }),

      recordDailyScore: (dateStr, rawScore, tasksDone, habitsDone, penalties) => set((state) => {
        const score = Math.max(0, Math.min(100, Math.round(rawScore))); // Trava entre 0 e 100
        const existingIndex = state.dailyScores.findIndex(d => d.date === dateStr);
        const newScores = [...state.dailyScores];
        
        if (existingIndex >= 0) {
           newScores[existingIndex] = { date: dateStr, score, tasksDone, habitsDone, penalties };
        } else {
           newScores.push({ date: dateStr, score, tasksDone, habitsDone, penalties });
        }
        
        return { dailyScores: newScores };
      }),

      getCurrentMonthScore: () => {
        const scores = get().dailyScores;
        if (scores.length === 0) return 100; // Base inicial para não desmotivar no dia 1
        const total = scores.reduce((acc, curr) => acc + curr.score, 0);
        return Math.round(total / scores.length);
      },

      archiveMonth: (monthStr) => set((state) => {
        const monthScores = state.dailyScores.filter(d => d.date.startsWith(monthStr));
        if (monthScores.length === 0) return state; // Nada para arquivar
        
        const finalScore = Math.round(monthScores.reduce((acc, curr) => acc + curr.score, 0) / monthScores.length);
        const grade = calculateGrade(finalScore);
        
        const newArchives = [...state.monthlyArchives, { month: monthStr, finalScore, grade }];
        // Limpa os registros granulares do mês arquivado para poupar processamento
        const newDaily = state.dailyScores.filter(d => !d.date.startsWith(monthStr));
        
        return { monthlyArchives: newArchives, dailyScores: newDaily };
      })
    }),
    { name: 'lida-scores', storage: createJSONStorage(() => obfuscatedStorage) }
  )
);
