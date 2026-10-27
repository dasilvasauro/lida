import { format } from 'date-fns';
import { useTaskStore } from '../store/useTaskStore';
import { useHabitStore } from '../store/useHabitStore';
import { useEconomyStore, applyRemoteEconomy, calculateLevel } from '../store/useEconomyStore';
import { useVisionStore } from '../store/useVisionStore';
import { useConfigStore } from '../store/useConfigStore';
import { useReflectionStore } from '../store/useReflectionStore';
import { useNoteStore } from '../store/useNoteStore';
import { useFeedStore } from '../store/useFeedStore';
import { useScoreStore } from '../store/useScoreStore';
import { buildSnapshot, type Snapshot } from './snapshot';
import { computeTotals, extractCounters, mergeLedgers, newLedger, type Ledger } from './economyLedger';

/* eslint-disable @typescript-eslint/no-explicit-any */

// === O COFRE EM PEDAÇOS ("shards") ===
// Cada pedaço vira um documento em users/{uid}/vault/{id}, com no máximo 1 MiB.
//   config, tombstones, economy, vision, reflections, scores, habits
//   tasks-meta (pastas, rotinas, brain dump, humor)  ·  t-AAAA-MM (tarefas do mês)
//   notes-meta (cadernos, atalhos)                   ·  n-AAAA-MM (notas do mês)
//   feeds-meta (canais, feeds)                       ·  f-AAAA-MM (mensagens do mês)
// O mês de uma tarefa é o do prazo (ou da criação, se não houver prazo). Assim
// recorrências se espalham pelos meses em vez de lotar um pedaço só.

export type ShardContent = Record<string, any>;
export type ShardMap = Record<string, ShardContent>;

export const META_DOC_ID = '_meta';
const MONTH_SHARD = /^([tnf])-(\d{4}-\d{2})$/;

const monthOfTimestamp = (ts: number | undefined) => {
  if (!ts || !Number.isFinite(ts)) return '0000-00';
  try { return format(new Date(ts), 'yyyy-MM'); } catch { return '0000-00'; }
};
const monthOfTask = (t: any) => (typeof t.deadlineDate === 'string' && /^\d{4}-\d{2}/.test(t.deadlineDate) ? t.deadlineDate.slice(0, 7) : monthOfTimestamp(t.createdAt));

const group = (items: any[] = [], prefix: string, monthOf: (x: any) => string, field: string, out: ShardMap) => {
  for (const item of items) {
    const id = `${prefix}-${monthOf(item)}`;
    if (!out[id]) out[id] = { [field]: [] };
    out[id][field].push(item);
  }
};

export const emptyShard = (id: string): ShardContent => {
  const m = MONTH_SHARD.exec(id);
  if (m) return m[1] === 't' ? { tasks: [] } : m[1] === 'n' ? { notes: [] } : { entries: [] };
  return {};
};

export const economyShardFromState = (s: any): ShardContent => ({
  ledger: s.ledger ?? newLedger(extractCounters(s)),
  purchasedThemes: s.purchasedThemes || [],
  claimedMilestones: s.claimedMilestones || [],
  activeXpBoostUntil: s.activeXpBoostUntil ?? null,
  activeGoldBoostUntil: s.activeGoldBoostUntil ?? null,
});

// Converte um snapshot por domínio (formato do backup e do cofre antigo) em pedaços.
export const snapshotToShards = (snap: Partial<Snapshot>, economy?: ShardContent): ShardMap => {
  const out: ShardMap = {};
  if (snap.config) {
    const { tombstones, ...config } = snap.config;
    out.config = config;
    out.tombstones = { tombstones: tombstones || {} };
  }
  if (economy) out.economy = economy;
  if (snap.vision) out.vision = snap.vision;
  if (snap.reflections) out.reflections = snap.reflections;
  if (snap.scores) out.scores = snap.scores;
  if (snap.habits) out.habits = snap.habits;
  if (snap.tasks) {
    const { tasks, ...meta } = snap.tasks;
    out['tasks-meta'] = meta;
    group(tasks, 't', monthOfTask, 'tasks', out);
  }
  if (snap.notes) {
    const { notes, ...meta } = snap.notes;
    out['notes-meta'] = meta;
    group(notes, 'n', (n) => monthOfTimestamp(n.createdAt), 'notes', out);
  }
  if (snap.feeds) {
    const { entries, ...meta } = snap.feeds;
    out['feeds-meta'] = meta;
    group(entries, 'f', (e) => monthOfTimestamp(e.createdAt), 'entries', out);
  }
  return out;
};

