// Pomodoro comum e modo foco das tarefas com tempo.
//
// Os dois cronômetros guardam a HORA DE TÉRMINO (não contam tiques): continuam certos com a tela
// desligada, o app em segundo plano ou fechado. No APK, um lembrete local avisa quando acaba.
import { personal, P, app } from '../state.js';
import { commit } from '../core/game.js';
import { toggleTask } from '../core/tasks.js';
import { timerAlert, liveTimer } from '../core/notify.js';
import { today, nowMs } from '../lib/clock.js';
import { esc, sum, plural } from '../lib/util.js';
import { icon, sheet, toast } from '../ui/ui.js';
import { play } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';
import { celebrate } from './celebrate.js';

const fmt = (sec) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};
const load = (k, def) => {
  try {
    return { ...def, ...JSON.parse(localStorage.getItem(k) || '{}') };
  } catch {
    return { ...def };
  }
};
const save = (k, v) => {
  try {
    if (v) localStorage.setItem(k, JSON.stringify(v));
    else localStorage.removeItem(k);
  } catch {
    /* sem armazenamento */
  }
};

/* =====================================================================
   Pomodoro
   ===================================================================== */
const PK = 'lida.pomo';
const PDEF = { mode: 'focus', running: false, endsAt: 0, left: 25 * 60, focusMin: 25, breakMin: 5 };
let pomo = load(PK, PDEF);
const listeners = new Set();
const emit = () => listeners.forEach((f) => f());
const dur = (mode = pomo.mode) => (mode === 'focus' ? pomo.focusMin : pomo.breakMin) * 60;
const leftNow = () => (pomo.running ? Math.max(0, (pomo.endsAt - nowMs()) / 1000) : pomo.left);

function setPomo(next) {
  pomo = { ...pomo, ...next };
  save(PK, pomo);
  emit();
  syncLive();
}

export function pomoStart() {
  const endsAt = nowMs() + pomo.left * 1000;
  setPomo({ running: true, endsAt });
  timerAlert('pomodoro', endsAt, pomo.mode === 'focus' ? 'Fim do foco' : 'Fim da pausa', pomo.mode === 'focus' ? 'Hora de uma pausa curta.' : 'Pronto para mais um ciclo?');
  haptic('start');
}
export function pomoPause() {
  setPomo({ running: false, left: Math.ceil(leftNow()) });
  timerAlert('pomodoro', null);
  haptic('stop');
}
export function pomoReset(mode = pomo.mode) {
  setPomo({ mode, running: false, left: dur(mode) });
  timerAlert('pomodoro', null);
}

// Ciclo terminado: registra o foco (1 voucher a cada 60 minutos acumulados) e passa para o próximo modo.
async function pomoFinish() {
  const was = pomo.mode;
  const endedAt = pomo.endsAt;
  const next = was === 'focus' ? 'break' : 'focus';
  setPomo({ mode: next, running: false, left: (next === 'focus' ? pomo.focusMin : pomo.breakMin) * 60 });
  play('bell');
  haptic('done');
  if (was !== 'focus') return toast('Pausa encerrada. Quando quiser, comece outro ciclo.');
  const id = `ev_focus_${endedAt}`;
  if (personal.get(id)) return;
  const batch = [{ type: 'ev', id, data: { kind: 'focus', date: today(), focusSec: pomo.focusMin * 60 } }];
  const total = focusSeconds() + pomo.focusMin * 60;
  for (let k = 1; k <= Math.floor(total / 3600); k++) if (!personal.get(`ev_pomo_v_${k}`)) batch.push({ type: 'ev', id: `ev_pomo_v_${k}`, data: { kind: 'focus-voucher', date: today(), vouchers: 1 } });
  const gotVoucher = batch.length > 1;
  await commit(batch);
  toast(gotVoucher ? 'Ciclo concluído. Uma hora de foco acumulada: +1 voucher!' : `Ciclo de ${pomo.focusMin} minutos concluído. Hora da pausa.`, { ms: 4500 });
}

