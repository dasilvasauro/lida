// Flow: foco imersivo em fila. Antes de começar: a fila (hoje + atrasadas + rotinas, editável), a ordem
// (prioridade, criação ou arrastando), o que fazer quando chega o horário de uma tarefa, o tique, o
// Pomodoro e o visualizador de atividade. Depois: uma tarefa por vez em tela cheia; concluiu, a próxima
// entra. As regras ficam em core/flow.js; o estado, no registro sincronizado do foco (focus.flow).
//
// O visualizador de atividade só conta teclas e movimentos (quantos, não quais) enquanto a tela do Flow
// está aberta, desenha barras uma vez por segundo e não grava nem envia nada.
import { personal, P, app } from '../state.js';
import { saveFocus, focusOf } from '../core/focus.js';
import * as FL from '../core/flow.js';
import { toggleTask, toggleSub } from '../core/tasks.js';
import { commit } from '../core/game.js';
import { today, nowMs } from '../lib/clock.js';
import { esc, fmtDay } from '../lib/util.js';
import { icon, toast, bar } from '../ui/ui.js';
import { play } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';
import { celebrate } from './celebrate.js';
import { moodSrc } from './streak.js';
import { tickPrefs } from '../core/metronome.js';
import { fmt, onSecond, syncTick, paintChip, pomoStart, pomoPause, pomoReset, pomoState, taskTimer, taskTimerStart, taskTimerPause, taskTimerResume, taskTimerClear, openMetronome } from './focus.js';

const PK = 'lida.flow'; // escolhas da última vez (só neste aparelho)
const loadPrefs = () => {
  try {
    return { order: 'priority', sched: 'warn', tick: tickPrefs().on, pomo: false, activity: true, ...JSON.parse(localStorage.getItem(PK) || '{}') };
  } catch {
    return { order: 'priority', sched: 'warn', tick: false, pomo: false, activity: true };
  }
};
const savePrefs = (p) => {
  try {
    localStorage.setItem(PK, JSON.stringify(p));
  } catch {
    /* sem armazenamento */
  }
};

/* =====================================================================
   Estado
   ===================================================================== */
let F = null; // o Flow (o mesmo que vai para focus.flow)
let lastAt = 0;
let warn = null; // { id, until } aviso de horário (10 s)
let busy = false; // concluindo uma tarefa (a fila já avançou; não "limpar" de novo)
let ending = false;
const active = () => FL.flowActive(F);
const isTimed = (id) => P().byId.get(id)?.kind === 'timed';

function adopt() {
  const f = focusOf();
  if (!f || f.at === lastAt) return false;
  lastAt = f.at;
  const r = f.flow || null;
  if (!r) return false;
  if (!F || r.id !== F.id || (r.rev || 0) > (F.rev || 0)) {
    const was = active();
    F = r;
    if (was && !active()) closeOverlay();
    return true;
  }
  return false;
}

function commitFlow(next, { force = false } = {}) {
  const prevCur = FL.flowCur(F);
  F = { ...next, rev: (F?.rev || 0) + 1 };
  const cur = FL.flowCur(F);
  const patch = { flow: F };
  if (!active()) {
    if (taskTimer().taskId) taskTimerClear();
    Object.assign(patch, { taskId: null, since: null });
  } else if (cur !== prevCur || force) {
    const tt = taskTimer();
    if (tt.taskId && tt.taskId !== cur) taskTimerClear();
    Object.assign(patch, { taskId: cur, since: nowMs() });
    if (cur !== prevCur) warn = warn?.id === cur ? null : warn;
  }
  saveFocus(patch).then((d) => (lastAt = d.at)).catch(() => {});
  if (active() && cur && !F.paused && isTimed(cur) && taskTimer().taskId !== cur) taskTimerStart(cur);
  syncTick();
  paintChip();
  app.actions.syncLive?.();
  repaint(cur !== prevCur);
  app.refresh?.();
}

export function initFlow() {
  adopt();
  personal.subscribe(() => {
    adopt();
    if (!active() || busy || ending) return repaint(false);
    // concluída/excluída fora do Flow (widget, CLI, outra tela): sai da fila
    const c = FL.cleanFlow(F, P(), nowMs());
    if (c !== F) {
      if (!c.queue.length) return finish(c);
      commitFlow(c);
    } else repaint(false);
  });
  onSecond(second);
  Object.assign(app.actions, {
    flowTick: () => (active() ? (!F.paused && F.tick ? 'flow' : null) : undefined),
    flowPomo: (was) => {
      if (!active() || !F.pomo || F.paused) return false;
      // quem emenda o próximo ciclo é o Pomodoro (views/focus.js)
      if (was === 'focus') toast('Pausa do Pomodoro: respire. O Flow continua quando quiser.');
      return true;
    },
    flowChip,
    flowLine,
    flowCard,
    bindFlowCard,
    flow: () => (active() ? openFlow() : openFlowSetup()),
  });
}

// Uma vez por segundo: horários da fila, aviso de 10 s, relógios e atividade.
function second(tick) {
  if (!tick || !active()) return;
  const now = nowMs();
  if (!F.paused) {
    if (warn && now >= warn.until) {
      const id = warn.id;
      warn = null;
      switchTo(id, 'auto');
    } else if (!warn) {
      const due = FL.dueNow(F, P(), today(), now);
      if (due) onDue(due.id);
    }
  }
  sampleActivity();
  paintLive();
}