// Estado local atual, em pedaços. Pedaços que existem na nuvem mas ficaram vazios
// aqui (ex.: todas as tarefas de um mês apagadas) entram vazios, para serem regravados.
export const buildLocalShards = (knownIds: string[] = []): ShardMap => {
  const shards = snapshotToShards(buildSnapshot(), economyShardFromState(useEconomyStore.getState()));
  for (const id of knownIds) if (!shards[id]) shards[id] = emptyShard(id);
  return shards;
};

// === MERGE ===
// Regras determinísticas e simétricas; em empate, vence a nuvem.
const itemTime = (item: any) => item?.updatedAt || item?.createdAt || 0;

// Um item está apagado se tem lápide mais nova que a última alteração dele.
// (Um item editado depois da exclusão — ou restaurado de um backup — volta.)
export const isDeleted = (item: any, tombstones: Record<string, number>) => {
  const t = tombstones[item?.id];
  return !!t && t >= itemTime(item);
};

export const mergeArrays = (
  localArr: any[] = [],
  cloudArr: any[] = [],
  tombstones: Record<string, number>,
  resolve: (local: any, cloud: any) => any = (l, c) => (itemTime(c) >= itemTime(l) ? c : l)
) => {
  const map = new Map<string, any>();
  localArr.forEach(item => { if (!isDeleted(item, tombstones)) map.set(item.id, item); });
  cloudArr.forEach(item => {
    if (isDeleted(item, tombstones)) return;
    const local = map.get(item.id);
    map.set(item.id, local ? resolve(local, item) : item);
  });
  return Array.from(map.values());
};

// Conflito "concluída x falhada": vence a concluída.
const resolveTask = (local: any, cloud: any) => {
  if (local.isCompleted && !cloud.isCompleted && cloud.isFailed) return local;
  if (cloud.isCompleted && !local.isCompleted && local.isFailed) return cloud;
  return itemTime(cloud) >= itemTime(local) ? cloud : local;
};

const mergeNested = (local: Record<string, Record<string, any>> = {}, cloud: Record<string, Record<string, any>> = {}, pick: (key: string, inner: string, l: any, c: any) => any) => {
  const result: Record<string, Record<string, any>> = {};
  for (const key of new Set([...Object.keys(local), ...Object.keys(cloud)])) {
    const l = local[key] || {};
    const c = cloud[key] || {};
    const merged: Record<string, any> = { ...l };
    for (const inner in c) merged[inner] = inner in l ? pick(key, inner, l[inner], c[inner]) : c[inner];
    result[key] = merged;
  }
  return result;
};

// União ordenada: a ordem não pode depender de qual aparelho fez o merge.
const union = <T extends string | number>(a: T[] = [], b: T[] = []) => Array.from(new Set([...a, ...b])).sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
const maxNullable = (a: number | null | undefined, b: number | null | undefined) => (a == null && b == null ? null : Math.max(a || 0, b || 0));