const focusSeconds = (S = P()) => sum(S.ev.filter((e) => e.kind === 'focus'), (e) => e.focusSec || 0);
const focusToday = (S = P()) => S.ev.filter((e) => e.kind === 'focus' && e.date === today());

// Um relógio só para tudo: confere os cronômetros a cada segundo e atualiza o que estiver na tela.
let ticker = 0;
function ensureTicker() {
  if (ticker) return;
  ticker = setInterval(() => {
    if (pomo.running && nowMs() >= pomo.endsAt) pomoFinish();
    if (task.running && !task.rang && nowMs() >= task.endsAt) taskTimeUp();
    paintChip();
    listeners.forEach((f) => f(true));
  }, 1000);
}

// Indicador no cabeçalho enquanto algum cronômetro corre.
export function paintChip() {
  const chip = document.querySelector('[data-timer-chip]');
  if (!chip) return;
  if (task.taskId) {
    const left = taskLeft();
    chip.hidden = false;
    chip.dataset.kind = 'task';
    chip.innerHTML = `${icon(task.running ? 'timer' : 'pause')}<span>${left >= 0 ? fmt(left) : '+' + fmt(-left)}</span>`;
    chip.onclick = () => openTaskFocus();
  } else if (pomo.running || pomo.left !== dur()) {
    chip.hidden = false;
    chip.dataset.kind = pomo.mode;
    chip.innerHTML = `${icon(pomo.running ? 'timer' : 'pause')}<span>${fmt(leftNow())}</span>`;
    chip.onclick = () => openPomodoro();
  } else chip.hidden = true;
}

export function initTimers() {
  ensureTicker();
  if (pomo.running && nowMs() >= pomo.endsAt) pomoFinish();
  paintChip();
  syncLive();
  app.actions.syncLive = syncLive;
  if (task.taskId) setTimeout(() => openTaskFocus(), 300);
}

