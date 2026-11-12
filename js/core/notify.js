// Lembretes e notificações.
//
// APK (Android): notificações LOCAIS agendadas no próprio sistema (plugin Local Notifications).
//   Disparam com o app fechado, com o celular sem internet e depois de reiniciar o aparelho.
//   No Android 12+ o horário exato depende da permissão "Alarmes e lembretes"; sem ela o Android
//   pode atrasar alguns minutos. No modo de economia de bateria, há um intervalo mínimo de ~9 min.
// Web: o navegador não agenda notificações sem servidor. Os lembretes disparam enquanto o Lida
//   estiver aberto (ou em segundo plano numa aba) e os perdidos aparecem ao abrir.
//
// Uso: reconcile(lista) com tudo o que DEVERIA estar agendado. O módulo compara com o que já está
// e só agenda/cancela a diferença. Cada lembrete tem uma chave estável (ex.: "task:<id>").
import { t as tt } from './i18n.js';
import { isNative, plugin, hasPlugin } from '../native.js';
import { hash32 } from '../lib/util.js';
import { nowMs } from '../lib/clock.js';
import { play } from './sound.js';

const KEY = 'lida.notify';
const STATE = 'lida.notify.scheduled';
const MAX_AHEAD_DAYS = 14;
const MAX_PENDING = 60; // o Android limita alarmes por app; 60 cobre duas semanas folgado
// Canal com o som de campainha de bicicleta (res/raw/sino_bicicleta.wav). O som de um canal do
// Android não muda depois de criado; por isso o canal antigo, sem som próprio, é apagado.
const CHANNEL = 'lembretes_sino';
const OLD_CHANNELS = ['lembretes'];
const SOUND = 'sino_bicicleta.wav';
const ICON = 'ic_stat_lida';
const COLOR = '#7C8CFF';

// Botões nas notificações. Concluir e "Bebi um copo" funcionam sem abrir a tela do app.
const ACTIONS = [
  { id: 'TASK', actions: [{ id: 'done', title: 'Concluir' }, { id: 'snooze', title: 'Lembrar em 1 h' }] },
  { id: 'WATER', actions: [{ id: 'water', title: 'Bebi um copo' }] },
];

const LN = () => plugin('LocalNotifications');
export const notifyId = (key) => (hash32(key) & 0x7fffffff) || 1;

// before: minutos de antecedência padrão dos lembretes de tarefa (cada tarefa pode ter o seu).
// late: avisa de novo se a tarefa passou do horário e ainda está aberta. habits: hábitos pendentes
// no fim da tarde. inbox: lembrete de organizar a caixa de entrada. inApp: aviso dentro do app
// quando ele está aberto. live: cronômetro do Pomodoro na notificação.
const DEFAULTS = {
  on: false,
  tasks: true,
  before: 0,
  late: true,
  lateAfter: 30,
  daily: true,
  dailyAt: '21:00',
  morning: true,
  morningAt: '08:00',
  habits: true,
  habitsAt: '19:00',
  inbox: false,
  inboxAt: '10:00',
  water: false,
  waterFrom: '09:00',
  waterTo: '21:00',
  waterEvery: 2,
  inApp: true,
  live: true,
};
// Opções de antecedência (minutos) para os lembretes de tarefa.
export const REMIND_BEFORE = [
  [0, 'Na hora'],
  [5, '5 min antes'],
  [10, '10 min antes'],
  [15, '15 min antes'],
  [30, '30 min antes'],
  [60, '1 h antes'],
  [120, '2 h antes'],
  [1440, '1 dia antes'],
];

export function notifyPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}
export function setNotifyPrefs(p) {
  const next = { ...notifyPrefs(), ...p };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sem armazenamento */
  }
  return next;
}

const readState = () => {
  try {
    return JSON.parse(localStorage.getItem(STATE) || '{}');
  } catch {
    return {};
  }
};
const writeState = (s) => {
  try {
    localStorage.setItem(STATE, JSON.stringify(s));
  } catch {
    /* sem armazenamento */
  }
};