function onDue(id) {
  const t = P().byId.get(id);
  if (!t) return;
  if (F.sched === 'warn') {
    warn = { id, until: nowMs() + FL.WARN_SEC * 1000 };
    play('bell');
    haptic('start');
    // marca como tratada já (outro aparelho não avisa de novo)
    commitFlow({ ...F, fired: [...F.fired, id] });
  } else switchTo(id, F.sched);
}

function switchTo(id, how) {
  const t = P().byId.get(id);
  commitFlow(FL.promote(F, id, how === 'wait' ? 'wait' : 'auto', nowMs()));
  if (how === 'wait') toast(`"${t?.title || ''}" entra logo depois desta.`);
  else {
    play('powerup');
    haptic('start');
  }
}

/* =====================================================================
   Ações
   ===================================================================== */
async function doneCur() {
  const id = FL.flowCur(F);
  if (!id) return;
  const next = FL.advance(F, 'done', nowMs());
  // avança antes de concluir: o foco já passa para a próxima (não "cai" entre uma e outra)
  if (next.queue.length) commitFlow(next);
  play('complete');
  haptic('done');
  busy = true;
  const res = await toggleTask(id).finally(() => (busy = false));
  if (res?.done) {
    // no Flow, o ganho aparece no meio da tela; o aviso normal só quando sobe de nível
    popReward(res.reward);
    if (res.levelUp) celebrate('Concluída', res.reward, res);
  }
  if (!next.queue.length) finish(next);
}

function skipCur() {
  if ((F.queue || []).length < 2) return toast('É a última da fila.');
  haptic('tap');
  commitFlow(FL.advance(F, 'skip', nowMs()));
}

function togglePause() {
  const now = nowMs();
  if (F.paused) {
    const next = FL.resumeFlow(F, now);
    if (F.pomoWas) pomoStart();
    delete next.pomoWas;
    commitFlow(next);
    taskTimerResume();
    haptic('start');
  } else {
    const pomoWas = pomoState().running;
    if (pomoWas) pomoPause();
    taskTimerPause();
    commitFlow({ ...FL.pauseFlow(F, now), pomoWas });
    haptic('stop');
  }
}

async function finish(f = F) {
  if (ending || !FL.flowActive(f)) return;
  ending = true;
  const now = nowMs();
  const ended = FL.endFlow(f, now);
  const rec = FL.flowRecord(ended, today(), now);
  if (F?.pomo && pomoState().running) pomoReset('focus');
  warn = null;
  commitFlow(ended);
  syncTick();
  if (rec.done > 0 || rec.sec >= 60) await commit([{ type: 'ev', id: `ev_flow_${ended.id}`, data: rec }]).catch(() => {});
  ending = false;
  showSummary(rec);
  if (rec.cleared) {
    play('levelup');
    haptic('done');
  }
}

/* =====================================================================
   Preparação (antes de começar)
   ===================================================================== */
const PRIO_SHORT = { P0: 'P0', P1: 'P1', P2: 'P2', P3: 'P3' };

function metaOf(S, t, day) {
  const bits = [];
  if (PRIO_SHORT[t.priority]) bits.push(`<span class="prio-${t.priority.toLowerCase()}">${t.priority}</span>`);
  if (t.kind === 'routine') bits.push(`${icon('repeat', 'sm')}<span>Rotina · ${(t.subtasks || []).length} itens</span>`);
  if (t.kind === 'timed') bits.push(`${icon('timer', 'sm')}<span>${t.duration || 30} min</span>`);
  const sm = FL.schedMin(S, t, day);
  if (sm != null) bits.push(`${icon('bell', 'sm')}<span>às ${String(Math.floor(sm / 60)).padStart(2, '0')}:${String(sm % 60).padStart(2, '0')}</span>`);
  if (t.due && t.due < day) bits.push('<span class="flow-late">Atrasada</span>');
  else if (t.due && t.due > day) bits.push(`<span>${esc(fmtDay(t.due))}</span>`);
  else if (!t.due) bits.push('<span>Entrada</span>');
  return bits.join('');
}