export function openPomodoro() {
  ensureTicker();
  const C = 2 * Math.PI * 110;
  sheet({
    title: 'Pomodoro',
    body: `<div class="pomo" data-pomo>
      <div class="seg small pomo-modes" role="radiogroup" aria-label="Modo">
        <button type="button" role="radio" data-mode="focus">Foco</button><button type="button" role="radio" data-mode="break">Pausa</button>
      </div>
      <div class="pomo-dial">
        <svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="110" class="pomo-track"/><circle cx="120" cy="120" r="110" class="pomo-arc" stroke-dasharray="${C}" transform="rotate(-90 120 120)"/></svg>
        <div class="pomo-time"><b data-time></b><small data-label></small></div>
      </div>
      <div class="pomo-actions">
        <button type="button" class="icon-btn round" data-reset aria-label="Reiniciar">${icon('refresh')}</button>
        <button type="button" class="btn primary pomo-go" data-go></button>
        <button type="button" class="icon-btn round" data-skip aria-label="Pular para o próximo">${icon('right')}</button>
      </div>
      <div class="pomo-set" data-set>
        <div class="stepper"><span>Foco</span><button type="button" class="icon-btn" data-step="focusMin:-5" aria-label="Menos foco">${icon('minus')}</button><b data-v="focusMin"></b><button type="button" class="icon-btn" data-step="focusMin:5" aria-label="Mais foco">${icon('plus')}</button></div>
        <div class="stepper"><span>Pausa</span><button type="button" class="icon-btn" data-step="breakMin:-1" aria-label="Menos pausa">${icon('minus')}</button><b data-v="breakMin"></b><button type="button" class="icon-btn" data-step="breakMin:1" aria-label="Mais pausa">${icon('plus')}</button></div>
      </div>
      <p class="pomo-foot" data-foot></p>
    </div>`,
    onMount(el) {
      const $ = (s) => el.querySelector(s);
      const paint = (tick) => {
        const left = leftNow();
        const total = dur();
        $('[data-time]').textContent = fmt(left);
        $('[data-label]').textContent = pomo.mode === 'focus' ? (pomo.running ? 'Foco' : 'Foco · parado') : pomo.running ? 'Pausa' : 'Pausa · parada';
        $('.pomo-arc').style.strokeDashoffset = String(C * (1 - left / total));
        el.querySelector('[data-pomo]').dataset.mode = pomo.mode;
        if (tick) return;
        el.querySelectorAll('[data-mode]').forEach((b) => {
          b.classList.toggle('on', b.dataset.mode === pomo.mode);
          b.setAttribute('aria-checked', b.dataset.mode === pomo.mode);
        });
        $('[data-go]').innerHTML = pomo.running ? `${icon('pause')}Pausar` : `${icon('play')}${left < total ? 'Continuar' : 'Começar'}`;
        $('[data-set]').classList.toggle('dim', pomo.running);
        $('[data-v="focusMin"]').textContent = `${pomo.focusMin} min`;
        $('[data-v="breakMin"]').textContent = `${pomo.breakMin} min`;
        const S = P();
        const secs = focusSeconds(S);
        const toNext = 60 - Math.floor((secs % 3600) / 60);
        const n = focusToday(S).length;
        $('[data-foot]').innerHTML = `${n ? `${plural(n, 'ciclo', 'ciclos')} hoje · ` : ''}faltam ${toNext} min de foco para o próximo voucher`;
      };
      paint();
      listeners.add(paint);
      $('[data-go]').onclick = () => {
        if (pomo.running) pomoPause();
        else pomoStart();
      };
      $('[data-reset]').onclick = () => pomoReset();
      $('[data-skip]').onclick = () => pomoReset(pomo.mode === 'focus' ? 'break' : 'focus');
      el.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => !pomo.running && pomoReset(b.dataset.mode)));
      el.querySelectorAll('[data-step]').forEach(
        (b) =>
          (b.onclick = () => {
            if (pomo.running) return;
            const [k, d] = b.dataset.step.split(':');
            const v = Math.max(k === 'focusMin' ? 5 : 1, Math.min(k === 'focusMin' ? 90 : 30, pomo[k] + Number(d)));
            setPomo({ [k]: v });
            pomoReset();
          }),
      );
      // Remove o ouvinte quando o painel fecha.
      const obs = new MutationObserver(() => {
        if (!document.body.contains(el)) {
          listeners.delete(paint);
          obs.disconnect();
        }
      });
      obs.observe(document.body, { childList: true });
    },
  });
}

/* =====================================================================
   Modo foco de uma tarefa com tempo
   ===================================================================== */
const TK = 'lida.focus';
let task = load(TK, { taskId: null });
const taskLeft = () => (task.running ? (task.endsAt - nowMs()) / 1000 : task.left);

function setTask(next) {
  task = next ? { ...task, ...next } : { taskId: null };
  save(TK, task.taskId ? task : null);
  paintChip();
  syncLive();
}

// Notificação fixa com a contagem (APK): o modo foco tem prioridade sobre o Pomodoro.
function syncLive() {
  const mm = (sec) => fmt(Math.max(0, Math.round(sec)));
  if (task.taskId) {
    const t = P().byId.get(task.taskId);
    if (!t) return liveTimer(null);
    return liveTimer(
      task.running
        ? { title: t.title, body: 'Modo foco · tempo restante', endsAt: task.endsAt, chip: 'Foco' }
        : { title: t.title, body: `Modo foco pausado · ${mm(task.left)} restantes`, paused: true, chip: 'Pausa' },
    );
  }
  const label = pomo.mode === 'focus' ? 'Foco' : 'Pausa';
  if (pomo.running) return liveTimer({ title: `Pomodoro · ${label}`, body: pomo.mode === 'focus' ? `Ciclo de ${pomo.focusMin} min` : `Pausa de ${pomo.breakMin} min`, endsAt: pomo.endsAt, chip: label, timeoutMs: Math.max(1000, pomo.endsAt - nowMs()) });
  if (pomo.left !== dur()) return liveTimer({ title: `Pomodoro · ${label} parado`, body: `${mm(pomo.left)} restantes`, paused: true, chip: 'Pausa' });
  return liveTimer(null);
}