/* ---------- Permissões ---------- */
// 'granted' | 'denied' | 'prompt' | 'unsupported'
export async function permission() {
  if (isNative()) {
    const r = await LN()?.checkPermissions().catch(() => null);
    return r?.display || 'prompt';
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

export async function requestPermission() {
  if (isNative()) {
    const r = await LN()?.requestPermissions().catch(() => null);
    return r?.display || 'denied';
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

// Android 12+: alarmes exatos. 'granted' | 'denied' | null (não se aplica).
export async function exactAlarm() {
  if (!isNative()) return null;
  const r = await LN()?.checkExactNotificationSetting?.().catch(() => null);
  return r?.exact_notification || null;
}
export async function openExactAlarmSettings() {
  if (!isNative()) return null;
  return LN()?.changeExactNotificationSetting?.().catch(() => null);
}

/* ---------- Agenda ---------- */
let webTimers = new Map();
let routeHandler = () => {};

// onRoute(rota) abre uma tela; onAction(acao, extra) executa um botão da notificação.
let actionHandler = () => {};
// onInApp(item): lembrete que chegou com o Lida aberto e à vista (aviso dentro do app).
let inAppHandler = () => {};
export async function initNotify(onRoute, onAction, onInApp) {
  routeHandler = onRoute || routeHandler;
  actionHandler = onAction || actionHandler;
  inAppHandler = onInApp || inAppHandler;
  if (isNative()) {
    const ln = LN();
    for (const id of OLD_CHANNELS) await ln?.deleteChannel?.({ id }).catch(() => {});
    await ln?.createChannel?.({ id: CHANNEL, name: tt('Lembretes'), description: tt('Prazos de tarefas, resumo do dia, água e Pomodoro'), importance: 4, visibility: 1, vibration: true, lights: true, lightColor: COLOR, sound: SOUND }).catch(() => {});
    await ln?.registerActionTypes?.({ types: ACTIONS.map((a) => ({ ...a, actions: a.actions.map((b) => ({ ...b, title: tt(b.title) })) })) }).catch(() => {});
    // Com o app em primeiro plano o Android mostra a notificação e avisa aqui: o Lida mostra
    // também um aviso no topo, com os mesmos botões (sem tocar o som de novo).
    ln?.addListener?.('localNotificationReceived', (n) => {
      if (notifyPrefs().inApp === false || document.hidden) return;
      inAppHandler({ title: n.title, body: n.body, actions: n.actionTypeId, route: n.extra?.route || '', extra: n.extra || {}, native: true });
    });
    ln?.addListener?.('localNotificationActionPerformed', (a) => {
      const extra = a?.notification?.extra || {};
      if (a.actionId && a.actionId !== 'tap') return actionHandler(a.actionId, extra);
      if (extra.route) routeHandler(extra.route);
    });
  } else if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type !== 'notification-click') return;
      if (e.data.action) actionHandler(e.data.action, e.data.extra || {});
      else if (e.data.route) routeHandler(e.data.route);
    });
  }
}

// Formato do Android para um lembrete.
const nativeOf = (w) => ({
  id: w.id,
  title: w.title,
  body: w.body,
  largeBody: w.long || w.body,
  summaryText: w.summary || undefined,
  smallIcon: ICON,
  iconColor: COLOR,
  sound: SOUND,
  channelId: CHANNEL,
  actionTypeId: w.actions || undefined,
  group: w.group || undefined,
  schedule: { at: new Date(w.at), allowWhileIdle: true },
  extra: { route: w.route || '', ...(w.extra || {}) },
});

// items: [{ key, at (ms), title, body, long?, summary?, actions?, group?, route, extra? }]
export async function reconcile(items) {
  const prefs = notifyPrefs();
  const now = nowMs();
  const horizon = now + MAX_AHEAD_DAYS * 86400000;
  const want = prefs.on
    ? items
        .filter((x) => x.at > now + 5000 && x.at < horizon)
        .sort((a, b) => a.at - b.at)
        .slice(0, MAX_PENDING)
        .map((x) => ({ ...x, id: notifyId(x.key), sig: `${x.at}|${x.title}|${x.body}|${x.long || ''}` }))
    : [];
  const prev = readState();
  const next = {};
  const toCancel = [];
  const toSchedule = [];
  const wanted = new Map(want.map((x) => [String(x.id), x]));
  for (const [id, sig] of Object.entries(prev)) {
    const w = wanted.get(id);
    if (!w || w.sig !== sig) toCancel.push(Number(id));
  }
  for (const w of want) {
    next[w.id] = w.sig;
    if (prev[w.id] !== w.sig) toSchedule.push(w);
  }

  if (isNative()) {
    const ln = LN();
    if (!ln) return;
    if (toCancel.length) await ln.cancel({ notifications: toCancel.map((id) => ({ id })) }).catch(() => {});
    if (toSchedule.length)
      await ln
        .schedule({ notifications: toSchedule.map(nativeOf) })
        .catch((e) => console.warn('Falha ao agendar lembretes', e));
  } else {
    for (const id of toCancel) {
      clearTimeout(webTimers.get(id));
      webTimers.delete(id);
    }
    for (const w of want) {
      if (webTimers.has(w.id) && !toSchedule.includes(w)) continue;
      clearTimeout(webTimers.get(w.id));
      const delay = w.at - now;
      if (delay > 2147483000) continue; // limite do setTimeout (~24 dias)
      webTimers.set(w.id, setTimeout(() => showWeb(w), delay));
    }
  }
  writeState(next);
}

