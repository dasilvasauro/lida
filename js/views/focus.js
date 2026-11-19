// Pomodoro comum, modo foco das tarefas com tempo e a tarefa em foco.
//
// Os cronômetros guardam a HORA DE TÉRMINO (não contam tiques): continuam certos com a tela
// desligada, o app em segundo plano ou fechado. No APK, um lembrete local avisa quando acaba.
// O estado fica no registro sincronizado "focus" (core/focus.js): é o mesmo em todos os aparelhos.
import { personal, P, app } from '../state.js';
import { commit } from '../core/game.js';
import { toggleTask, toggleSub } from '../core/tasks.js';
import { timerAlert, liveTimer } from '../core/notify.js';
import { POMO_DEF, saveFocus, focusOf, focusedTask, setFocus } from '../core/focus.js';
import { today, nowMs } from '../lib/clock.js';
import { esc, sum, plural } from '../lib/util.js';
import { icon, sheet, toast, bar } from '../ui/ui.js';
import { play } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';
import { celebrate } from './celebrate.js';
import { t as tx, tr } from '../core/i18n.js';
import { dial } from '../ui/dial.js';
import { tickPrefs, setTickPrefs, tickWhere, previewRun, previewBeat, TICK_SOUNDS, TICK_ORDER, BEAT_STATES, MAX_BEATS } from '../core/metronome.js';

