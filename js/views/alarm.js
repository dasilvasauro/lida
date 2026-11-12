// Alarme de tela cheia: a tela (alarm.html, a mesma no Android, no Linux e na web), o agendamento
// e o que acontece em "Concluir" (conclui a tarefa ou a rotina, marca o hábito) e "Ignorar".
//   Android: o plugin nativo LidaAlarm agenda no sistema (toca com o app fechado e o celular bloqueado).
//   Linux e web: o app confere a cada 15 s e mostra a tela por cima de tudo (no Linux, em tela cheia).
import { app, personal, P } from '../state.js';
import { hasPlugin, plugin } from '../native.js';
import { upcoming, toneSrc, alarmStyle, TONES, TONE_ORDER, MAX_ALARMS, canAddAlarm, defaultTone } from '../core/alarms.js';
import { esc } from '../lib/util.js';
import { toggleTask, routineTaskId } from '../core/tasks.js';
import { setCount } from '../core/habits.js';
import { today } from '../lib/clock.js';
import { tr, lang, locale } from '../core/i18n.js';
import { toast } from '../ui/ui.js';
import { debounce } from '../lib/util.js';

const L = (pt, en, es) => ({ pt, en, es });
const T = {
  task: L('Tarefa', 'Task', 'Tarea'),
  routine: L('Rotina', 'Routine', 'Rutina'),
  habit: L('Hábito', 'Habit', 'Hábito'),
  done: L('Concluir', 'Complete', 'Completar'),
  doneHabit: L('Feito', 'Done', 'Hecho'),
  ignore: L('Ignorar', 'Dismiss', 'Ignorar'),
  completed: L('Concluído pelo alarme.', 'Completed from the alarm.', 'Completado desde la alarma.'),
};

const css = (k) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
// Tudo o que a tela precisa, menos o conteúdo do alarme (cores e fonte do tema, idioma, textos).
export function alarmLook() {
  const vars = {};
  for (const k of ['--bg', '--surface', '--surface-2', '--text', '--muted', '--accent', '--on-accent', '--line']) vars[k] = css(k);
  return { style: alarmStyle(), vars, font: css('--font'), lang: lang(), locale: locale() };
}
export function payload(a, { sound = true } = {}) {
  return {
    ...alarmLook(),
    key: a.key,
    title: a.title,
    desc: a.desc,
    kind: a.kind,
    sound: sound ? toneSrc(a.tone) : '',
    vibrate: true,
    t: { kind: tr(T[a.kind] || T.task), done: tr(a.kind === 'habit' ? T.doneHabit : T.done), ignore: tr(T.ignore) },
  };
}

/* ---------- Concluir ---------- */
export async function completeFromAlarm(kind, ref) {
  const S = P();
  if (kind === 'task') {
    const t = S.byId.get(ref);
    if (t && !t.done) await toggleTask(ref, { on: true });
  } else if (kind === 'routine') {
    const id = routineTaskId(ref, today());
    const t = S.byId.get(id);
    if (t && !t.done) await toggleTask(id, { on: true });
  } else if (kind === 'habit') {
    const h = S.byId.get(ref);
    if (h) await setCount(h, h.goal || 1);
  }
  toast(tr(T.completed));
}