// Lista editável: arrastar (alça), tirar e adicionar. onChange(ids, dragged)
function queueEditor(host, getIds, onChange, { lock = null } = {}) {
  const S = P();
  const day = today();
  const ids = getIds();
  const { queue, inbox, later } = FL.flowCandidates(S, day);
  const inQ = new Set([...ids, lock].filter(Boolean));
  const out = [...queue, ...inbox, ...later].filter((t) => !inQ.has(t.id));
  const groups = [
    ['Hoje e atrasadas', out.filter((t) => t.due && t.due <= day)],
    ['Entrada', out.filter((t) => !t.due)],
    ['Próximos dias', out.filter((t) => t.due && t.due > day).slice(0, 20)],
  ].filter(([, l]) => l.length);
  const open = host.querySelector('.flow-add')?.hidden === false;
  host.innerHTML = `${
    ids.length
      ? `<ol class="flow-q">${ids
          .map((id, i) => {
            const t = S.byId.get(id);
            if (!t) return '';
            return `<li class="flow-qi" data-qid="${esc(id)}">
              <button type="button" class="flow-grip" data-grip aria-label="Arrastar para mudar a ordem (setas para cima e para baixo)">${icon('grip')}</button>
              <span class="flow-qn">${i + 1 + (lock ? 1 : 0)}</span>
              <span class="flow-qt"><b translate="no">${esc(t.title)}</b><small>${metaOf(S, t, day)}</small></span>
              <button type="button" class="icon-btn" data-qrm aria-label="Tirar da fila">${icon('x', 'sm')}</button>
            </li>`;
          })
          .join('')}</ol>`
      : `<p class="hint flow-empty">${lock ? 'Depois desta, a fila acaba.' : 'Nada na fila. Adicione tarefas da Entrada ou de outros dias.'}</p>`
  }
    ${groups.length ? `<button type="button" class="link flow-addbtn" data-qadd aria-expanded="${open}">${icon('plus', 'sm')}Adicionar à fila</button>` : ''}
    <div class="flow-add"${open ? '' : ' hidden'}>${groups
      .map(([g, l]) => `<div class="pick-group"><div class="pick-glabel">${g}</div>${l.map((t) => `<button type="button" class="pick-opt" data-qput="${esc(t.id)}"><span translate="no">${esc(t.title)}</span><small>${metaOf(S, t, day)}</small></button>`).join('')}</div>`)
      .join('')}</div>`;
  const list = host.querySelector('.flow-q');
  const current = () => [...host.querySelectorAll('.flow-qi')].map((li) => li.dataset.qid);
  host.querySelectorAll('[data-qrm]').forEach(
    (b) =>
      (b.onclick = () => {
        haptic('tap');
        onChange(
          getIds().filter((x) => x !== b.closest('.flow-qi').dataset.qid),
          false,
          { removed: b.closest('.flow-qi').dataset.qid },
        );
      }),
  );
  host.querySelectorAll('[data-qput]').forEach(
    (b) =>
      (b.onclick = () => {
        haptic('add');
        onChange([...getIds(), b.dataset.qput], false, { added: b.dataset.qput });
      }),
  );
  const add = host.querySelector('[data-qadd]');
  if (add)
    add.onclick = () => {
      const box = host.querySelector('.flow-add');
      box.hidden = !box.hidden;
      add.setAttribute('aria-expanded', String(!box.hidden));
    };
  if (!list) return;
  // Arrastar pela alça (mouse ou dedo); setas do teclado também movem.
  list.querySelectorAll('[data-grip]').forEach((g) => {
    const li = g.closest('.flow-qi');
    g.onkeydown = (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const sib = e.key === 'ArrowUp' ? li.previousElementSibling : li.nextElementSibling;
      if (!sib) return;
      if (e.key === 'ArrowUp') li.after(sib);
      else li.before(sib);
      onChange(current(), true);
      host.querySelector(`[data-qid="${CSS.escape(li.dataset.qid)}"] [data-grip]`)?.focus();
    };
    g.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      g.setPointerCapture(e.pointerId);
      const before = current().join();
      li.classList.add('dragging');
      haptic('start');
      const move = (ev) => {
        const y = ev.clientY;
        const prev = li.previousElementSibling;
        const next = li.nextElementSibling;
        // move o vizinho (e não a linha arrastada): assim o arraste não perde o ponteiro
        if (prev && y < prev.getBoundingClientRect().top + prev.offsetHeight / 2) li.after(prev);
        else if (next && y > next.getBoundingClientRect().top + next.offsetHeight / 2) li.before(next);
      };
      const up = () => {
        g.removeEventListener('pointermove', move);
        g.removeEventListener('pointerup', up);
        g.removeEventListener('pointercancel', up);
        li.classList.remove('dragging');
        if (current().join() !== before) {
          haptic('tick');
          onChange(current(), true);
        }
      };
      g.addEventListener('pointermove', move);
      g.addEventListener('pointerup', up);
      g.addEventListener('pointercancel', up);
    });
  });
}

const SCHED_TEXT = {
  warn: ['Avisar e trocar', 'Conta 10 s e troca; a atual volta para o topo.'],
  auto: ['Trocar na hora', 'Ela começa assim que der o horário.'],
  wait: ['Esperar a atual', 'Ela entra quando você terminar a atual.'],
};

