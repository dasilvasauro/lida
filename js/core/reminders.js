// O que deveria estar agendado agora: lembretes de tarefas, resumo da manhã, fechamento do dia
// e água. notify.reconcile() compara com o que já está agendado e só envia a diferença.
import { taskOpen, PRIORITIES } from './model.js';
import { buckets, byPriority } from './tasks.js';
import { waterToday, waterGoal, isScheduled, isDone } from './habits.js';
import { today, nowMs } from '../lib/clock.js';
import { addDays, fmtTime, relDay, plural } from '../lib/util.js';

const at = (day, hhmm) => {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = (hhmm || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
};
const L = (ml) => (ml >= 1000 ? `${(ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L` : `${ml} ml`);
const PNAME = Object.fromEntries(PRIORITIES.map((p) => [p.id, p.name]));

export function reminders(S, prefs) {
  const out = [];
  const d0 = today();
  const projects = new Map(S.project.map((p) => [p.id, p.name]));

  if (prefs.tasks) {
    for (const t of S.task) {
      if (!taskOpen(t) || !t.due || !t.time) continue;
      const where = projects.get(t.projectId);
      const body = `${relDay(t.due)} às ${fmtTime(t.time)}${where ? ` · ${where}` : ''}`;
      const subs = t.subtasks || [];
      const extra = [t.priority && t.priority !== 'P4' ? `Prioridade ${PNAME[t.priority].toLowerCase()}` : '', subs.length ? `${subs.filter((x) => x.done).length} de ${subs.length} subtarefas feitas` : '', t.notes ? t.notes.replace(/\s+/g, ' ').slice(0, 160) : ''].filter(Boolean);
      out.push({
        key: `task:${t.id}`,
        at: at(t.due, t.time) - (t.remindBefore || 0) * 60000,
        title: t.title,
        body,
        long: [body, ...extra].join('\n'),
        summary: 'Tarefas',
        group: 'tarefas',
        actions: 'TASK',
        route: `tarefa-${t.id}`,
        extra: { taskId: t.id },
      });
    }
  }

  if (prefs.morning && prefs.morningAt) {
    for (let i = 0; i < 14; i++) {
      const day = addDays(d0, i);
      const list = S.task.filter((t) => taskOpen(t) && t.due === day).sort(byPriority);
      const timed = list.filter((t) => t.time).sort((a, b) => a.time.localeCompare(b.time))[0];
      const body = list.length ? `${plural(list.length, 'tarefa', 'tarefas')} para hoje${timed ? `, a primeira às ${fmtTime(timed.time)}` : ''}.` : 'Nenhuma tarefa marcada. Que tal planejar o dia?';
      out.push({
        key: `morning:${day}`,
        at: at(day, prefs.morningAt),
        title: 'Bom dia! Seu dia no Lida',
        body,
        long: list.length ? [body, ...list.slice(0, 5).map((t) => `• ${t.title}`), list.length > 5 ? `e mais ${list.length - 5}` : ''].filter(Boolean).join('\n') : body,
        summary: 'Resumo da manhã',
        route: 'hoje',
      });
    }
  }

  if (prefs.daily && prefs.dailyAt) {
    const B = buckets(S, d0);
    const total = B.today.length + B.doneToday.length;
    const pend = S.habit.filter((h) => !h.archived && isScheduled(h, d0) && !isDone(S, h, d0)).length;
    for (let i = 0; i < 14; i++) {
      const day = addDays(d0, i);
      const body =
        i === 0 && (total || pend)
          ? [total ? `${B.doneToday.length} de ${plural(total, 'tarefa concluída', 'tarefas concluídas')}` : '', pend ? `${plural(pend, 'hábito pendente', 'hábitos pendentes')}` : ''].filter(Boolean).join(' · ')
          : 'Revise o que ficou pendente e deixe amanhã planejado.';
      out.push({ key: `daily:${day}`, at: at(day, prefs.dailyAt), title: 'Como foi o seu dia?', body, long: i === 0 && B.today.length ? `${body}\nAinda dá tempo: ${B.today.slice(0, 3).map((t) => t.title).join(', ')}.` : body, summary: 'Fechamento do dia', route: 'hoje' });
    }
  }

  if (prefs.water) {
    const goal = waterGoal(S);
    const step = Math.max(1, prefs.waterEvery || 2) * 60;
    const [fh, fm] = (prefs.waterFrom || '09:00').split(':').map(Number);
    const [th, tm] = (prefs.waterTo || '21:00').split(':').map(Number);
    for (let i = 0; i < 3; i++) {
      const day = addDays(d0, i);
      const have = i === 0 ? waterToday(S, day) : 0;
      if (have >= goal) continue;
      for (let min = fh * 60 + fm; min <= th * 60 + tm; min += step) {
        const hhmm = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
        out.push({ key: `water:${day}:${hhmm}`, at: at(day, hhmm), title: 'Hora de um copo d’água', body: i === 0 && have ? `Você está em ${L(have)} de ${L(goal)}.` : `Meta de hoje: ${L(goal)}.`, summary: 'Água', group: 'agua', actions: 'WATER', route: 'habitos' });
      }
    }
  }
  return out.filter((x) => x.at > nowMs());
}