/* ---------- Tela por cima do app (Linux e web) ---------- */
let open = null;
export function showAlarm(a) {
  if (open) return;
  const desk = window.__LIDA_DESKTOP__;
  if (desk) deskAlarm(true);
  const frame = document.createElement('iframe');
  frame.className = 'alarm-frame';
  frame.title = a.title;
  frame.src = `alarm.html#${encodeURIComponent(JSON.stringify(payload(a)))}`;
  frame.allow = 'autoplay';
  document.body.appendChild(frame);
  open = frame;
  const onMsg = async (e) => {
    if (e.source !== frame.contentWindow || !e.data?.lidaAlarm) return;
    window.removeEventListener('message', onMsg);
    frame.remove();
    open = null;
    if (desk) deskAlarm(false);
    if (e.data.lidaAlarm === 'done') await completeFromAlarm(a.kind, a.ref);
  };
  window.addEventListener('message', onMsg);
}
function deskAlarm(on) {
  fetch('/__desktop/alarm', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Lida-Token': window.__LIDA_DESKTOP__.token }, body: JSON.stringify({ on }) }).catch(() => {});
}

// Toca agora (para testar em Ajustes).
export function testAlarm(tone) {
  const a = { key: 'test', kind: 'task', ref: null, title: tr(L('Alarme de teste', 'Test alarm', 'Alarma de prueba')), desc: tr(L('É assim que o alarme aparece. A descrição da tarefa fica aqui.', 'This is how the alarm looks. The task description goes here.', 'Así se ve la alarma. La descripción de la tarea va aquí.')), tone };
  if (hasPlugin('LidaAlarm')) return plugin('LidaAlarm').test({ alarm: { ...a, id: 1, at: Date.now() + 3000 }, look: alarmLook(), t: payload(a, { sound: false }).t });
  showAlarm({ ...a, ref: '' });
}

/* ---------- Agendamento ---------- */
const FIRED = 'lida.alarms.fired';
const fired = () => {
  try {
    return JSON.parse(localStorage.getItem(FIRED) || '{}');
  } catch {
    return {};
  }
};
function markFired(key, at) {
  const f = fired();
  f[`${key}@${at}`] = Date.now();
  for (const k of Object.keys(f)) if (Date.now() - f[k] > 3 * 86400000) delete f[k];
  try {
    localStorage.setItem(FIRED, JSON.stringify(f));
  } catch {
    /* sem armazenamento */
  }
}

function checkNow() {
  const now = Date.now();
  const f = fired();
  for (const a of upcoming(P(), { days: 1, from: now - 90000 })) {
    if (a.at > now || now - a.at > 90000 || f[`${a.key}@${a.at}`]) continue;
    markFired(a.key, a.at);
    showAlarm(a);
    break;
  }
}

// Android: entrega a lista ao sistema (substitui a anterior). Reagenda ao mudar dados ou aparência.
const syncNative = debounce(() => {
  const list = upcoming(P(), { days: 7 }).slice(0, 30);
  plugin('LidaAlarm')
    .sync({ alarms: list, look: alarmLook(), t: { task: tr(T.task), routine: tr(T.routine), habit: tr(T.habit), done: tr(T.done), doneHabit: tr(T.doneHabit), ignore: tr(T.ignore) } })
    .catch((e) => console.warn('Alarmes', e));
}, 1500);

export function initAlarms() {
  if (hasPlugin('LidaAlarm')) {
    personal.subscribe(syncNative);
    syncNative();
    return;
  }
  setInterval(checkNow, 15000);
  setTimeout(checkNow, 3000);
}

// Link lida://alarme?feito=<tipo>:<id> (botão "Concluir" do alarme nativo, que abre o app).
export function alarmLink(url) {
  const m = /alarme\?feito=(task|routine|habit):([^&#]+)/.exec(url || '');
  if (!m) return false;
  setTimeout(() => completeFromAlarm(m[1], decodeURIComponent(m[2])), 600);
  return true;
}
export const nativeAlarms = () => hasPlugin('LidaAlarm');
export { app };

/* ---------- Campos nos editores (tarefa, rotina, hábito) ---------- */
// withTime: rotina e hábito escolhem o horário do alarme aqui; a tarefa usa o horário dela.
export function alarmFields({ tone = '', time = '', withTime = false, hidden = false } = {}) {
  const opts = [`<option value=""${tone ? '' : ' selected'}>Sem alarme</option>`, ...TONE_ORDER.map((k) => `<option value="${k}"${tone === k ? ' selected' : ''}>${esc(tr(TONES[k].name))}</option>`)].join('');
  return `<div class="grid2 alarm-fields" data-alarmrow${hidden ? ' hidden' : ''}>
    ${withTime ? `<label class="field"><span>Horário do alarme</span><input type="time" name="alarmTime" value="${esc(time || '')}"></label>` : ''}
    <label class="field"><span>Alarme de tela cheia</span><select name="alarm">${opts}</select></label>
  </div>`;
}
// Confere o limite antes de ligar um alarme novo. Devolve o toque (ou undefined) ou null se passou do limite.
export function readAlarm(f, rec) {
  const tone = f.alarm?.value || '';
  if (!tone) return undefined;
  if (!rec?.alarm && !canAddAlarm(P(), rec?.id)) {
    toast(`Limite de ${MAX_ALARMS} alarmes. Desligue algum para ligar este.`);
    return null;
  }
  return tone;
}
export const toneDefault = () => defaultTone();
