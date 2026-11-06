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
import { isNative, plugin } from '../native.js';
import { hash32 } from '../lib/util.js';
import { nowMs } from '../lib/clock.js';

const KEY = 'lida.notify';
const STATE = 'lida.notify.scheduled';
const MAX_AHEAD_DAYS = 14;
const MAX_PENDING = 60; // o Android limita alarmes por app; 60 cobre duas semanas folgado
const CHANNEL = 'lembretes';

const LN = () => plugin('LocalNotifications');
export const notifyId = (key) => (hash32(key) & 0x7fffffff) || 1;

export function notifyPrefs() {
  try {
    return { on: false, tasks: true, daily: true, dailyAt: '21:00', water: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { on: false, tasks: true, daily: true, dailyAt: '21:00', water: false };
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

export async function initNotify(onRoute) {
  routeHandler = onRoute || routeHandler;
  if (isNative()) {
    const ln = LN();
    await ln?.createChannel?.({ id: CHANNEL, name: 'Lembretes', description: 'Prazos de tarefas, resumo do dia e água', importance: 4, visibility: 1, vibration: true }).catch(() => {});
    ln?.addListener?.('localNotificationActionPerformed', (a) => {
      const route = a?.notification?.extra?.route;
      if (route) routeHandler(route);
    });
  } else if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'notification-click' && e.data.route) routeHandler(e.data.route);
    });
  }
}

// items: [{ key, at (ms), title, body, route }]
export async function reconcile(items) {
  const prefs = notifyPrefs();
  const now = nowMs();
  const horizon = now + MAX_AHEAD_DAYS * 86400000;
  const want = prefs.on
    ? items
        .filter((x) => x.at > now + 5000 && x.at < horizon)
        .sort((a, b) => a.at - b.at)
        .slice(0, MAX_PENDING)
        .map((x) => ({ ...x, id: notifyId(x.key), sig: `${x.at}|${x.title}|${x.body}` }))
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
        .schedule({
          notifications: toSchedule.map((w) => ({
            id: w.id,
            title: w.title,
            body: w.body,
            channelId: CHANNEL,
            schedule: { at: new Date(w.at), allowWhileIdle: true },
            extra: { route: w.route || '' },
          })),
        })
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
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const opts = { body: w.body, tag: `lida-${w.id}`, icon: 'icons/pwa-192x192.png', badge: 'icons/pwa-192x192.png', data: { route: w.route || '' } };
    if (reg) await reg.showNotification(w.title, opts);
    else new Notification(w.title, opts);
  } catch {
    /* sem permissão ou sem suporte */
  }
}

// Notificação de teste, em 5 segundos (para conferir permissões e som do canal).
export async function testNotification() {
  const at = Date.now() + 5000;
  const n = { id: notifyId('test'), at, title: 'Lida', body: 'Os lembretes estão funcionando.', route: '' };
  if (isNative()) {
    await LN()?.schedule({ notifications: [{ id: n.id, title: n.title, body: n.body, channelId: CHANNEL, schedule: { at: new Date(at), allowWhileIdle: true } }] });
  } else setTimeout(() => showWeb(n), 5000);
}

// Aviso avulso de um cronômetro (Pomodoro, modo foco). at = null cancela.
// Na web, só aparece se o Lida estiver em segundo plano (com ele à vista, o próprio app toca o sino).
export async function timerAlert(key, at, title = 'Lida', body = '') {
  const id = notifyId(key);
  if (isNative()) {
    const ln = LN();
    if (!ln) return;
    await ln.cancel({ notifications: [{ id }] }).catch(() => {});
    if (at && notifyPrefs().on) await ln.schedule({ notifications: [{ id, title, body, channelId: CHANNEL, schedule: { at: new Date(at), allowWhileIdle: true }, extra: { route: '' } }] }).catch(() => {});
    return;
  }
  clearTimeout(webTimers.get(id));
  webTimers.delete(id);
  if (at && notifyPrefs().on) webTimers.set(id, setTimeout(() => document.hidden && showWeb({ id, title, body, route: '' }), Math.max(0, at - Date.now())));
}
