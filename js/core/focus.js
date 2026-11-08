// Foco global: qual tarefa está em foco agora e o estado dos cronômetros (Pomodoro e modo foco
// das tarefas com tempo). Fica num registro sincronizado ("focus"), então começar um Pomodoro no
// computador aparece no celular (e vice-versa) e o widget do KDE / a CLI enxergam o mesmo estado.
//
// Os cronômetros guardam a HORA DE TÉRMINO (endsAt), não tiques: qualquer aparelho calcula o
// tempo restante sozinho. Cada mudança leva quem mudou (by) e quando (at).
import { personal, P, app } from '../state.js';
import { nowMs } from '../lib/clock.js';
import { strip } from './game.js';

export const FOCUS_ID = 'focus';
export const POMO_DEF = { mode: 'focus', running: false, endsAt: 0, left: 25 * 60, focusMin: 25, breakMin: 5 };

export const focusOf = (S = P()) => S.focus || null;

// Tarefa em foco (ou null se não há, ou se ela foi concluída/excluída).
export function focusedTask(S = P()) {
  const f = focusOf(S);
  if (!f?.taskId) return null;
  const t = S.byId.get(f.taskId);
  return t && !t.done && !t.failed && !t.archived ? t : null;
}

export async function saveFocus(patch) {
  const prev = personal.get(FOCUS_ID);
  const data = { ...(prev ? strip(prev) : {}), ...patch, by: app.device || 'local', at: nowMs() };
  for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];
  await personal.save('focus', data, FOCUS_ID);
  return data;
}

// Põe uma tarefa em foco (since = desde quando). null tira o foco.
export function setFocus(taskId) {
  if (!taskId) return saveFocus({ taskId: null, since: null, task: null });
  const cur = focusOf();
  if (cur?.taskId === taskId) return Promise.resolve(cur);
  return saveFocus({ taskId, since: nowMs(), task: null });
}

// Resumo pronto para a notificação, o widget e a CLI.
export function focusSummary(S = P(), now = nowMs()) {
  const f = focusOf(S) || {};
  const t = focusedTask(S);
  const pomo = { ...POMO_DEF, ...(f.pomo || {}) };
  const pomoLeft = pomo.running ? Math.max(0, Math.round((pomo.endsAt - now) / 1000)) : pomo.left;
  const tk = f.task?.taskId && t?.id === f.task.taskId ? f.task : null;
  const taskLeft = tk ? Math.round(tk.running ? (tk.endsAt - now) / 1000 : tk.left) : null;
  return {
    task: t ? { id: t.id, title: t.title, priority: t.priority, due: t.due || null } : null,
    since: t ? f.since || null : null,
    pomo: { ...pomo, leftSec: pomoLeft, active: pomo.running || pomoLeft !== (pomo.mode === 'focus' ? pomo.focusMin : pomo.breakMin) * 60 },
    timer: tk ? { running: !!tk.running, endsAt: tk.endsAt || null, leftSec: taskLeft, total: tk.total } : null,
    by: f.by || null,
    at: f.at || null,
  };
}