export function openFlowSetup() {
  if (active()) return openFlow();
  const p = loadPrefs();
  const S = P();
  const day = today();
  let order = p.order;
  let ids = FL.orderFlow(FL.flowCandidates(S, day).queue, order).map((t) => t.id);
  const pomo = pomoState();
  const ov = mount('setup');
  ov.querySelector('.flow-inner').innerHTML = `
    <header class="flow-head"><span class="flow-tag">${icon('flow')}<span>Flow</span></span><button type="button" class="icon-btn" data-fx aria-label="Fechar">${icon('x')}</button></header>
    <p class="flow-lede">Uma tarefa por vez, em tela cheia. Terminou, a próxima já aparece.</p>
    <section class="flow-sec">
      <h3>Ordem</h3>
      <div class="seg small flow-order" role="radiogroup" aria-label="Ordem">${[
        ['priority', 'Prioridade'],
        ['created', 'Criação'],
        ['custom', 'Personalizada'],
      ]
        .map(([k, l]) => `<button type="button" role="radio" data-order="${k}">${l}</button>`)
        .join('')}</div>
      <small class="hint" data-orderhint></small>
    </section>
    <section class="flow-sec"><h3>Fila <span class="count" data-qcount></span></h3><div data-queue></div></section>
    <section class="flow-sec">
      <h3>Quando chegar o horário de uma tarefa</h3>
      <div class="flow-opts" role="radiogroup" aria-label="Quando chegar o horário de uma tarefa">${FL.FLOW_SCHED.map(
        (k) => `<label class="flow-opt"><input type="radio" name="flsched" value="${k}"${p.sched === k ? ' checked' : ''}><span><b>${SCHED_TEXT[k][0]}</b><small>${SCHED_TEXT[k][1]}</small></span></label>`,
      ).join('')}</div>
    </section>
    <section class="flow-sec flow-toggles">
      <label class="set-row"><span class="grow">Tique do relógio<small>O metrônomo toca enquanto o Flow corre <button type="button" class="link" data-metro>Ajustar</button></small></span><span class="toggle"><input type="checkbox" data-opt="tick"${p.tick ? ' checked' : ''} aria-label="Tique do relógio"><i></i></span></label>
      <label class="set-row"><span class="grow">Pomodoro<small>Ciclos de ${pomo.focusMin} min de foco e ${pomo.breakMin} de pausa, emendados</small></span><span class="toggle"><input type="checkbox" data-opt="pomo"${p.pomo ? ' checked' : ''} aria-label="Pomodoro"><i></i></span></label>
      <label class="set-row"><span class="grow">Visualizador de atividade<small>Barras quando você digita ou mexe o mouse. Nada é gravado.</small></span><span class="toggle"><input type="checkbox" data-opt="activity"${p.activity ? ' checked' : ''} aria-label="Visualizador de atividade"><i></i></span></label>
    </section>
    <div class="flow-go"><button type="button" class="btn primary" data-go>${icon('play')}<span>Começar Flow</span></button></div>`;
  const $ = (s) => ov.querySelector(s);
  const paintOrder = () => {
    ov.querySelectorAll('[data-order]').forEach((b) => {
      const on = b.dataset.order === order;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on);
    });
    $('[data-orderhint]').textContent = order === 'custom' ? 'Arraste pela alça para mudar a ordem.' : order === 'created' ? 'As mais antigas primeiro.' : 'Prioridade mais alta primeiro; depois, o horário.';
    $('[data-qcount]').textContent = ids.length || '';
    $('[data-go]').disabled = !ids.length;
  };
  const paintQueue = () =>
    queueEditor(
      $('[data-queue]'),
      () => ids,
      (next, dragged) => {
        ids = next;
        if (dragged) order = 'custom';
        paintQueue();
        paintOrder();
      },
    );
  paintQueue();
  paintOrder();
  ov.querySelectorAll('[data-order]').forEach(
    (b) =>
      (b.onclick = () => {
        order = b.dataset.order;
        if (order !== 'custom') ids = FL.orderFlow(ids.map((id) => P().byId.get(id)).filter(Boolean), order).map((t) => t.id);
        haptic('tap');
        paintQueue();
        paintOrder();
      }),
  );
  $('[data-metro]').onclick = (e) => {
    e.preventDefault();
    openMetronome();
  };
  $('[data-fx]').onclick = closeOverlay;
  $('[data-go]').onclick = () => {
    const opts = { order, sched: ov.querySelector('[name=flsched]:checked')?.value || 'warn', tick: $('[data-opt=tick]').checked, pomo: $('[data-opt=pomo]').checked, activity: $('[data-opt=activity]').checked };
    savePrefs(opts);
    start({ ...opts, ids });
  };
}

function start(opts) {
  if (!opts.ids.length) return;
  // o modo foco de uma tarefa (se estiver aberto) dá lugar ao Flow
  if (taskTimer().taskId) taskTimerClear();
  if (opts.pomo && !pomoState().running) {
    pomoReset('focus');
    pomoStart();
  }
  warn = null;
  F = null;
  commitFlow(FL.newFlow(opts, nowMs()), { force: true });
  play('powerup');
  haptic('start');
  phase('run');
}

/* =====================================================================
   Tela do Flow
   ===================================================================== */
let ov = null;
let ph = null;

function mount(p) {
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'flow-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Flow');
    ov.innerHTML = '<div class="flow-inner"></div>';
    document.body.appendChild(ov);
    document.body.classList.add('in-flow');
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => ov?.classList.add('open'));
  }
  ph = p;
  ov.dataset.phase = p;
  ov.scrollTop = 0;
  return ov;
}

function onKey(e) {
  if (e.key !== 'Escape' || document.querySelector('.sheet-wrap.open')) return;
  if (ov?.querySelector('[data-drawer]:not([hidden])')) return toggleDrawer(false);
  closeOverlay();
}

function closeOverlay() {
  if (!ov) return;
  actStop();
  document.removeEventListener('keydown', onKey);
  document.body.classList.remove('in-flow');
  const o = ov;
  ov = null;
  ph = null;
  o.classList.remove('open');
  setTimeout(() => o.remove(), 250);
}

export function openFlow() {
  if (!active()) return openFlowSetup();
  phase('run');
}