export const fmt = (sec) => {
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
const PK = 'lida.pomo'; // só para trazer o estado das versões antigas (antes do foco sincronizado)
let pomo = { ...POMO_DEF };
const listeners = new Set();
const emit = () => listeners.forEach((f) => f());
const dur = (mode = pomo.mode) => (mode === 'focus' ? pomo.focusMin : pomo.breakMin) * 60;
const leftNow = () => (pomo.running ? Math.max(0, (pomo.endsAt - nowMs()) / 1000) : pomo.left);

function setPomo(next) {
  pomo = { ...pomo, ...next };
  emit();
  syncLive();
  saveFocus({ pomo }).catch(() => {});
}

export function pomoStart() {
  const endsAt = nowMs() + pomo.left * 1000;
  setPomo({ running: true, endsAt });
  timerAlert('pomodoro', endsAt, tx(pomo.mode === 'focus' ? 'Fim do foco' : 'Fim da pausa'), tx(pomo.mode === 'focus' ? 'Hora de uma pausa curta.' : 'Pronto para mais um ciclo?'));
  haptic('start');
}
export function pomoPause() {
  setPomo({ running: false, left: Math.ceil(leftNow()) });
  timerAlert('pomodoro', null);
  haptic('stop');
}
export const pomoState = () => ({ ...pomo, leftSec: Math.round(leftNow()) });
export const pomoSkip = () => pomoReset(pomo.mode === 'focus' ? 'break' : 'focus');
// Ajusta as durações (minutos). Com o Pomodoro parado, recomeça o ciclo com o tempo novo.
export function pomoSet({ focusMin, breakMin } = {}) {
  const next = {};
  if (focusMin) next.focusMin = Math.max(5, Math.min(90, Math.round(Number(focusMin))));
  if (breakMin) next.breakMin = Math.max(1, Math.min(30, Math.round(Number(breakMin))));
  setPomo(next);
  if (!pomo.running) pomoReset();
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
  // No Flow com Pomodoro, os ciclos emendam sozinhos (foco → pausa → foco).
  const inFlow = app.actions.flowPomo?.(was);
  if (was !== 'focus') return inFlow || toast('Pausa encerrada. Quando quiser, comece outro ciclo.');
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

// A cada segundo (para o Flow e outras telas que mostram tempo)
export function onSecond(fn) {
  ensureTicker();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Um relógio só para tudo: confere os cronômetros a cada segundo e atualiza o que estiver na tela.
let ticker = 0;
function ensureTicker() {
  if (ticker) return;
  ticker = setInterval(() => {
    if (pomo.running && nowMs() >= pomo.endsAt) pomoFinish();
    if (task.running && !task.rang && nowMs() >= task.endsAt) taskTimeUp();
    paintChip();
    syncTick();
    listeners.forEach((f) => f(true));
  }, 1000);
}

// Indicador no cabeçalho enquanto algum cronômetro corre.
export function paintChip() {
  const chip = document.querySelector('[data-timer-chip]');
  if (!chip) return;
  if (app.actions.flowChip?.(chip)) return;
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

// Estado vindo do registro sincronizado (outro aparelho, a CLI ou o widget mudaram o foco).
let lastAt = 0;
function adopt(force = false) {
  const f = focusOf();
  if (!f || (!force && f.at === lastAt)) return;
  lastAt = f.at;
  if (!force && f.by === app.device) return;
  const prevPomo = pomo;
  pomo = { ...POMO_DEF, ...(f.pomo || {}) };
  task = f.task?.taskId ? { ...f.task } : { taskId: null };
  // Avisos locais de fim acompanham o estado novo.
  if (pomo.running && pomo.endsAt !== prevPomo.endsAt) timerAlert('pomodoro', pomo.endsAt, tx(pomo.mode === 'focus' ? 'Fim do foco' : 'Fim da pausa'), tx(pomo.mode === 'focus' ? 'Hora de uma pausa curta.' : 'Pronto para mais um ciclo?'));
  else if (!pomo.running) timerAlert('pomodoro', null);
  if (task.running && task.left > 0) timerAlert('focus', task.endsAt, tx('Tempo esgotado'), P().byId.get(task.taskId)?.title || tx('Modo foco'));
  else timerAlert('focus', null);
  if (!task.taskId && overlay) overlay.querySelector('[data-min]')?.click();
  emit();
  paintChip();
  syncLive();
}

export function initTimers() {
  ensureTicker();
  // Primeira vez com o foco sincronizado: traz o Pomodoro e o modo foco guardados neste aparelho.
  if (!focusOf()) {
    const old = load(PK, POMO_DEF);
    const oldTask = load(TK, { taskId: null });
    pomo = { ...POMO_DEF, ...old };
    task = oldTask.taskId ? oldTask : { taskId: null };
    if (old.running || old.left !== POMO_DEF.left || task.taskId) saveFocus({ pomo, task: task.taskId ? task : null, ...(task.taskId ? { taskId: task.taskId, since: nowMs() } : {}) }).catch(() => {});
    save(PK, null);
    save(TK, null);
  } else adopt(true);
  personal.subscribe(() => {
    adopt();
    // Tarefa em foco concluída (aqui ou em outro aparelho): o foco termina sozinho.
    const f = focusOf();
    if (f?.taskId && !focusedTask() && !task.taskId) setFocus(null).catch(() => {});
    syncLive();
  });
  if (pomo.running && nowMs() >= pomo.endsAt) pomoFinish();
  paintChip();
  syncLive();
  app.actions.syncLive = syncLive;
}

// Pôr uma tarefa em foco (sem cronômetro) ou tirar.
export async function focusOn(id) {
  await setFocus(id);
  if (id) {
    play('powerup');
    haptic('start');
  }
  syncLive();
  app.refresh();
}

export function openPomodoro() {
  ensureTicker();
  sheet({
    title: 'Pomodoro',
    body: `<div class="pomo" data-pomo>
      <div class="seg small pomo-modes" role="radiogroup" aria-label="Modo">
        <button type="button" role="radio" data-mode="focus"></button><button type="button" role="radio" data-mode="break"></button>
      </div>
      <div class="pomo-time big"><b data-time></b><small data-label></small></div>
      <div class="pomo-wheel" data-wheel></div>
      <p class="pomo-hint" data-hint>Gire para escolher os minutos</p>
      <div class="pomo-actions">
        <button type="button" class="icon-btn round" data-reset aria-label="Reiniciar">${icon('refresh')}</button>
        <button type="button" class="btn primary pomo-go" data-go></button>
        <button type="button" class="icon-btn round" data-skip aria-label="Pular para o próximo">${icon('right')}</button>
      </div>
      ${tickControls()}
      <p class="pomo-foot" data-foot></p>
    </div>`,
    onMount(el) {
      const $ = (s) => el.querySelector(s);
      let wheel = null;
      let wheelMode = null;
      // O dial do modo atual: foco de 1 a 90 min, pausa de 1 a 30. Girar muda os minutos (com o
      // Pomodoro parado); correndo, ele gira sozinho com o tempo, como um timer de cozinha.
      const makeWheel = () => {
        wheelMode = pomo.mode;
        const key = pomo.mode === 'focus' ? 'focusMin' : 'breakMin';
        wheel = dial($('[data-wheel]'), {
          min: 1,
          max: pomo.mode === 'focus' ? 90 : 30,
          value: pomo[key],
          ariaLabel: pomo.mode === 'focus' ? 'Minutos de foco' : 'Minutos de pausa',
          onChange: (v) => {
            $('[data-time]').textContent = fmt(v * 60);
          },
          onCommit: (v) => {
            if (pomo.running || v === pomo[key]) return;
            setPomo({ [key]: v });
            pomoReset();
          },
        });
      };
      const paint = (tick) => {
        const left = leftNow();
        const total = dur();
        if (wheelMode !== pomo.mode) makeWheel();
        const idle = !pomo.running && Math.abs(left - total) < 1;
        wheel.lock(pomo.running);
        wheel.set(idle ? total / 60 : left / 60, { animate: true });
        $('[data-time]').textContent = fmt(left);
        $('[data-label]').textContent = pomo.mode === 'focus' ? (pomo.running ? 'Foco' : 'Foco · parado') : pomo.running ? 'Pausa' : 'Pausa · parada';
        el.querySelector('[data-pomo]').dataset.mode = pomo.mode;
        $('[data-hint]').style.visibility = pomo.running ? 'hidden' : '';
        if (tick) return;
        el.querySelectorAll('.pomo-modes [data-mode]').forEach((b) => {
          b.classList.toggle('on', b.dataset.mode === pomo.mode);
          b.setAttribute('aria-checked', b.dataset.mode === pomo.mode);
          b.textContent = b.dataset.mode === 'focus' ? `Foco · ${pomo.focusMin} min` : `Pausa · ${pomo.breakMin} min`;
        });
        $('[data-go]').innerHTML = pomo.running ? `${icon('pause')}Pausar` : `${icon('play')}${left < total ? 'Continuar' : 'Começar'}`;
        const S = P();
        const secs = focusSeconds(S);
        const toNext = 60 - Math.floor((secs % 3600) / 60);
        const n = focusToday(S).length;
        $('[data-foot]').innerHTML = `${n ? `${plural(n, 'ciclo', 'ciclos')} hoje · ` : ''}faltam ${toNext} min de foco para o próximo voucher`;
      };
      paint();
      listeners.add(paint);
      bindTickControls(el);
      $('[data-go]').onclick = () => {
        if (pomo.running) pomoPause();
        else pomoStart();
      };
      $('[data-reset]').onclick = () => pomoReset();
      $('[data-skip]').onclick = () => pomoReset(pomo.mode === 'focus' ? 'break' : 'focus');
      el.querySelectorAll('.pomo-modes [data-mode]').forEach((b) => (b.onclick = () => !pomo.running && pomoReset(b.dataset.mode)));
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

/* ---------- Tique do relógio e metrônomo ---------- */
// Botão "Tique" (liga e desliga) e o montador de batida, no Pomodoro e no modo foco.
export function tickControls() {
  const p = tickPrefs();
  return `<div class="tick-row">
    <button type="button" class="chip tick-toggle${p.on ? ' on' : ''}" data-tick aria-pressed="${p.on}">${icon('timer', 'sm')}<span>Tique</span></button>
    <button type="button" class="chip" data-tickset>${icon('settings', 'sm')}<span>${p.beats > 1 || p.bpm !== 60 ? `${p.beats}/8 · ${p.bpm} bpm` : 'Metrônomo'}</span></button>
  </div>`;
}
export function bindTickControls(el) {
  const t = el.querySelector('[data-tick]');
  if (t)
    t.onclick = () => {
      const on = !tickPrefs().on;
      setTickPrefs({ on });
      t.classList.toggle('on', on);
      t.setAttribute('aria-pressed', on);
      haptic('tap');
      syncTick();
    };
  const s = el.querySelector('[data-tickset]');
  if (s) s.onclick = () => openMetronome(() => el.querySelector('.tick-row')?.replaceWith(htmlEl(tickControls())) || bindTickControls(el));
}
const htmlEl = (h) => {
  const d = document.createElement('div');
  d.innerHTML = h;
  return d.firstElementChild;
};
// Onde o tique deve tocar agora.
export function syncTick() {
  // No Flow, o tique segue a escolha feita ao começar (e para na pausa do Flow).
  const fl = app.actions.flowTick?.();
  if (fl !== undefined) return tickWhere(fl);
  tickWhere(task.taskId && task.running ? 'focus' : pomo.running ? (pomo.mode === 'focus' ? 'pomo' : 'pause') : null);
}

// Montador de batida: tempos por compasso (1 a 8), cada um forte, normal ou mudo; andamento e som.
export function openMetronome(onDone) {
  const p0 = tickPrefs();
  sheet({
    title: 'Metrônomo',
    body: `<div class="metro">
      <label class="set-row"><span class="grow">Tique ligado<small>Toca enquanto o Pomodoro ou o modo foco correm</small></span><span class="toggle"><input type="checkbox" data-mon${p0.on ? ' checked' : ''} aria-label="Tique ligado"><i></i></span></label>
      <div class="metro-sec"><span class="metro-lbl">Tempos por compasso</span>
        <div class="seg small metro-beats" role="radiogroup" aria-label="Tempos por compasso">${Array.from({ length: MAX_BEATS }, (_, i) => `<button type="button" role="radio" data-beats="${i + 1}">${i + 1}</button>`).join('')}</div>
        <small class="metro-sig" data-sig></small></div>
      <div class="metro-sec"><span class="metro-lbl">Toque em cada tempo: forte, normal ou mudo</span>
        <div class="metro-pads" data-pads></div></div>
      <div class="metro-sec"><span class="metro-lbl">Andamento <b data-bpmv></b></span>
        <input type="range" min="30" max="200" step="1" data-bpm aria-label="Batidas por minuto">
        <div class="metro-presets">${[
          [60, 'Segundos'],
          [72, 'Calmo'],
          [96, 'Médio'],
          [120, 'Animado'],
        ]
          .map(([v, l]) => `<button type="button" class="chip" data-bpmp="${v}">${l}<small>${v}</small></button>`)
          .join('')}</div></div>
      <div class="metro-sec"><span class="metro-lbl">Som</span>
        <div class="metro-sounds">${TICK_ORDER.map((k) => `<button type="button" class="chip" data-snd="${k}">${esc(tr(TICK_SOUNDS[k].name))}</button>`).join('')}</div></div>
      <div class="metro-sec"><span class="metro-lbl">Onde tocar</span>
        <label class="set-row"><span class="grow">No foco do Pomodoro</span><span class="toggle"><input type="checkbox" data-where="pomo"${p0.pomo ? ' checked' : ''}><i></i></span></label>
        <label class="set-row"><span class="grow">Na pausa do Pomodoro</span><span class="toggle"><input type="checkbox" data-where="pause"${p0.pause ? ' checked' : ''}><i></i></span></label>
        <label class="set-row"><span class="grow">No modo foco com tempo</span><span class="toggle"><input type="checkbox" data-where="focus"${p0.focus ? ' checked' : ''}><i></i></span></label></div>
      <div class="metro-sec"><span class="metro-lbl">Volume do tique</span><input type="range" min="0.1" max="1" step="0.05" data-mvol aria-label="Volume do tique"></div>
      <div class="sheet-actions"><button type="button" class="btn ghost" data-mreset>Voltar ao tique simples</button><button type="button" class="btn primary" data-mok>Pronto</button></div>
    </div>`,
    onMount(el, close) {
      const $ = (s) => el.querySelector(s);
      const paint = () => {
        const p = tickPrefs();
        el.querySelectorAll('[data-beats]').forEach((b) => {
          const on = Number(b.dataset.beats) === p.beats;
          b.classList.toggle('on', on);
          b.setAttribute('aria-checked', on);
        });
        $('[data-sig]').textContent = p.beats === 1 ? 'Um tique igual em todas as batidas' : `Compasso ${p.beats}/8`;
        $('[data-pads]').innerHTML = p.pattern
          .slice(0, p.beats)
          .map((st, i) => `<button type="button" class="metro-pad st-${st}" data-pad="${i}" aria-label="Tempo ${i + 1}: ${st === 'accent' ? 'forte' : st === 'mute' ? 'mudo' : 'normal'}"><i></i><small>${i + 1}</small></button>`)
          .join('');
        $('[data-bpm]').value = p.bpm;
        $('[data-bpmv]').textContent = `${p.bpm} bpm`;
        $('[data-mvol]').value = p.volume;
        el.querySelectorAll('[data-snd]').forEach((b) => b.classList.toggle('on', b.dataset.snd === p.sound));
        el.querySelectorAll('[data-bpmp]').forEach((b) => b.classList.toggle('on', Number(b.dataset.bpmp) === p.bpm));
      };
      paint();
      // Toca enquanto o montador está aberto; o tempo atual acende.
      previewRun(true, (i) => {
        el.querySelectorAll('[data-pad]').forEach((b) => b.classList.toggle('hit', Number(b.dataset.pad) === i));
      });
      el.querySelectorAll('[data-beats]').forEach((b) => (b.onclick = () => (setTickPrefs({ beats: Number(b.dataset.beats) }), haptic('tick'), paint())));
      $('[data-pads]').onclick = (e) => {
        const b = e.target.closest('[data-pad]');
        if (!b) return;
        const p = tickPrefs();
        const i = Number(b.dataset.pad);
        const pattern = [...p.pattern];
        pattern[i] = BEAT_STATES[(BEAT_STATES.indexOf(pattern[i]) + 1) % BEAT_STATES.length];
        setTickPrefs({ pattern });
        haptic('tap');
        paint();
      };
      $('[data-bpm]').oninput = (e) => {
        setTickPrefs({ bpm: Number(e.target.value) });
        $('[data-bpmv]').textContent = `${e.target.value} bpm`;
        el.querySelectorAll('[data-bpmp]').forEach((b) => b.classList.toggle('on', b.dataset.bpmp === e.target.value));
      };
      el.querySelectorAll('[data-bpmp]').forEach((b) => (b.onclick = () => (setTickPrefs({ bpm: Number(b.dataset.bpmp) }), paint())));
      el.querySelectorAll('[data-snd]').forEach((b) => (b.onclick = () => (setTickPrefs({ sound: b.dataset.snd }), previewBeat(b.dataset.snd), paint())));
      $('[data-mvol]').oninput = (e) => setTickPrefs({ volume: Number(e.target.value) });
      $('[data-mon]').onchange = (e) => setTickPrefs({ on: e.target.checked });
      el.querySelectorAll('[data-where]').forEach((c) => (c.onchange = () => setTickPrefs({ [c.dataset.where]: c.checked })));
      $('[data-mreset]').onclick = () => (setTickPrefs({ beats: 1, bpm: 60, pattern: Array.from({ length: MAX_BEATS }, (_, i) => (i === 0 ? 'accent' : 'normal')) }), paint());
      $('[data-mok]').onclick = close;
    },
    onClose() {
      previewRun(false);
      syncTick();
      onDone?.();
    },
  });
}

/* =====================================================================
   Modo foco de uma tarefa com tempo
   ===================================================================== */
const TK = 'lida.focus'; // idem: estado antigo, migrado para o registro sincronizado
let task = { taskId: null };
const taskLeft = () => (task.running ? (task.endsAt - nowMs()) / 1000 : task.left);

function setTask(next) {
  task = next ? { ...task, ...next } : { taskId: null };
  paintChip();
  syncLive();
  // Modo foco com tempo também põe a tarefa em foco.
  const patch = { task: task.taskId ? task : null };
  if (task.taskId && focusOf()?.taskId !== task.taskId) Object.assign(patch, { taskId: task.taskId, since: nowMs() });
  saveFocus(patch).catch(() => {});
}

// Notificação fixa com a contagem (APK): o modo foco tem prioridade sobre o Pomodoro.
// A notificação do foco no idioma do app (o título, quando é o nome da tarefa, fica como está).
function live(st) {
  const own = st.title === P().byId.get(task.taskId)?.title || st.title === focusedTask()?.title;
  return liveTimer({ ...st, title: own ? st.title : tx(st.title), body: tx(st.body), chip: tx(st.chip) });
}

function syncLive() {
  const mm = (sec) => fmt(Math.max(0, Math.round(sec)));
  if (task.taskId) {
    const t = P().byId.get(task.taskId);
    if (!t) return liveTimer(null);
    return live(
      task.running
        ? { title: t.title, body: 'Modo foco · tempo restante', endsAt: task.endsAt, totalMs: (task.total || 0) * 1000, chip: 'Foco', focus: true }
        : { title: t.title, body: `Modo foco pausado · ${mm(task.left)} restantes`, paused: true, leftMs: Math.max(0, Math.round(task.left * 1000)), chip: 'Pausa', focus: true },
    );
  }
  const label = pomo.mode === 'focus' ? 'Foco' : 'Pausa';
  const ft = focusedTask();
  const since = focusOf()?.since;
  if (pomo.running) return live({ title: ft ? ft.title : `Pomodoro · ${label}`, body: ft ? `Pomodoro · ${label} · ciclo de ${pomo.mode === 'focus' ? pomo.focusMin : pomo.breakMin} min` : pomo.mode === 'focus' ? `Ciclo de ${pomo.focusMin} min` : `Pausa de ${pomo.breakMin} min`, endsAt: pomo.endsAt, totalMs: (pomo.mode === 'focus' ? pomo.focusMin : pomo.breakMin) * 60000, chip: label, focus: !!ft, ...(ft ? {} : { timeoutMs: Math.max(1000, pomo.endsAt - nowMs()) }) });
  if (pomo.left !== dur()) return live({ title: ft ? ft.title : `Pomodoro · ${label} parado`, body: ft ? `Pomodoro parado · ${mm(pomo.left)} restantes` : `${mm(pomo.left)} restantes`, paused: true, leftMs: pomo.left * 1000, chip: 'Pausa', focus: !!ft });
  // Só a tarefa em foco: contagem para cima desde que o foco começou (no Flow, desde que ela entrou).
  const fl = app.actions.flowLine?.();
  if (ft && fl) return live({ title: ft.title, body: fl.body, ...(fl.paused ? { paused: true, leftMs: 0 } : { startedAt: fl.since || nowMs() }), chip: 'Flow', focus: true });
  if (ft) return live({ title: ft.title, body: 'Em foco', startedAt: since || nowMs(), chip: 'Foco', focus: true });
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
    timerAlert('focus', task.endsAt, tx('Tempo esgotado'), t.title);
    play('powerup');
    haptic('start');
  }
  openTaskFocus();
}

// Cronômetro de uma tarefa com tempo dentro do Flow (sem abrir a tela do modo foco).
export const taskTimer = () => ({ ...task, leftSec: task.taskId ? taskLeft() : null });
export function taskTimerStart(id) {
  const t = P().byId.get(id);
  if (!t) return;
  const total = (t.duration || 30) * 60;
  setTask({ taskId: id, total, running: true, endsAt: nowMs() + total * 1000, left: total, rang: false });
  timerAlert('focus', task.endsAt, tx('Tempo esgotado'), t.title);
}
export function taskTimerPause() {
  if (!task.taskId || !task.running) return;
  setTask({ running: false, left: taskLeft() });
  timerAlert('focus', null);
}
export function taskTimerResume() {
  if (!task.taskId || task.running) return;
  setTask({ running: true, endsAt: nowMs() + task.left * 1000 });
  if (task.left > 0) timerAlert('focus', task.endsAt, tx('Tempo esgotado'), P().byId.get(task.taskId)?.title || tx('Modo foco'));
}
export function taskTimerClear() {
  if (!task.taskId) return;
  timerAlert('focus', null);
  setTask(null);
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
    <h2 translate="no">${esc(t.title)}</h2>
    <div class="pomo-dial big"><svg viewBox="0 0 280 280" aria-hidden="true"><circle cx="140" cy="140" r="130" class="pomo-track"/><circle cx="140" cy="140" r="130" class="pomo-arc" stroke-dasharray="${C}" transform="rotate(-90 140 140)"/></svg>
      <div class="pomo-time"><b data-time></b><small data-label></small></div></div>
    <div class="pomo-actions">
      <button type="button" class="btn ghost" data-stop>Sair</button>
      <button type="button" class="btn" data-pause></button>
      <button type="button" class="btn primary" data-done>${icon('check')}Concluir</button>
    </div>
    ${tickControls()}
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
  bindTickControls(overlay);
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
      if (task.left > 0) timerAlert('focus', task.endsAt, tx('Tempo esgotado'), t.title);
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

/* =====================================================================
   Cartão "Em foco" (Hoje) e escolha da tarefa
   ===================================================================== */
const ago = (ms) => {
  const m = Math.max(0, Math.floor((nowMs() - ms) / 60000));
  return m < 1 ? 'agora há pouco' : m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
};

export function focusCard(S = P()) {
  const fc = app.actions.flowCard?.(S);
  if (fc) return fc;
  const t = focusedTask(S);
  if (!t) return '';
  const f = focusOf(S);
  const timed = task.taskId === t.id;
  const pomoOn = pomo.running || pomo.left !== dur();
  return `<section class="focus-card" data-focuscard data-id="${esc(t.id)}">
    <div class="fc-top"><span class="fc-rec"><i></i>Em foco</span><span class="fc-time" data-fc-time>${f?.since ? ago(f.since) : ''}</span></div>
    <h3 translate="no">${esc(t.title)}</h3>
    <p class="fc-meta" data-fc-meta>${timed ? 'Modo foco com tempo' : pomoOn ? `Pomodoro · ${fmt(leftNow())}` : 'Sincronizado com seus outros aparelhos'}</p>
    ${fcSubs(t)}
    <div class="fc-acts">
      <button type="button" class="btn small primary" data-fc-done>${icon('check')}Concluir</button>
      ${timed ? `<button type="button" class="btn small" data-fc-open>${icon('timer')}Abrir cronômetro</button>` : `<button type="button" class="btn small" data-fc-pomo>${icon(pomo.running ? 'pause' : 'play')}${pomo.running ? 'Pausar' : pomoOn ? 'Continuar' : 'Pomodoro'}</button>`}
      <button type="button" class="btn small ghost" data-fc-stop>Parar foco</button>
    </div>
  </section>`;
}

// Subtarefas (ou itens da rotina) da tarefa em foco, marcáveis ali mesmo.
function fcSubs(t) {
  const subs = t.subtasks || [];
  if (!subs.length) return '';
  const n = subs.filter((x) => x.done).length;
  return `<div class="fc-subs"><div class="fc-subs-head"><span>${t.kind === 'routine' ? 'Itens da rotina' : 'Subtarefas'}</span><b>${n}/${subs.length}</b></div>${bar(n / subs.length, { cls: 'thin', label: 'Progresso' })}
    <ul>${subs.map((x) => `<li><label class="check mini${x.done ? ' on' : ''}"><input type="checkbox" data-fcsub="${esc(x.id)}"${x.done ? ' checked' : ''}><span translate="no">${esc(x.title)}</span></label></li>`).join('')}</ul></div>`;
}

export function bindFocusCard(el) {
  app.actions.bindFlowCard?.(el);
  const card = el.querySelector('[data-focuscard]');
  if (!card) return;
  const id = card.dataset.id;
  card.querySelectorAll('[data-fcsub]').forEach(
    (c) =>
      (c.onchange = async () => {
        c.closest('.check')?.classList.toggle('on', c.checked);
        const r = await toggleSub(id, c.dataset.fcsub);
        if (r?.done) {
          play('progress', { fraction: r.fraction });
          haptic('tick');
        } else play('uncheck');
        app.refresh();
      }),
  );
  card.querySelector('[data-fc-done]').onclick = async () => {
    if (task.taskId === id) {
      timerAlert('focus', null);
      setTask(null);
    }
    await setFocus(null);
    play('complete');
    haptic('done');
    const res = await toggleTask(id);
    if (res?.done) celebrate('Concluída', res.reward, res, { undo: () => toggleTask(id) });
  };
  card.querySelector('[data-fc-pomo]')?.addEventListener('click', () => {
    if (pomo.running) pomoPause();
    else pomoStart();
    app.refresh();
  });
  card.querySelector('[data-fc-open]')?.addEventListener('click', () => openTaskFocus());
  card.querySelector('[data-fc-stop]').onclick = async () => {
    if (task.taskId === id) {
      timerAlert('focus', null);
      setTask(null);
    }
    await focusOn(null);
    toast('Foco encerrado.');
  };
  // Atualiza o tempo sem redesenhar a tela.
  const paint = () => {
    if (!card.isConnected) return listeners.delete(paint);
    const f = focusOf();
    const tm = card.querySelector('[data-fc-time]');
    if (tm && f?.since) tm.textContent = ago(f.since);
    const meta = card.querySelector('[data-fc-meta]');
    if (meta && task.taskId !== id && (pomo.running || pomo.left !== dur())) meta.textContent = `Pomodoro · ${pomo.mode === 'focus' ? 'foco' : 'pausa'} · ${fmt(leftNow())}`;
  };
  listeners.add(paint);
  ensureTicker();
}

// Escolher a tarefa em foco (hoje, atrasadas e entrada).
export function pickFocus() {
  const S = P();
  const d = today();
  const open = S.task.filter((t) => !t.done && !t.failed && !t.archived && t.kind !== 'routine' && t.kind !== 'sprint');
  const routines = S.task.filter((t) => t.kind === 'routine' && t.due === d && !t.done && !t.archived);
  const groups = [
    ['Hoje', open.filter((t) => t.due === d)],
    ['Rotinas de hoje', routines],
    ['Atrasadas', open.filter((t) => t.due && t.due < d)],
    ['Entrada', open.filter((t) => !t.due)],
    ['Próximos dias', open.filter((t) => t.due && t.due > d).slice(0, 8)],
  ].filter(([, l]) => l.length);
  sheet({
    title: 'Focar em uma tarefa',
    body: groups.length
      ? `<p class="hint">A tarefa em foco aparece em todos os seus aparelhos, na notificação e no widget.</p>${groups
          .map(([g, l]) => `<div class="pick-group"><div class="pick-glabel">${g}</div>${l.map((t) => `<button type="button" class="pick-opt" data-fid="${esc(t.id)}"><span translate="no">${esc(t.title)}</span>${t.kind === 'routine' ? `<small>${icon('repeat', 'sm')}${(t.subtasks || []).length} itens</small>` : `<small class="prio-${esc((t.priority || 'P4').toLowerCase())}">${esc(t.priority || '')}</small>`}</button>`).join('')}</div>`)
          .join('')}`
      : '<p class="hint">Nenhuma tarefa aberta. Crie uma primeiro.</p>',
    onMount(el, close) {
      el.querySelectorAll('[data-fid]').forEach(
        (b) =>
          (b.onclick = async () => {
            close();
            await focusOn(b.dataset.fid);
          }),
      );
    },
  });
}
