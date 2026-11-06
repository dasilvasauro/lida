// Importação do Lida anterior (versão React, cofre v2).
//
// Fontes, nesta ordem de preferência:
// 1. Nuvem: users/{uid}/vault (pedaços cifrados com AES-GCM; chave derivada da Chave Mestra com
//    PBKDF2-SHA256). É a cópia mais completa para quem usava a sincronização.
// 2. Este aparelho: o IndexedDB "lida" (ou o localStorage, em versões mais antigas), para quem
//    usava o modo offline.
//
// Notas, Feeds e Atalhos deixaram de existir no Lida 3 e não são importados.
// Os ids originais são mantidos: importar duas vezes não duplica nada.
import { tick } from '../lib/hlc.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/* ---------- Cofre v2 na nuvem ---------- */
async function deriveV2(pin, kdf) {
  const material = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: kdf.hash || 'SHA-256', iterations: kdf.iterations, salt: b64(kdf.salt) }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
}
async function openV2(key, text, context) {
  const data = b64(text);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.subarray(0, 12), additionalData: enc.encode(context) }, key, data.subarray(12));
  return dec.decode(plain);
}

// vault = { meta, shards } (cloud.legacyVault). Devolve os domínios em texto puro.
export async function decryptVault(vault, pin) {
  const { meta, shards } = vault;
  if (!meta?.kdf?.salt || !meta.keyCheck) throw Object.assign(new Error('Cofre antigo em formato desconhecido.'), { code: 'bad-vault' });
  const key = await deriveV2(pin, meta.kdf);
  try {
    if ((await openV2(key, meta.keyCheck, 'key-check')) !== 'lida-vault-v2') throw new Error();
  } catch {
    throw Object.assign(new Error('Chave Mestra incorreta.'), { code: 'bad-pass' });
  }
  const vaultId = meta.kdf.salt;
  const out = { tasks: [], folders: [], routines: [], brainDump: null, moodHistory: {}, habits: null, economy: null, vision: null, reflections: [], scores: null, config: null };
  for (const [id, doc] of Object.entries(shards)) {
    if (/^(n|f)-|^notes-meta$|^feeds-meta$/.test(id)) continue; // notas e feeds não vêm para o Lida 3
    let c;
    try {
      c = JSON.parse(await openV2(key, doc.c, `lida:${vaultId}:${id}`));
    } catch {
      continue;
    }
    if (/^t-/.test(id)) out.tasks.push(...(c.tasks || []));
    else if (id === 'tasks-meta') {
      out.folders = c.folders || [];
      out.routines = c.routines || [];
      out.brainDump = c.brainDump || null;
      out.moodHistory = c.moodHistory || {};
    } else if (id === 'habits') out.habits = c;
    else if (id === 'economy') out.economy = { ...economyTotals(c.ledger), purchasedThemes: c.purchasedThemes, claimedMilestones: c.claimedMilestones, activeXpBoostUntil: c.activeXpBoostUntil, activeGoldBoostUntil: c.activeGoldBoostUntil };
    else if (id === 'vision') out.vision = c.vision || null;
    else if (id === 'reflections') out.reflections = c.reflections || [];
    else if (id === 'scores') out.scores = c;
    else if (id === 'config') out.config = c;
  }
  return out;
}

// Saldo do registro de economia v2: base + variações de cada aparelho + eventos.
function addTree(a, b) {
  const o = JSON.parse(JSON.stringify(a || {}));
  for (const [k, v] of Object.entries(b || {})) {
    if (v && typeof v === 'object') o[k] = addTree(o[k] && typeof o[k] === 'object' ? o[k] : {}, v);
    else o[k] = (typeof o[k] === 'number' ? o[k] : 0) + v;
  }
  return o;
}
function economyTotals(ledger) {
  if (!ledger) return {};
  let t = ledger.base || {};
  for (const d of Object.values(ledger.devices || {})) t = addTree(t, d.delta);
  for (const e of Object.values(ledger.events || {})) t = addTree(t, e);
  return { xp: t.xp || 0, gold: t.gold || 0, vouchers: t.vouchers || 0, voucherProgress: t.voucherProgress || 0, inventory: t.inventory || {}, dailyHistory: t.dailyHistory || {} };
}

/* ---------- Dados deste aparelho ---------- */
const LOCAL_KEYS = { tasks: 'lida-tasks', habits: 'lida-habits-v5', economy: 'lida-economy-v3', vision: 'lida-vision', config: 'lida-config', reflections: 'lida-reflections', scores: 'lida-scores' };

