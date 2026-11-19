// Simulação do modo demo (debug): avança o relógio dia a dia e "vive" cada dia com as funções de
// verdade do app — cria tarefas, conclui a maioria, cumpre hábitos, bebe água, marca o humor —, e a
// virada de cada dia fecha IPL, meses e anos como no uso real. Só existe no modo demo.
import { personal, P } from '../state.js';
import { today, shiftDays } from '../lib/clock.js';
import { processDays, addTask, toggleTask } from './tasks.js';
import { setCount, addWater, isScheduled, isDone, waterGoal, waterGlass, waterToday } from './habits.js';
import { recordGoalTime, dayProgress } from './streak.js';

const TITLES = ['Responder e-mails', 'Revisar o orçamento', 'Ligar para o fornecedor', 'Ler um artigo', 'Organizar a caixa de entrada', 'Preparar a reunião', 'Lavar a louça', 'Fazer compras', 'Escrever o relatório', 'Atualizar a planilha', 'Pagar contas', 'Estudar 30 minutos', 'Arrumar o quarto', 'Planejar a semana', 'Revisar o código', 'Passear com o cachorro', 'Separar roupas', 'Marcar consulta'];
const PRI = ['P2', 'P3', 'P3', 'P4', 'P4', 'P1'];
const MOODS = ['radiant', 'happy', 'happy', 'normal', 'normal', 'annoyed', 'disappointed'];

// ritmo: chance de cumprir cada coisa no dia. Impecável: tudo cumprido, todo dia (ofensiva sem quebra).
export const PACES = { impecavel: { label: 'Impecável', p: 1, perfect: true }, bom: { label: 'Bom', p: 0.88 }, medio: { label: 'Médio', p: 0.65 }, fraco: { label: 'Fraco', p: 0.4 } };

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export async function simulateDays(n = 30, { pace = 'bom', onProgress } = {}) {
  const pc = PACES[pace] || PACES.bom;
  const p = pc.p;
  const out = { days: 0, tasks: 0, done: 0, habits: 0 };
  for (let i = 0; i < n; i++) {
    shiftDays(1);
    await processDays();
    const d = today();
    // Dia "ruim" de vez em quando, mesmo no ritmo bom; dia ótimo de vez em quando no fraco.
    const q = pc.perfect ? 1 : Math.random() < 0.12 ? p * 0.5 : Math.random() < 0.12 ? Math.min(1, p + 0.3) : p;
    const S = P();
    const projects = S.project.filter((x) => !x.archived);
    const k = 3 + Math.floor(Math.random() * 4);
    for (let j = 0; j < k; j++) {
      const id = await addTask({ title: pick(TITLES), priority: pick(PRI), due: d, projectId: projects.length && Math.random() < 0.5 ? pick(projects).id : undefined });
      out.tasks++;
      if (id && Math.random() < q) {
        await toggleTask(id);
        out.done++;
      }
    }
    for (const h of P().habit) {
      if (h.archived || !isScheduled(h, d) || isDone(P(), h, d)) continue;
      if (Math.random() < q) {
        await setCount(h, h.goal || 1, d);
        out.habits++;
      }
    }
    if (Math.random() < q) {
      const goal = waterGoal(P());
      const glass = waterGlass(P()) || 250;
      const target = pc.perfect || Math.random() < 0.8 ? goal : goal * 0.6;
      while (waterToday(P(), d) < target) await addWater(glass, d);
    }
    // horário em que a meta da ofensiva veio (para a média): entre 10h e 21h, mais cedo nos dias bons
    if (dayProgress(P(), d).state === 'met') await recordGoalTime(d, (10 + Math.round((1 - q) * 6 + Math.random() * 5)) * 60 + Math.floor(Math.random() * 60));
    if (Math.random() < 0.85) await personal.save('mood', { date: d, mood: q > 0.75 ? pick(MOODS.slice(0, 4)) : pick(MOODS.slice(2)) }, `md_${d}`);
    if (Math.random() < q * 0.6) await personal.save('ev', { kind: 'focus', date: d, focusSec: 1500 * (1 + Math.floor(Math.random() * 3)) }, `ev_sim_focus_${d}`);
    out.days++;
    onProgress?.(i + 1, n);
  }
  return out;
}