export const applyShard = (id: string, c: ShardContent) => {
  const tombs = useConfigStore.getState().tombstones || {};
  const month = MONTH_SHARD.exec(id);

  if (id === 'tombstones') {
    const local = useConfigStore.getState().tombstones || {};
    const merged: Record<string, number> = { ...local };
    for (const k in c.tombstones || {}) merged[k] = Math.max(merged[k] || 0, c.tombstones[k]);
    useConfigStore.setState({ tombstones: merged });
    return;
  }

  if (id === 'config') {
    const local = useConfigStore.getState();
    const newLastLogin = [local.lastLoginDate, c.lastLoginDate].filter(Boolean).sort().reverse()[0] || null;
    // Preferências: vence a alteração mais recente (empate: nuvem).
    if ((c.configUpdatedAt || 0) >= (local.configUpdatedAt || 0)) {
      const rest = { ...c };
      delete rest.tombstones;
      useConfigStore.setState({ ...rest, lastLoginDate: newLastLogin });
    } else {
      useConfigStore.setState({ lastLoginDate: newLastLogin });
    }
    return;
  }

  if (id === 'economy') {
    const local = useEconomyStore.getState() as any;
    const merged = mergeLedgers(local.ledger, c.ledger as Ledger) as Ledger;
    const totals = computeTotals(merged);
    applyRemoteEconomy(() => useEconomyStore.setState({
      ...totals,
      level: calculateLevel(totals.xp),
      ledger: merged,
      purchasedThemes: union<string>(local.purchasedThemes, c.purchasedThemes),
      claimedMilestones: union<number>(local.claimedMilestones, c.claimedMilestones),
      activeXpBoostUntil: maxNullable(local.activeXpBoostUntil, c.activeXpBoostUntil),
      activeGoldBoostUntil: maxNullable(local.activeGoldBoostUntil, c.activeGoldBoostUntil),
    } as any));
    return;
  }

  if (id === 'vision') {
    const local = useVisionStore.getState();
    const lt = local.updatedAt || 0, ct = c.updatedAt || 0;
    if (lt === 0 && ct === 0) {
      if (local.vision) useVisionStore.setState({ updatedAt: Date.now() });
      else if (c.vision) useVisionStore.setState({ vision: c.vision, updatedAt: 0 });
    } else if (ct >= lt) {
      useVisionStore.setState({ vision: c.vision ?? null, updatedAt: ct });
    }
    return;
  }

  if (id === 'reflections') {
    useReflectionStore.setState({ reflections: mergeArrays(useReflectionStore.getState().reflections, c.reflections, tombs) });
    return;
  }

  if (id === 'scores') {
    const local = useScoreStore.getState();
    const daily = new Map<string, any>();
    local.dailyScores.forEach(d => daily.set(d.date, d));
    (c.dailyScores || []).forEach((d: any) => { const l = daily.get(d.date); if (!l || d.tasksDone >= l.tasksDone) daily.set(d.date, d); });
    const archives = new Map<string, any>();
    local.monthlyArchives.forEach(a => archives.set(a.month, a));
    (c.monthlyArchives || []).forEach((a: any) => archives.set(a.month, a));
    useScoreStore.setState({
      dailyScores: Array.from(daily.values()).filter(d => !archives.has(d.date.substring(0, 7))).sort((a, b) => a.date.localeCompare(b.date)),
      monthlyArchives: Array.from(archives.values()).sort((a, b) => a.month.localeCompare(b.month)),
      isInitialSetupDone: !!c.isInitialSetupDone || local.isInitialSetupDone,
    });
    return;
  }

  if (id === 'habits') {
    const local = useHabitStore.getState();
    const lTimes = local.logTimes || {}, cTimes = c.logTimes || {};
    // Cada registro de hábito: vence o mais recente. Dados antigos sem horário: maior valor.
    const logs = mergeNested(local.logs, c.logs, (h, d, l, cv) => {
      const lt = lTimes[h]?.[d] || 0, ct = cTimes[h]?.[d] || 0;
      if (lt === 0 && ct === 0) return Math.max(l || 0, cv || 0);
      return ct >= lt ? cv : l;
    });
    const logTimes = mergeNested(lTimes, cTimes, (_h, _d, l, cv) => Math.max(l || 0, cv || 0));
    useHabitStore.setState({
      habits: mergeArrays(local.habits, c.habits, tombs),
      logs, logTimes,
      modifiers: mergeNested(local.modifiers, c.modifiers, (_h, _d, _l, cv) => cv) as any,
      quitterItems: mergeArrays(local.quitterItems, c.quitterItems, tombs),
    });
    return;
  }

  if (id === 'tasks-meta') {
    const local = useTaskStore.getState();
    const dumpTime = (b: any) => b?.updatedAt || b?.lastDumpAt || 0;
    useTaskStore.setState({
      folders: mergeArrays(local.folders, c.folders, tombs),
      routines: mergeArrays(local.routines, c.routines, tombs),
      brainDump: c.brainDump && dumpTime(c.brainDump) >= dumpTime(local.brainDump) ? c.brainDump : local.brainDump,
      moodHistory: { ...local.moodHistory, ...(c.moodHistory || {}) },
    });
    return;
  }

  if (id === 'notes-meta') {
    const local = useNoteStore.getState();
    useNoteStore.setState({
      notebooks: mergeArrays(local.notebooks, c.notebooks, tombs),
      shortcutCategories: mergeArrays(local.shortcutCategories, c.shortcutCategories, tombs),
    });
    return;
  }

  if (id === 'feeds-meta') {
    const local = useFeedStore.getState();
    useFeedStore.setState({
      channels: mergeArrays(local.channels, c.channels, tombs),
      feeds: mergeArrays(local.feeds, c.feeds, tombs),
    });
    return;
  }

  if (month) {
    // Cada item da nuvem é comparado com a cópia local ONDE ela estiver (o item
    // pode ter mudado de mês, ex.: prazo adiado). Itens locais ausentes ficam.
    const kind = month[1];
    if (kind === 't') {
      useTaskStore.setState({ tasks: mergeArrays(useTaskStore.getState().tasks, c.tasks, tombs, resolveTask) });
    } else if (kind === 'n') {
      useNoteStore.setState({ notes: mergeArrays(useNoteStore.getState().notes, c.notes, tombs) });
    } else {
      useFeedStore.setState({ entries: mergeArrays(useFeedStore.getState().entries, c.entries, tombs) });
    }
  }
};