function idbRead(name) {
  return new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open('lida');
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      // Não existia: não cria nada.
      req.transaction.abort();
      resolve(null);
    };
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) {
        db.close();
        return resolve(null);
      }
      const g = db.transaction('kv').objectStore('kv').get(name);
      g.onsuccess = () => {
        db.close();
        resolve(g.result ?? null);
      };
      g.onerror = () => {
        db.close();
        resolve(null);
      };
    };
  });
}
function lsRead(name) {
  try {
    const raw = localStorage.getItem(name);
    if (!raw) return null;
    try {
      JSON.parse(raw);
      return raw;
    } catch {
      return decodeURIComponent(atob(raw));
    }
  } catch {
    return null;
  }
}

export async function readLocalLegacy() {
  const state = {};
  let found = false;
  for (const [k, name] of Object.entries(LOCAL_KEYS)) {
    const raw = (await idbRead(name)) ?? lsRead(name);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      state[k] = parsed?.state ?? parsed;
      found = true;
    } catch {
      /* ilegível: ignora */
    }
  }
  if (!found) return null;
  const t = state.tasks || {};
  const e = state.economy || {};
  return {
    tasks: t.tasks || [],
    folders: t.folders || [],
    routines: t.routines || [],
    brainDump: t.brainDump || null,
    moodHistory: t.moodHistory || {},
    habits: state.habits || null,
    economy: e.ledger ? { ...economyTotals(e.ledger), purchasedThemes: e.purchasedThemes, claimedMilestones: e.claimedMilestones, activeXpBoostUntil: e.activeXpBoostUntil, activeGoldBoostUntil: e.activeGoldBoostUntil } : e,
    vision: state.vision?.vision ?? null,
    reflections: state.reflections?.reflections || [],
    scores: state.scores || null,
    config: state.config || null,
  };
}

/* ---------- Conversão para registros do Lida 3 ---------- */
const KIND = { normal: 'normal', daily_challenge: 'challenge', sprint: 'sprint', time: 'timed', bonus: 'bonus', routine: 'routine' };
const THEME = { 'dark-amoled': 'amoled', 'soft-dark': 'suave', light: 'claro', 'light-gray': 'cinza', butter: 'manteiga', navy: 'marinho', darcula: 'darcula', macos: 'aqua', matrix: 'matrix', pink: 'rosa', todoist: 'tomate', orange: 'laranja' };
const FONT = { sans: 'manrope', serif: 'lora', special: 'atkinson' };

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));

