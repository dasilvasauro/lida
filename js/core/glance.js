// Resumo do dia "de relance": o que os widgets (Android e, depois, KDE) e a CLI mostram.
// Os anéis: tarefas do dia concluídas, hábitos programados feitos e água sobre a meta.
import { buckets } from './tasks.js';
import { isScheduled, isDone, waterToday, waterGoal } from './habits.js';
import { focusSummary } from './focus.js';
import { today } from '../lib/clock.js';

export function glance(S, day = today()) {
  const B = buckets(S, day);
  const hs = S.habit.filter((h) => !h.archived && isScheduled(h, day));
  return {
    date: day,
    tasks: { done: B.doneToday.length, total: B.today.length + B.doneToday.length, overdue: B.overdue.length, inbox: B.inbox.length },
    habits: { done: hs.filter((h) => isDone(S, h, day)).length, total: hs.length },
    water: { ml: waterToday(S, day), goal: waterGoal(S) },
    focus: focusSummary(S),
  };
}
