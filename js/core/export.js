// Exportar em formatos abertos (sem cifra, para levar os dados para outro lugar):
//   CSV  tarefas (abre em qualquer planilha) e o registro dos hábitos dia a dia
//   JSON tudo: tarefas, projetos, etiquetas, hábitos e registros, rotinas, água, humor, notas do dia,
//        visão, reflexões, Esvaziar a mente, desapego e o histórico de XP e ouro
// O backup .lida continua sendo o jeito de restaurar no Lida; estes arquivos são para fora dele.
import { t } from './i18n.js';

const cell = (v) => {
  const s = v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (arr) => arr.map(cell).join(',');
const iso = (ms) => (ms ? new Date(ms).toISOString() : '');
// BOM: o Excel abre os acentos certo
const csv = (head, rows) => `﻿${[row(head), ...rows.map(row)].join('\r\n')}\r\n`;

const RECUR = { daily: 'diária', weekly: 'semanal', monthly: 'mensal', yearly: 'anual' };

export function tasksCsv(S) {
  const proj = new Map(S.project.map((p) => [p.id, p.name]));
  const tag = new Map(S.tag.map((x) => [x.id, x.name]));
  const head = ['id', 'Título', 'Situação', 'Data', 'Horário', 'Duração (min)', 'Prioridade', 'Projeto', 'Etiquetas', 'Tipo', 'Repetição', 'Descrição', 'Subtarefas', 'Criada em', 'Concluída em'].map((h) => (h === 'id' ? h : t(h)));
  const rows = S.task
    .filter((x) => !x.archived || x.done)
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (a.time || '').localeCompare(b.time || ''))
    .map((x) => [
      x.id,
      x.title,
      t(x.done ? 'Concluída' : x.failed ? 'Venceu' : 'Aberta'),
      x.due || '',
      x.time || '',
      x.duration || '',
      x.priority || '',
      proj.get(x.projectId) || '',
      (x.tags || []).map((id) => tag.get(id)).filter(Boolean),
      x.kind || 'normal',
      x.recurrence?.type && x.recurrence.type !== 'none' ? t(RECUR[x.recurrence.type] || x.recurrence.type) : '',
      x.notes || '',
      (x.subtasks || []).map((s) => `${s.done ? '[x]' : '[ ]'} ${s.title}`).join(' | '),
      x.createdDay || '',
      iso(x.doneAt),
    ]);
  return csv(head, rows);
}

export function habitsCsv(S) {
  const hab = new Map(S.habit.map((h) => [h.id, h]));
  const head = ['Data', 'Hábito', 'Quantidade', 'Meta', 'Unidade', 'Situação'].map(t);
  const rows = S.hlog
    .filter((l) => hab.has(l.habitId))
    .sort((a, b) => a.date.localeCompare(b.date) || (hab.get(a.habitId).title || '').localeCompare(hab.get(b.habitId).title || ''))
    .map((l) => {
      const h = hab.get(l.habitId);
      const done = (l.count || 0) >= (h.goal || 1);
      return [l.date, h.title, l.count || 0, h.goal || 1, h.unit || '', t(done ? 'Feito' : l.mod === 'freeze' ? 'Congelamento' : l.mod === 'dayOff' ? 'Folga' : 'Parcial')];
    });
  return csv(head, rows);
}

// Nomes legíveis para cada tipo de registro no JSON.
const GROUPS = {
  task: 'tasks',
  project: 'projects',
  tag: 'tags',
  habit: 'habits',
  hlog: 'habitLogs',
  routine: 'routines',
  water: 'water',
  mood: 'moods',
  score: 'dailyScores',
  month: 'months',
  year: 'years',
  vision: 'vision',
  refl: 'reflections',
  brain: 'brainDump',
  quit: 'quitting',
  ev: 'rewards',
  ach: 'achievements',
  prefs: 'preferences',
  profile: 'profile',
  dayp: 'dayPlans',
  hist: 'history',
  wallet: 'wallet',
};
// records: o que o repositório tem (personal.allRecords()). Fica de fora o que é só do motor
// (credenciais, cursores) e o que foi excluído.
export function allJson(records, { version = '', at = Date.now() } = {}) {
  const out = { app: 'lida', format: 'lida-export', version, exportedAt: new Date(at).toISOString() };
  for (const g of Object.values(GROUPS)) out[g] = [];
  for (const r of records) {
    if (r.del || !r.data) continue;
    const g = GROUPS[r.type];
    if (!g) continue;
    out[g].push({ id: r.id, ...r.data });
  }
  for (const g of Object.values(GROUPS)) if (!out[g].length) delete out[g];
  return `${JSON.stringify(out, null, 2)}\n`;
}