// Devolve [{ id, type, data, ca }] prontos para store.importPlain (via toPlain).
export function toRecords(L) {
  const out = [];
  const add = (type, id, data, ca) => out.push({ id, type, data: clean(data), ca });

  for (const f of L.folders || []) if (f.id !== 'default') add('project', f.id, { name: f.name, color: f.color }, f.updatedAt);
  for (const t of L.tasks || []) {
    add(
      'task',
      t.id,
      {
        title: t.title,
        notes: t.description,
        kind: KIND[t.type] || 'normal',
        priority: t.priority || 'P4',
        projectId: t.folderId && t.folderId !== 'default' ? t.folderId : undefined,
        due: t.deadlineDate,
        time: t.deadlineTime,
        duration: t.duration,
        subtasks: (t.subtasks || []).map((s) => ({ id: s.id, title: s.title, done: !!s.completed })),
        routineId: t.routineTemplateId,
        recurrence: t.recurrence && t.recurrence.type !== 'none' ? t.recurrence : undefined,
        nextGenerated: t.nextRecurrenceGenerated || undefined,
        color: t.color,
        done: t.isCompleted || undefined,
        doneAt: t.completedAt,
        failed: t.isFailed || undefined,
        archived: t.isArchived || undefined,
        powerups: t.hasMagicDice || t.hasRespite || t.hasRelief ? { dice: !!t.hasMagicDice, respite: !!t.hasRespite, relief: !!t.hasRelief } : undefined,
        postponed: t.postponedCount || undefined,
        reprioritized: t.reprioritizedCount || undefined,
        createdAt: t.createdAt,
      },
      t.createdAt,
    );
  }
  for (const r of L.routines || []) add('routine', r.id, { title: r.title, items: r.items || [], weekdays: r.weekdays || [], color: r.color }, r.createdAt);
  for (const b of L.brainDump?.items || []) if (!b.convertedTo) add('brain', b.id, { text: b.text, quadrant: b.quadrant });
  for (const [date, mood] of Object.entries(L.moodHistory || {})) add('mood', `md_${date}`, { date, mood });

  const H = L.habits || {};
  for (const h of H.habits || []) add('habit', h.id, { title: h.title, notes: h.description, type: h.type, goal: h.goal || 1, unit: h.unit, color: h.color, icon: h.icon }, h.createdAt);
  const habitIds = new Set((H.habits || []).map((h) => h.id));
  for (const [hid, days] of Object.entries(H.logs || {})) {
    if (!habitIds.has(hid)) continue;
    for (const [date, count] of Object.entries(days)) if (count) add('hlog', `hl_${hid}_${date}`, { habitId: hid, date, count });
  }
  for (const [hid, days] of Object.entries(H.modifiers || {})) {
    if (!habitIds.has(hid)) continue;
    for (const [date, mod] of Object.entries(days)) {
      const id = `hl_${hid}_${date}`;
      const prev = out.find((x) => x.id === id);
      if (prev) prev.data.mod = mod;
      else add('hlog', id, { habitId: hid, date, count: 0, mod });
    }
  }
  for (const q of H.quitterItems || []) add('quit', q.id, { title: q.title, lastRelapseAt: q.lastRelapseAt, checkins: q.checkins || [], rewardCycle: q.rewardCycle || 0, createdAt: q.createdAt }, q.createdAt);

  const E = L.economy || {};
  add('ev', 'ev_import', { kind: 'import', xp: E.xp || 0, gold: E.gold || 0, vouchers: E.vouchers || 0, voucherProgress: E.voucherProgress || 0, items: E.inventory || {}, date: undefined, note: 'Saldo trazido do Lida anterior' });
  // O tema em uso no Lida anterior conta como já liberado.
  const owned = [...new Set([...(E.purchasedThemes || []), L.config?.theme].filter(Boolean).map((t) => THEME[t] || t))];
  add('wallet', 'wallet', { themes: owned, milestones: E.claimedMilestones || [], xpBoostUntil: E.activeXpBoostUntil, goldBoostUntil: E.activeGoldBoostUntil });
  for (const [date, h] of Object.entries(E.dailyHistory || {})) add('hist', `hi_${date}`, { date, xp: h.xp || 0, gold: h.gold || 0, lostXp: h.lostXp || 0, lostGold: h.lostGold || 0 });

  const SC = L.scores || {};
  for (const s of SC.dailyScores || []) add('score', `sc_${s.date}`, { date: s.date, score: s.score, tasksDone: s.tasksDone, habitsDone: s.habitsDone, penalties: s.penalties });
  for (const m of SC.monthlyArchives || []) add('month', `mo_${m.month}`, { month: m.month, score: m.finalScore, grade: m.grade });

  if (L.vision) add('vision', 'vision', { develop: L.vision.traitsToDevelop || [], abandon: L.vision.traitsToAbandon || [], goals: L.vision.goals || [], checkpoints: L.vision.checkpoints || [] }, L.vision.createdAt);
  for (const r of L.reflections || []) add('refl', r.id, { title: r.title, color: r.color, cards: r.cards || [] }, r.createdAt);

  const C = L.config || {};
  add('prefs', 'prefs', {
    name: C.userName,
    modus: C.userClass,
    daysOff: C.defaultDaysOff || [],
    punishments: C.enablePunishments !== false,
    editWindow: C.enableEditWindow !== false,
    theme: THEME[C.theme],
    font: FONT[C.font],
    // O próximo dia a processar é o seguinte ao último login: o Lida 3 não reprocessa o passado.
    lastDay: C.lastLoginDate || undefined,
    importedAt: Date.now(),
  });
  return out;
}

// Formato aceito por store.importPlain: uma versão nova para cada registro.
export const toPlain = (records, by) => records.map((r) => ({ id: r.id, type: r.type, data: r.data, u: tick(), by, cb: by, ca: r.ca || Date.now(), del: false }));

export function summary(L) {
  const H = L.habits || {};
  return {
    tasks: (L.tasks || []).filter((t) => !t.isArchived).length,
    habits: (H.habits || []).length,
    routines: (L.routines || []).length,
    gold: L.economy?.gold || 0,
    xp: L.economy?.xp || 0,
  };
}