export function focusTask(id) {
  ensureTicker();
  const t = P().byId.get(id);
  if (!t) return;
  if (task.taskId && task.taskId !== id) {
    const other = P().byId.get(task.taskId);
    if (other) return toast(`O foco em "${other.title}" ainda está aberto.`, { action: 'Abrir', onAction: openTaskFocus });
  }
  if (task.taskId !== id) {
    const total = (t.duration || 30) * 60;
    setTask({ taskId: id, total, running: true, endsAt: nowMs() + total * 1000, left: total, rang: false });
    timerAlert('focus', task.endsAt, 'Tempo esgotado', t.title);
    play('powerup');
    haptic('start');
  }
  openTaskFocus();
}

function taskTimeUp() {
  setTask({ rang: true });
  play('bell');
  haptic('done');
}

let overlay = null;
export function openTaskFocus() {
  const t = P().byId.get(task.taskId);
  if (!t) return setTask(null);
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.className = 'focus-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `Foco: ${t.title}`);
  const C = 2 * Math.PI * 130;
  overlay.innerHTML = `<div class="focus-inner">
    <button type="button" class="icon-btn focus-min" data-min aria-label="Minimizar">${icon('down')}</button>
    <small>Modo foco</small>
    <h2>${esc(t.title)}</h2>
    <div class="pomo-dial big"><svg viewBox="0 0 280 280" aria-hidden="true"><circle cx="140" cy="140" r="130" class="pomo-track"/><circle cx="140" cy="140" r="130" class="pomo-arc" stroke-dasharray="${C}" transform="rotate(-90 140 140)"/></svg>
      <div class="pomo-time"><b data-time></b><small data-label></small></div></div>
    <div class="pomo-actions">
      <button type="button" class="btn ghost" data-stop>Sair</button>
      <button type="button" class="btn" data-pause></button>
      <button type="button" class="btn primary" data-done>${icon('check')}Concluir</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  const $ = (s) => overlay.querySelector(s);
  const paint = () => {
    if (!overlay) return;
    const left = taskLeft();
    $('[data-time]').textContent = left >= 0 ? fmt(left) : `+${fmt(-left)}`;
    $('[data-label]').textContent = left >= 0 ? (task.running ? 'restantes' : 'pausado') : 'tempo extra';
    $('.pomo-arc').style.strokeDashoffset = String(C * (1 - Math.max(0, left) / task.total));
    overlay.classList.toggle('over', left < 0);
    $('[data-pause]').innerHTML = task.running ? `${icon('pause')}Pausar` : `${icon('play')}Continuar`;
  };
  paint();
  listeners.add(paint);
  const onKey = (e) => e.key === 'Escape' && !document.querySelector('.sheet-wrap.open') && close();
  document.addEventListener('keydown', onKey);
  const close = () => {
    document.removeEventListener('keydown', onKey);
    listeners.delete(paint);
    overlay?.classList.remove('open');
    const o = overlay;
    overlay = null;
    setTimeout(() => o?.remove(), 250);
  };
  $('[data-min]').onclick = close;
  $('[data-pause]').onclick = () => {
    if (task.running) {
      setTask({ running: false, left: taskLeft() });
      timerAlert('focus', null);
    } else {
      setTask({ running: true, endsAt: nowMs() + task.left * 1000 });
      if (task.left > 0) timerAlert('focus', task.endsAt, 'Tempo esgotado', t.title);
    }
    paint();
  };
  $('[data-stop]').onclick = () => {
    timerAlert('focus', null);
    setTask(null);
    close();
  };
  $('[data-done]').onclick = async () => {
    timerAlert('focus', null);
    const id = task.taskId;
    setTask(null);
    close();
    play('complete');
    haptic('done');
    const res = await toggleTask(id);
    if (res?.done) celebrate('Concluída', res.reward, res, { undo: () => toggleTask(id) });
    app.refresh();
  };
}