function phase(p) {
  if (p === 'run') {
    mount('run');
    renderRun();
  }
}

function renderRun() {
  const inner = ov.querySelector('.flow-inner');
  inner.innerHTML = `
    <header class="flow-top">
      <span class="flow-tag">${icon('flow')}<span>Flow</span></span>
      <span class="flow-count" data-fcount></span>
      <span class="flow-clock" data-clock title="Tempo de Flow (sem as pausas)"></span>
      <span class="grow"></span>
      <button type="button" class="icon-btn" data-qopen aria-label="Fila">${icon('list')}</button>
      <button type="button" class="icon-btn" data-min aria-label="Minimizar">${icon('down')}</button>
    </header>
    <div class="flow-prog" data-prog aria-hidden="true"></div>
    <div class="flow-warn" data-warn hidden></div>
    <div class="flow-stage" data-stage></div>
    <div class="flow-pomo" data-pomo hidden></div>
    <div class="flow-acts">
      <button type="button" class="btn ghost" data-skip>${icon('right')}Pular</button>
      <button type="button" class="btn primary" data-done>${icon('check')}Concluir</button>
    </div>
    <div class="flow-ctrl">
      <button type="button" class="chip" data-pause></button>
      <button type="button" class="chip tick-toggle" data-ftick aria-pressed="false">${icon('timer', 'sm')}<span>Tique</span></button>
      <button type="button" class="chip" data-fact aria-pressed="false">${icon('chart', 'sm')}<span>Atividade</span></button>
      <button type="button" class="chip" data-end>${icon('stop', 'sm')}<span>Encerrar</span></button>
    </div>
    <p class="flow-next" data-next></p>
    <div class="flow-act" data-act hidden><div class="flow-bars" data-bars aria-hidden="true"></div><span class="flow-actl" data-actl role="status"></span></div>
    <div class="flow-paused" data-paused hidden>
      <div class="flow-pbox">${icon('pause')}<h2>Flow pausado</h2><p class="hint">Os relógios pararam. A fila continua do mesmo ponto.</p>
        <button type="button" class="btn primary" data-resume>${icon('play')}Continuar</button>
        <button type="button" class="link" data-end2>Encerrar o Flow</button></div>
    </div>
    <aside class="flow-drawer" data-drawer hidden aria-label="Fila">
      <header class="flow-head"><h3>Fila</h3><button type="button" class="icon-btn" data-qclose aria-label="Fechar">${icon('x')}</button></header>
      <div class="flow-dcur" data-dcur></div>
      <div data-dqueue></div>
    </aside>`;
  const $ = (s) => inner.querySelector(s);
  $('[data-min]').onclick = closeOverlay;
  $('[data-done]').onclick = () => doneCur();
  $('[data-skip]').onclick = skipCur;
  $('[data-pause]').onclick = togglePause;
  $('[data-resume]').onclick = togglePause;
  const end = async () => {
    haptic('stop');
    await finish(F);
  };
  $('[data-end]').onclick = end;
  $('[data-end2]').onclick = end;
  $('[data-ftick]').onclick = () => {
    commitFlow({ ...F, tick: !F.tick });
    haptic('tap');
  };
  $('[data-fact]').onclick = () => {
    commitFlow({ ...F, activity: !F.activity });
    haptic('tap');
  };
  $('[data-qopen]').onclick = () => toggleDrawer(true);
  $('[data-qclose]').onclick = () => toggleDrawer(false);
  repaint(true);
}

function toggleDrawer(open) {
  const d = ov?.querySelector('[data-drawer]');
  if (!d) return;
  d.hidden = !open;
  if (open) paintDrawer();
}

function paintDrawer() {
  const d = ov?.querySelector('[data-drawer]');
  if (!d || d.hidden || !active()) return;
  const cur = P().byId.get(FL.flowCur(F));
  d.querySelector('[data-dcur]').innerHTML = cur ? `<small>Agora</small><b translate="no">${esc(cur.title)}</b>` : '';
  queueEditor(
    d.querySelector('[data-dqueue]'),
    () => F.queue.slice(1),
    (next, dragged, ch = {}) => commitFlow({ ...F, queue: [F.queue[0], ...next], ...(dragged ? { order: 'custom' } : {}), total: Math.max(0, F.total + (ch.added ? 1 : 0) - (ch.removed ? 1 : 0)) }),
    { lock: F.queue[0] },
  );
}