// Ordem de aplicação: lápides e config primeiro, depois o resto.
const shardOrder = (id: string) => (id === 'tombstones' ? 0 : id === 'config' ? 1 : id.endsWith('-meta') ? 2 : 3);
export const sortShardIds = (ids: string[]) => [...ids].sort((a, b) => shardOrder(a) - shardOrder(b) || a.localeCompare(b));

// Depois de aplicar lápides novas, remove localmente o que foi apagado em outro
// aparelho (mesmo que o pedaço daquele item não tenha mudado) e corrige órfãos.
export const reconcileLocal = () => {
  const tombs = useConfigStore.getState().tombstones || {};
  const alive = (x: any) => !isDeleted(x, tombs);

  const t = useTaskStore.getState();
  if (t.tasks.some(x => !alive(x)) || t.folders.some(x => !alive(x)) || t.routines.some(x => !alive(x))) {
    useTaskStore.setState({ tasks: t.tasks.filter(alive), folders: t.folders.filter(alive), routines: t.routines.filter(alive) });
  }

  const h = useHabitStore.getState();
  const habits = h.habits.filter(alive);
  const aliveHabitIds = new Set(habits.map(x => x.id));
  const deadHabits = Object.keys(h.logs || {}).filter(id => tombs[id] && !aliveHabitIds.has(id));
  if (habits.length !== h.habits.length || h.quitterItems.some(x => !alive(x)) || deadHabits.length) {
    const logs = { ...h.logs }, logTimes = { ...(h.logTimes || {}) }, modifiers = { ...h.modifiers };
    deadHabits.forEach(id => { delete logs[id]; delete logTimes[id]; delete modifiers[id]; });
    useHabitStore.setState({ habits, quitterItems: h.quitterItems.filter(alive), logs, logTimes, modifiers });
  }

  const n = useNoteStore.getState();
  const notebooks = n.notebooks.filter(alive);
  const aliveNotebookIds = new Set(notebooks.map(nb => nb.id));
  let notesChanged = false;
  const notes = n.notes.filter(alive).map(note => {
    // Só move para "Geral" notas de um caderno que foi APAGADO (não apenas
    // ainda não baixado).
    if (note.notebookId !== 'default' && tombs[note.notebookId] && !aliveNotebookIds.has(note.notebookId)) {
      notesChanged = true;
      return { ...note, notebookId: 'default', updatedAt: Math.max(Date.now(), (note.updatedAt || 0) + 1) };
    }
    return note;
  });
  if (notesChanged || notebooks.length !== n.notebooks.length || notes.length !== n.notes.length || n.shortcutCategories.some(x => !alive(x))) {
    useNoteStore.setState({ notebooks, notes, shortcutCategories: n.shortcutCategories.filter(alive) });
  }

  const f = useFeedStore.getState();
  const feeds = f.feeds.filter(alive);
  const aliveFeedIds = new Set(feeds.map(x => x.id));
  const entries = f.entries.filter(e => alive(e) && !(tombs[e.feedId] && !aliveFeedIds.has(e.feedId)));
  if (feeds.length !== f.feeds.length || entries.length !== f.entries.length || f.channels.some(x => !alive(x))) {
    useFeedStore.setState({ channels: f.channels.filter(alive), feeds, entries });
  }

  const r = useReflectionStore.getState();
  if (r.reflections.some(x => !alive(x))) useReflectionStore.setState({ reflections: r.reflections.filter(alive) });
};