async function showWeb(w) {
  webTimers.delete(w.id);
  // Lida à vista: aviso dentro do app, com som; a notificação do sistema fica para o segundo plano.
  if (!document.hidden && notifyPrefs().inApp !== false) {
    play('bike');
    return inAppHandler(w);
  }
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  play('bike');
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const actions = w.actions === 'TASK' ? [{ action: 'done', title: tt('Concluir') }, { action: 'snooze', title: tt('Lembrar em 1 h') }] : w.actions === 'WATER' ? [{ action: 'water', title: tt('Bebi um copo') }] : [];
    const opts = { body: w.long || w.body, tag: `lida-${w.id}`, icon: 'icons/pwa-192x192.png', badge: 'icons/pwa-192x192.png', data: { route: w.route || '', extra: w.extra || {} }, actions, renotify: true };
    if (reg) await reg.showNotification(w.title, opts);
    else new Notification(w.title, opts);
  } catch {
    /* sem permissão ou sem suporte */
  }
}

// Um lembrete avulso (ex.: "lembrar em 1 h"), fora da lista reconciliada.
export async function scheduleOne(item) {
  const w = { ...item, id: notifyId(item.key) };
  if (isNative()) return LN()?.schedule({ notifications: [nativeOf(w)] }).catch(() => {});
  clearTimeout(webTimers.get(w.id));
  webTimers.set(w.id, setTimeout(() => showWeb(w), Math.max(0, w.at - Date.now())));
}

// Notificação de teste, em 5 segundos (para conferir permissão, som e botões).
export async function testNotification() {
  await scheduleOne({ key: 'test', at: Date.now() + 5000, title: tt('Lida está pronto'), body: tt('É assim que os lembretes chegam: com o sino e um botão para concluir.'), long: tt('É assim que os lembretes chegam: com o sino de bicicleta, um resumo e botões para agir sem abrir o app.'), summary: tt('Teste'), route: '' });
}

// Aviso avulso de um cronômetro (Pomodoro, modo foco). at = null cancela.
// Na web, só aparece se o Lida estiver em segundo plano (com ele à vista, o próprio app toca o sino).
export async function timerAlert(key, at, title = 'Lida', body = '') {
  const id = notifyId(key);
  if (isNative()) {
    const ln = LN();
    if (!ln) return;
    await ln.cancel({ notifications: [{ id }] }).catch(() => {});
    if (at && notifyPrefs().on) await ln.schedule({ notifications: [nativeOf({ id, at, title, body, summary: tt('Foco'), route: '' })] }).catch(() => {});
    return;
  }
  clearTimeout(webTimers.get(id));
  webTimers.delete(id);
  if (at && notifyPrefs().on) webTimers.set(id, setTimeout(() => document.hidden && showWeb({ id, title, body, route: '' }), Math.max(0, at - Date.now())));
}

/* ---------- Cronômetro na notificação (APK) ---------- */
// Notificação fixa com contagem regressiva do próprio Android enquanto um Pomodoro ou o modo foco
// estiver rodando (Live Update no Android 16+). state = null esconde.
// state: { title, body, endsAt?, paused?, chip?, timeoutMs? }
let liveSig = '';
let askedLive = false;
export async function liveTimer(state) {
  if (!hasPlugin('LidaTimer')) return;
  const p = plugin('LidaTimer');
  const want = state && notifyPrefs().live !== false ? state : null;
  const sig = want ? JSON.stringify({ ...want, timeoutMs: undefined }) : '';
  if (sig === liveSig) return;
  liveSig = sig;
  if (!want) return p.hide().catch(() => {});
  // Android 13+: sem a permissão de notificações a notificação do foco não aparece. Pede uma vez.
  if (!askedLive && (await permission()) === 'prompt') {
    askedLive = true;
    await requestPermission();
  }
  return p.show(want).catch(() => {});
}

// Live Update (Android 16+): se o sistema promove a notificação do foco (chip na barra de status,
// Now Bar da Samsung, ilha da Xiaomi) e o atalho para a tela do Android que libera isso.
export async function liveStatus() {
  if (!hasPlugin('LidaTimer')) return null;
  return plugin('LidaTimer').liveStatus().catch(() => null);
}
export const openLiveSettings = () => hasPlugin('LidaTimer') && plugin('LidaTimer').openLiveSettings().catch(() => {});

// Relógio flutuante (APK): aparece por cima dos outros apps quando o Lida é minimizado com um
// cronômetro rodando. Precisa da permissão "Sobrepor a outros apps", dada nas configurações.
export async function overlayStatus() {
  if (!hasPlugin('LidaTimer')) return null;
  return plugin('LidaTimer').overlayStatus().catch(() => null);
}
export async function setOverlay(on) {
  if (!hasPlugin('LidaTimer')) return null;
  const p = plugin('LidaTimer');
  const r = await p.setOverlay({ on }).catch(() => null);
  if (on && r && !r.granted) await p.requestOverlay().catch(() => {});
  return r;
}