// Redesenha a tela (newCur: a tarefa atual mudou → entra com animação).
function repaint(newCur) {
  if (!ov || ph !== 'run') return;
  if (!active()) return;
  const S = P();
  const $ = (s) => ov.querySelector(s);
  const cur = S.byId.get(FL.flowCur(F));
  const stage = $('[data-stage]');
  if (stage && (newCur || stage.dataset.cur !== cur?.id)) {
    stage.dataset.cur = cur?.id || '';
    stage.innerHTML = cur ? curCard(S, cur) : '';
    bindCur(stage, cur);
  } else if (stage && cur) {
    // só as subtarefas (marcadas aqui ou em outro aparelho)
    const subs = stage.querySelector('[data-subs]');
    if (subs) subs.outerHTML = subsBlock(cur);
    bindCur(stage, cur, true);
  }
  const done = F.done.length;
  const total = done + F.queue.length;
  $('[data-fcount]').textContent = `${done} de ${total}`;
  $('[data-prog]').innerHTML = Array.from({ length: Math.min(total, 40) }, (_, i) => `<i class="${i < done ? 'on' : i === done ? 'cur' : ''}"></i>`).join('');
  const next = F.queue.slice(1);
  const nt = S.byId.get(next[0]);
  $('[data-next]').innerHTML = nt ? `<span>Próxima na fila</span> <b translate="no">${esc(nt.title)}</b>${next.length > 1 ? ` <small>+${next.length - 1}</small>` : ''}` : '<span>Última da fila</span>';
  $('[data-pause]').innerHTML = F.paused ? `${icon('play', 'sm')}<span>Continuar</span>` : `${icon('pause', 'sm')}<span>Pausar Flow</span>`;
  const tk = $('[data-ftick]');
  tk.classList.toggle('on', !!F.tick);
  tk.setAttribute('aria-pressed', String(!!F.tick));
  const fa = $('[data-fact]');
  fa.classList.toggle('on', !!F.activity);
  fa.setAttribute('aria-pressed', String(!!F.activity));
  $('[data-paused]').hidden = !F.paused;
  ov.classList.toggle('paused', !!F.paused);
  $('[data-skip]').disabled = F.queue.length < 2;
  const showAct = F.activity && !F.paused;
  $('[data-act]').hidden = !showAct;
  if (showAct) actStart();
  else actStop();
  paintDrawer();
  paintLive();
}

// Primeira linha das notas, sem as marcas de formatação (lista, caixa, negrito).
const noteLine = (n) => {
  const l = String(n || '')
    .split('\n')
    .map((x) => x.replace(/^\s*(?:[-*+]\s+)?(?:\[[ xX]\]\s*)?/, '').replace(/[*_`#>]+/g, '').trim())
    .find(Boolean);
  return l ? (l.length > 140 ? `${l.slice(0, 139)}…` : l) : '';
};

function curCard(S, t) {
  const day = today();
  const timed = t.kind === 'timed';
  const C = 2 * Math.PI * 130;
  return `<article class="flow-card">
    <div class="flow-badges">${metaOf(S, t, day)}</div>
    <h2 translate="no">${esc(t.title)}</h2>
    ${noteLine(t.notes) ? `<p class="flow-notes" translate="no">${esc(noteLine(t.notes))}</p>` : ''}
    ${
      timed
        ? `<div class="pomo-dial flow-dial"><svg viewBox="0 0 280 280" aria-hidden="true"><circle cx="140" cy="140" r="130" class="pomo-track"/><circle cx="140" cy="140" r="130" class="pomo-arc" stroke-dasharray="${C}" transform="rotate(-90 140 140)"/></svg>
        <div class="pomo-time"><b data-ttime></b><small data-tlabel></small></div></div>`
        : `<div class="flow-time"><b data-ctime></b><small>nesta tarefa</small></div>`
    }
    ${subsBlock(t)}
  </article>`;
}

function subsBlock(t) {
  const subs = t.subtasks || [];
  if (!subs.length) return '<div data-subs hidden></div>';
  const n = subs.filter((x) => x.done).length;
  return `<div class="flow-subs" data-subs><div class="fc-subs-head"><span>${t.kind === 'routine' ? 'Itens da rotina' : 'Subtarefas'}</span><b>${n}/${subs.length}</b></div>${bar(n / subs.length, { cls: 'thin', label: 'Progresso' })}
    <ul>${subs.map((x) => `<li><label class="check mini${x.done ? ' on' : ''}"><input type="checkbox" data-flsub="${esc(x.id)}"${x.done ? ' checked' : ''}><span translate="no">${esc(x.title)}</span></label></li>`).join('')}</ul></div>`;
}

function bindCur(stage, t, subsOnly = false) {
  if (!t) return;
  stage.querySelectorAll('[data-flsub]').forEach(
    (c) =>
      (c.onchange = async () => {
        c.closest('.check')?.classList.toggle('on', c.checked);
        const r = await toggleSub(t.id, c.dataset.flsub);
        if (r?.done) {
          play('progress', { fraction: r.fraction });
          haptic('tick');
        } else play('uncheck');
      }),
  );
  if (!subsOnly) {
    const card = stage.querySelector('.flow-card');
    if (card && !matchMedia('(prefers-reduced-motion: reduce)').matches) card.classList.add('enter');
  }
}

// O que muda a cada segundo (sem redesenhar a tela).
function paintLive() {
  if (!ov || ph !== 'run' || !active()) return;
  const now = nowMs();
  const $ = (s) => ov.querySelector(s);
  $('[data-clock]').textContent = fmt(FL.flowElapsed(F, now) / 1000);
  const ct = $('[data-ctime]');
  if (ct) ct.textContent = fmt(FL.curElapsed(F, now) / 1000);
  const tt = taskTimer();
  const tb = $('[data-ttime]');
  if (tb && tt.taskId === FL.flowCur(F)) {
    const left = tt.leftSec;
    tb.textContent = left >= 0 ? fmt(left) : `+${fmt(-left)}`;
    $('[data-tlabel]').textContent = left >= 0 ? (tt.running ? 'restantes' : 'pausado') : 'tempo extra';
    const C = 2 * Math.PI * 130;
    $('.flow-dial .pomo-arc').style.strokeDashoffset = String(C * (1 - Math.max(0, left) / (tt.total || 1)));
    ov.classList.toggle('over', left < 0);
  } else ov.classList.remove('over');
  // Pomodoro
  const pb = $('[data-pomo]');
  const p = pomoState();
  const pOn = F.pomo || p.running;
  pb.hidden = !pOn;
  if (pOn) {
    pb.classList.toggle('brk', p.mode === 'break');
    pb.innerHTML = `${icon('timer', 'sm')}<span>${p.mode === 'focus' ? 'Pomodoro · foco' : 'Pausa do Pomodoro'}</span><b>${fmt(p.leftSec)}</b>${p.running ? '' : '<small>parado</small>'}`;
  }
  // aviso de horário
  const w = $('[data-warn]');
  if (warn && !F.paused) {
    const t = P().byId.get(warn.id);
    const n = Math.max(0, Math.ceil((warn.until - now) / 1000));
    w.hidden = false;
    if (w.dataset.id !== warn.id) {
      w.dataset.id = warn.id;
      w.innerHTML = `${icon('bell')}<span class="grow"><b translate="no">${esc(t?.title || '')}</b><small>Chegou a hora. Troca em <b data-wn></b> s; a atual volta para o topo.</small></span>
        <button type="button" class="btn small primary" data-wnow>Trocar agora</button><button type="button" class="btn small ghost" data-wlater>Depois desta</button>`;
      w.querySelector('[data-wnow]').onclick = () => {
        const id = warn?.id;
        warn = null;
        if (id) switchTo(id, 'auto');
      };
      w.querySelector('[data-wlater]').onclick = () => {
        const id = warn?.id;
        warn = null;
        if (id) switchTo(id, 'wait');
      };
    }
    w.querySelector('[data-wn]').textContent = n;
  } else if (!w.hidden) {
    w.hidden = true;
    w.dataset.id = '';
  }
}

/* ---------- Ganho da tarefa (dentro do Flow, sem cobrir a tela) ---------- */
function popReward(r) {
  if (!ov || !r || (!r.xp && !r.gold)) return;
  const el = document.createElement('div');
  el.className = 'flow-pop';
  el.innerHTML = [r.xp ? `+${r.xp} XP` : '', r.gold ? `+${r.gold} ${icon('coin', 'sm')}` : ''].filter(Boolean).join(' · ');
  ov.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

/* ---------- Resumo ---------- */
function showSummary(rec) {
  actStop();
  const o = mount('summary');
  const min = Math.round(rec.sec / 60);
  const time = rec.sec < 60 ? `${rec.sec} s` : min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`;
  o.querySelector('.flow-inner').innerHTML = `<div class="flow-sum">
    <img src="${moodSrc(rec.done ? 'feito' : 'pijama')}" alt="" width="120" height="120" onerror="this.remove()">
    <h2>${rec.cleared ? 'Fila zerada!' : 'Flow encerrado'}</h2>
    <ul class="flow-stats">
      <li><b>${rec.done}</b><span>Concluídas</span></li>
      <li><b>${time}</b><span>Tempo de Flow</span></li>
      <li><b>${rec.skipped}</b><span>Puladas</span></li>
      <li><b>${rec.pauses}</b><span>Pausas</span></li>
    </ul>
    <button type="button" class="btn primary" data-sumok>Fechar</button>
  </div>`;
  o.querySelector('[data-sumok]').onclick = () => {
    closeOverlay();
    app.refresh?.();
  };
  setTimeout(() => o.querySelector('[data-sumok]')?.focus(), 300);
}

/* =====================================================================
   Visualizador de atividade (leve: contadores + barras 1x por segundo)
   ===================================================================== */
const ACT_N = 36;
let act = null;
const bump = (k) => (e) => {
  if (!act) return;
  act[k]++;
  act.last = Date.now();
  if (k === 'keys') act.lastKey = act.last;
  else act.lastMove = act.last;
  if (k === 'clicks' && e?.target?.closest?.('.flow-overlay')) act.lastMove = act.last;
};
const H = { keys: bump('keys'), moves: bump('moves'), clicks: bump('clicks'), wheel: bump('moves') };
const LOPT = { passive: true, capture: true };

function actStart() {
  if (act || !ov) return;
  const t = Date.now();
  act = { keys: 0, moves: 0, clicks: 0, last: t, lastKey: 0, lastMove: 0, hist: Array(ACT_N).fill([0, '']) };
  document.addEventListener('keydown', H.keys, LOPT);
  document.addEventListener('pointermove', H.moves, LOPT);
  document.addEventListener('touchmove', H.moves, LOPT);
  document.addEventListener('pointerdown', H.clicks, LOPT);
  document.addEventListener('wheel', H.wheel, LOPT);
  const host = ov.querySelector('[data-bars]');
  if (host) host.innerHTML = Array.from({ length: ACT_N }, () => '<i></i>').join('');
  paintAct();
}
function actStop() {
  if (!act) return;
  act = null;
  document.removeEventListener('keydown', H.keys, LOPT);
  document.removeEventListener('pointermove', H.moves, LOPT);
  document.removeEventListener('touchmove', H.moves, LOPT);
  document.removeEventListener('pointerdown', H.clicks, LOPT);
  document.removeEventListener('wheel', H.wheel, LOPT);
}
// Quanto aconteceu no último segundo (0 a 1) e o tipo: k (teclado), m (mouse/toque) ou nada.
export function actLevel({ keys = 0, moves = 0, clicks = 0 }) {
  const v = Math.min(1, keys * 0.2 + clicks * 0.25 + moves / 45);
  return [v, keys > 0 ? 'k' : moves + clicks > 0 ? 'm' : ''];
}
function sampleActivity() {
  if (!act) return;
  const s = document.hidden ? [0, ''] : actLevel(act);
  act.keys = act.moves = act.clicks = 0;
  act.hist = [...act.hist.slice(1), s];
  paintAct();
}
function paintAct() {
  if (!act || !ov) return;
  const bars = ov.querySelectorAll('[data-bars] i');
  act.hist.forEach(([v, k], i) => {
    const b = bars[i];
    if (!b) return;
    b.style.setProperty('--v', (0.06 + v * 0.94).toFixed(2));
    b.className = k;
  });
  const now = Date.now();
  const idle = now - act.last;
  const st = now - act.lastKey < 1600 ? 'typing' : now - act.lastMove < 1600 ? 'moving' : idle > 5000 ? 'idle' : ov.querySelector('[data-act]')?.dataset.st || 'idle';
  const box = ov.querySelector('[data-act]');
  if (box) box.dataset.st = st;
  const l = ov.querySelector('[data-actl]');
  if (l) {
    const mins = Math.floor(idle / 60000);
    const txt = st === 'typing' ? 'Digitando' : st === 'moving' ? 'Mexendo' : mins >= 1 ? `Parado há ${mins} min` : 'Parado';
    if (l.textContent !== txt) l.textContent = txt;
  }
}

/* =====================================================================
   Fora da tela do Flow: chip do topo, cartão em Hoje e notificação
   ===================================================================== */
function flowChip(chip) {
  if (!active()) return false;
  const tt = taskTimer();
  const left = tt.taskId && tt.taskId === FL.flowCur(F) ? tt.leftSec : null;
  chip.hidden = false;
  chip.dataset.kind = 'flow';
  chip.innerHTML = `${icon(F.paused ? 'pause' : 'flow')}<span>${F.done.length}/${F.done.length + F.queue.length}${left != null ? ` · ${left >= 0 ? fmt(left) : '+' + fmt(-left)}` : ''}</span>`;
  chip.onclick = () => openFlow();
  return true;
}

function flowLine() {
  if (!active()) return null;
  const total = F.done.length + F.queue.length;
  return { body: `${F.paused ? 'Flow pausado' : 'Flow'} · ${F.done.length + 1} de ${total}`, since: F.curSince, paused: !!F.paused };
}

function flowCard(S = P()) {
  if (!active()) return '';
  const cur = S.byId.get(FL.flowCur(F));
  const done = F.done.length;
  const total = done + F.queue.length;
  return `<section class="flow-tcard${F.paused ? ' paused' : ''}" data-flowcard>
    <div class="fc-top"><span class="flow-tag">${icon('flow', 'sm')}<span>Flow</span></span><span class="fc-time">${F.paused ? 'Pausado' : `${done} de ${total}`}</span></div>
    ${cur ? `<h3 translate="no">${esc(cur.title)}</h3>` : ''}
    ${bar(total ? done / total : 0, { cls: 'thin', label: 'Progresso' })}
    <div class="fc-acts">
      <button type="button" class="btn small primary" data-fl-open>${icon('flow')}Voltar ao Flow</button>
      <button type="button" class="btn small" data-fl-pause>${icon(F.paused ? 'play' : 'pause')}${F.paused ? 'Continuar' : 'Pausar'}</button>
    </div>
  </section>`;
}

function bindFlowCard(el) {
  const card = el.querySelector('[data-flowcard]');
  if (!card) return;
  card.querySelector('[data-fl-open]').onclick = () => openFlow();
  card.querySelector('[data-fl-pause]').onclick = () => togglePause();
}

/* ---------- Comandos (CLI, widget, bandeja) ---------- */
export async function flowCommand(action) {
  if (action === 'open') {
    openFlow();
    return FL.flowSummary(P(), F, nowMs()) || { active: false };
  }
  if (!active()) {
    if (action === 'start') {
      const p = loadPrefs();
      const ids = FL.orderFlow(FL.flowCandidates(P(), today()).queue, p.order === 'custom' ? 'priority' : p.order).map((t) => t.id);
      if (!ids.length) throw new Error('Nada na fila de hoje.');
      start({ ...p, ids });
      closeOverlay();
    } else if (action && action !== 'status') throw new Error('Nenhum Flow em andamento.');
  } else if (action === 'done') await doneCur();
  else if (action === 'skip') skipCur();
  else if (action === 'pause' && !F.paused) togglePause();
  else if (action === 'resume' && F.paused) togglePause();
  else if (action === 'toggle') togglePause();
  else if (action === 'stop') {
    await finish(F);
    closeOverlay();
  }
  return FL.flowSummary(P(), F, nowMs()) || { active: false };
}
