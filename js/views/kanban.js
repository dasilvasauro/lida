// Quadro (Kanban): as tarefas em colunas, agrupadas por data, prioridade ou projeto.
// Hoje, Planejar e cada projeto têm o botão Lista/Quadro, lembrado por tela neste aparelho.
// Arrastar um cartão para outra coluna muda a data, a prioridade ou o projeto da tarefa.
// No mouse, é só arrastar; no toque, segure o cartão um instante e arraste (soltar sem mover edita).
import { P, app, personal } from '../state.js';
import { PRIORITIES, PRIORITY_RANK, taskOpen, recurrenceLabel } from '../core/model.js';
import { saveTask, strip, checkTask } from '../core/tasks.js';
import { today } from '../lib/clock.js';
import { esc, addDays, relDay, fmtTime } from '../lib/util.js';
import { icon, toast } from '../ui/ui.js';
import { plainPreview } from '../ui/rich.js';
import { haptic } from '../ui/haptics.js';
import { play } from '../core/sound.js';
import { focusOf } from '../core/focus.js';
import { onCheck, openTask, editTask, quickAdd, bindQuick } from './tasks.js';

/* ---------- Preferências (por tela, neste aparelho) ---------- */
const KEY = 'lida.views';
const BYS = { data: 'Data', prioridade: 'Prioridade', projeto: 'Projeto' };
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};
// screen: 'hoje' | 'planejar' | 'projeto' | 'painel' (Hoje e Planejar juntos, em telas largas)
export function viewPref(screen) {
  const v = read()[screen] || {};
  const by = v.by && BYS[v.by] && !(screen === 'projeto' && v.by === 'projeto') ? v.by : screen === 'planejar' || screen === 'painel' ? 'data' : 'prioridade';
  return { mode: v.mode === 'board' ? 'board' : 'list', by };
}
function setViewPref(screen, patch) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [screen]: { ...viewPref(screen), ...patch } }));
  } catch {
    /* sem armazenamento */
  }
}
export const isBoardMode = (screen) => viewPref(screen).mode === 'board';

// Barra com Lista/Quadro e, no quadro, o "Agrupar por".
export function viewBar(screen) {
  const v = viewPref(screen);
  const bys = Object.entries(BYS).filter(([k]) => !(screen === 'projeto' && k === 'projeto'));
  return `<div class="kb-bar" data-kbbar="${screen}">
    <div class="seg small kb-mode" role="group" aria-label="Forma de ver">
      <button type="button" data-vmode="list" class="${v.mode === 'list' ? 'on' : ''}" aria-pressed="${v.mode === 'list'}">${icon('list')}Lista</button>
      <button type="button" data-vmode="board" class="${v.mode === 'board' ? 'on' : ''}" aria-pressed="${v.mode === 'board'}">${icon('grid')}Quadro</button>
    </div>
    ${v.mode === 'board' ? `<label class="kb-by"><span>Agrupar por</span><select data-kbby aria-label="Agrupar por">${bys.map(([k, l]) => `<option value="${k}"${v.by === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
  </div>`;
}
export function bindViewBar(root) {
  const bar = root.querySelector('[data-kbbar]');
  if (!bar) return;
  const screen = bar.dataset.kbbar;
  bar.querySelectorAll('[data-vmode]').forEach(
    (b) =>
      (b.onclick = () => {
        if (b.classList.contains('on')) return;
        setViewPref(screen, { mode: b.dataset.vmode });
        haptic('tick');
        app.refresh();
      }),
  );
  bar.querySelector('[data-kbby]')?.addEventListener('change', (e) => {
    setViewPref(screen, { by: e.target.value });
    haptic('tick');
    app.refresh();
  });
}

/* ---------- Colunas ---------- */
const byPri = (a, b) => (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4);
const byDue = (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (a.time || '99').localeCompare(b.time || '99');

// scope: { screen, projectId? }. Devolve [{ key, title, sub, tone, drop, add, tasks }].
function columns(S, scope, by) {
  const day = today();
  const d1 = addDays(day, 1);
  const d6 = addDays(day, 6);
  let pool = S.task.filter((t) => taskOpen(t) && t.kind !== 'sprint');
  if (scope.screen === 'hoje') pool = pool.filter((t) => t.due && (t.due <= day || (by === 'data' && t.due === d1)));
  else pool = pool.filter((t) => t.kind !== 'routine');
  if (scope.projectId) pool = pool.filter((t) => t.projectId === scope.projectId);
  const base = scope.screen === 'hoje' && by !== 'data' ? { due: day } : scope.projectId ? { projectId: scope.projectId } : {};
  const cols = [];
  if (by === 'data') {
    const late = pool.filter((t) => t.due && t.due < day);
    if (late.length) cols.push({ key: 'late', title: 'Atrasadas', tone: 'neg', tasks: late.sort(byDue), drop: null, add: null });
    cols.push({ key: 'today', title: 'Hoje', tone: 'acc', drop: { due: day }, tasks: pool.filter((t) => t.due === day) });
    cols.push({ key: 'tomorrow', title: 'Amanhã', drop: { due: d1 }, tasks: pool.filter((t) => t.due === d1) });
    if (scope.screen !== 'hoje') {
      cols.push({ key: 'week', title: 'Esta semana', sub: `até ${relDay(d6, day).toLowerCase()}`, drop: { due: addDays(day, 2) }, tasks: pool.filter((t) => t.due > d1 && t.due <= d6).sort(byDue) });
      cols.push({ key: 'later', title: 'Depois', drop: { due: addDays(day, 7) }, tasks: pool.filter((t) => t.due > d6).sort(byDue) });
      cols.push({ key: 'nodate', title: 'Sem data', tone: 'dim', drop: { due: null }, tasks: pool.filter((t) => !t.due) });
    }
    for (const c of cols) {
      if (c.key !== 'week' && c.key !== 'later' && c.key !== 'late') c.tasks.sort(byPri);
      if (c.drop && c.add === undefined) c.add = { ...base, ...(c.drop.due ? { due: c.drop.due } : {}) };
    }
  } else if (by === 'prioridade') {
    for (const p of PRIORITIES)
      cols.push({ key: p.id, title: p.id === 'P4' ? 'Sem prioridade' : `${p.short} · ${p.name}`, tone: p.tone, drop: { priority: p.id }, add: { ...base, priority: p.id }, tasks: pool.filter((t) => (t.priority || 'P4') === p.id).sort(byDue) });
  } else {
    const projs = S.project.filter((p) => !p.archived);
    cols.push({ key: 'none', title: 'Sem projeto', tone: 'dim', drop: { projectId: null }, add: { ...base }, tasks: pool.filter((t) => !t.projectId || !S.byId.get(t.projectId)).sort((a, b) => byDue(a, b) || byPri(a, b)) });
    for (const p of projs) cols.push({ key: p.id, title: p.name, color: p.color, drop: { projectId: p.id }, add: { ...base, projectId: p.id }, tasks: pool.filter((t) => t.projectId === p.id).sort((a, b) => byDue(a, b) || byPri(a, b)) });
  }
  return cols;
}

/* ---------- Cartão ---------- */
function card(t, by, S, screen) {
  const day = today();
  const kind = t.kind || 'normal';
  const meta = [];
  if (focusOf(S)?.taskId === t.id) meta.push(`<span class="badge focus">${icon('target')}Em foco</span>`);
  if (kind === 'challenge') meta.push(`<span class="badge warm">${icon('bolt')}Desafio</span>`);
  if (kind === 'bonus') meta.push(`<span class="badge pos">${icon('gift')}Bônus</span>`);
  if (t.due && (t.due < day || (by !== 'data' && !(screen === 'hoje' && t.due === day)))) meta.push(`<span class="${t.due < day ? 'late' : t.due === day ? 'today' : ''}">${icon('plan')}${esc(relDay(t.due, day))}</span>`);
  if (t.time) meta.push(`<span>${icon('timer')}${esc(fmtTime(t.time))}</span>`);
  if (t.recurrence) meta.push(`<span title="${esc(recurrenceLabel(t.recurrence))}">${icon('repeat')}</span>`);
  const subs = t.subtasks || [];
  if (subs.length && kind !== 'routine') meta.push(`<span>${icon('list')}${subs.filter((s) => s.done).length}/${subs.length}</span>`);
  const proj = by !== 'projeto' && t.projectId && S.byId.get(t.projectId);
  if (proj) meta.push(`<span class="tag"><i class="dot" style="--c:${esc(proj.color || 'var(--dim)')}"></i>${esc(proj.name)}</span>`);
  for (const tid of t.tags || []) {
    const tg = S.byId.get(tid);
    if (tg) meta.push(`<span class="tagchip" style="--c:${esc(tg.color || 'var(--dim)')}">@${esc(tg.name)}</span>`);
  }
  const p = kind === 'routine' ? 'R' : t.priority || 'P4';
  return `<li class="task kb-card kind-${kind}" data-id="${esc(t.id)}" data-p="${esc(p)}">
    <button type="button" class="task-check" data-p="${esc(p)}" data-check aria-label="Concluir tarefa: ${esc(t.title)}">${icon('check')}</button>
    <div class="kb-body" data-open role="button" tabindex="0" aria-label="${esc(t.title)}. Toque para ver, segure para arrastar.">
      <span class="task-title">${esc(t.title)}</span>
      ${t.notes ? `<p class="task-desc">${esc(plainPreview(t.notes))}</p>` : ''}
      ${meta.length ? `<div class="task-meta">${meta.join('')}</div>` : ''}
    </div>
  </li>`;
}

/* ---------- Quadro ---------- */
// scope: { screen: 'hoje' | 'planejar' | 'projeto', projectId? }
export function kanban(scope, S = P()) {
  const by = viewPref(scope.screen).by;
  const cols = columns(S, scope, by);
  const sid = `${scope.screen}${scope.projectId ? `-${scope.projectId}` : ''}`;
  return `<div class="kb-board" data-kb="${esc(sid)}" data-by="${by}">${cols
    .map(
      (c, i) => `<section class="kb-col${c.drop ? '' : ' no-drop'}" data-col="${esc(c.key)}"${c.drop ? ` data-drop="${esc(JSON.stringify(c.drop))}"` : ''} style="--i:${i}${c.color ? `;--cc:${esc(c.color)}` : ''}"${c.tone ? ` data-tone="${c.tone}"` : ''}>
      <header class="kb-head"><i class="kb-dot"></i><h3>${esc(c.title)}</h3>${c.sub ? `<small>${esc(c.sub)}</small>` : ''}<span class="count">${c.tasks.length || ''}</span></header>
      <ul class="tasks kb-list">${c.tasks.map((t) => card(t, by, S, scope.screen)).join('')}</ul>
      ${c.tasks.length ? '' : `<p class="kb-empty">${c.drop ? 'Solte uma tarefa aqui' : 'Nada por aqui'}</p>`}
      ${c.add ? `<div class="kb-add">${quickAdd(c.add, `kb-${sid}-${c.key}`)}</div>` : ''}
    </section>`,
    )
    .join('')}</div>`;
}

const scrollMem = new Map(); // posição horizontal de cada quadro entre redesenhos

export function bindKanban(root) {
  const board = root.querySelector('[data-kb]');
  if (!board) return;
  const sid = board.dataset.kb;
  if (scrollMem.has(sid)) board.scrollLeft = scrollMem.get(sid);
  board.addEventListener('scroll', () => scrollMem.set(sid, board.scrollLeft), { passive: true });
  board.querySelectorAll('.kb-add').forEach(bindQuick);
  board.querySelectorAll('.kb-card').forEach((li) => {
    const id = li.dataset.id;
    li.querySelector('[data-check]').onclick = (e) => onCheck(e.currentTarget, li, id);
    const body = li.querySelector('[data-open]');
    body.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openTask(id);
      }
    };
    draggable(li, board, id);
  });
}

/* ---------- Arrastar ---------- */
function draggable(li, board, id) {
  const body = li.querySelector('[data-open]');
  let st = null; // { x, y, armed, drag, timer, pid, ghost, over, dx, dy }
  const reset = () => {
    if (!st) return;
    clearTimeout(st.timer);
    cancelAnimationFrame(st.raf);
    st.ghost?.remove();
    li.classList.remove('kb-lift', 'kb-placeholder');
    board.querySelectorAll('.kb-col.drop-over').forEach((c) => c.classList.remove('drop-over'));
    board.classList.remove('dragging');
    document.body.classList.remove('kb-dragging');
    st = null;
  };
  const start = () => {
    const r = li.getBoundingClientRect();
    const g = li.cloneNode(true);
    g.classList.add('kb-ghost');
    g.style.width = `${r.width}px`;
    g.style.left = `${r.left}px`;
    g.style.top = `${r.top}px`;
    document.body.appendChild(g);
    st.ghost = g;
    st.dx = st.x - r.left;
    st.dy = st.y - r.top;
    st.drag = true;
    li.classList.remove('kb-lift');
    li.classList.add('kb-placeholder');
    board.classList.add('dragging');
    document.body.classList.add('kb-dragging');
    app.hold = true;
    haptic('start');
    tick();
  };
  // Rolagem automática perto das bordas (do quadro e da coluna).
  const tick = () => {
    if (!st?.drag) return;
    const br = board.getBoundingClientRect();
    const edge = 48;
    if (st.cx < br.left + edge) board.scrollLeft -= 12;
    else if (st.cx > br.right - edge) board.scrollLeft += 12;
    const list = st.over?.querySelector('.kb-list');
    if (list && list.scrollHeight > list.clientHeight) {
      const lr = list.getBoundingClientRect();
      if (st.cy < lr.top + 36) list.scrollTop -= 10;
      else if (st.cy > lr.bottom - 36) list.scrollTop += 10;
    }
    if (st.cy < 60) window.scrollBy(0, -10);
    else if (st.cy > innerHeight - 60) window.scrollBy(0, 10);
    st.raf = requestAnimationFrame(tick);
  };
  const move = (x, y) => {
    st.cx = x;
    st.cy = y;
    st.ghost.style.transform = `translate(${x - st.dx - parseFloat(st.ghost.style.left)}px, ${y - st.dy - parseFloat(st.ghost.style.top)}px) rotate(-2deg)`;
    const el = document.elementFromPoint(x, y);
    const col = el?.closest?.('.kb-col');
    const target = col && board.contains(col) && col.dataset.drop && col !== li.closest('.kb-col') ? col : null;
    if (target !== st.over) {
      st.over?.classList.remove('drop-over');
      target?.classList.add('drop-over');
      if (target) haptic('tick');
      st.over = target;
    }
  };

  li.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || e.target.closest('[data-check], button, a, input, label')) return;
    reset();
    st = { x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY, pid: e.pointerId, touch: e.pointerType !== 'mouse' };
    if (!st.touch) e.preventDefault(); // sem seleção de texto ao arrastar com o mouse
    if (st.touch) {
      st.timer = setTimeout(() => {
        if (!st) return;
        st.armed = true;
        li.classList.add('kb-lift');
        haptic('start');
      }, 380);
    }
  });
  li.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.pid) return;
    const dist = Math.hypot(e.clientX - st.x, e.clientY - st.y);
    if (!st.drag) {
      if (st.touch && !st.armed) {
        if (dist > 8) reset(); // é rolagem
        return;
      }
      if (dist < (st.touch ? 4 : 6)) return;
      try {
        li.setPointerCapture(st.pid);
      } catch {
        /* sem captura */
      }
      start();
    }
    move(e.clientX, e.clientY);
  });
  // No toque, depois de "armar", o navegador não pode rolar a tela no lugar do arrasto.
  li.addEventListener('touchmove', (e) => st?.armed && e.cancelable && e.preventDefault(), { passive: false });
  li.addEventListener('contextmenu', (e) => st?.touch && e.preventDefault());
  const end = async (e) => {
    if (!st || (e && e.pointerId !== st.pid)) return;
    const { drag, armed, over } = st;
    reset();
    if (drag) {
      li.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => li.removeEventListener('click', swallow, { capture: true }), 50);
      if (over) await moveTask(id, JSON.parse(over.dataset.drop), over.querySelector('h3')?.textContent || '');
      app.hold = false;
      app.refresh();
    } else if (armed) {
      // Segurou e soltou sem mover: edita, como nas listas.
      li.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => li.removeEventListener('click', swallow, { capture: true }), 50);
      editTask(id);
    }
  };
  // Abrir fica no clique (não no pointerup): assim o clique não cai no fundo do cartão que acabou de abrir.
  body.addEventListener('click', () => openTask(id));
  li.addEventListener('pointerup', end);
  li.addEventListener('pointercancel', () => {
    if (st?.drag) {
      app.hold = false;
      app.refresh();
    }
    reset();
  });
}
const swallow = (e) => {
  e.stopImmediatePropagation();
  e.preventDefault();
};

// Aplica a mudança da coluna (data, prioridade ou projeto) com as mesmas regras da edição.
export async function moveTask(id, patch, colName = '') {
  const t = personal.get(id);
  if (!t) return false;
  const data = { ...strip(t) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete data[k];
    else data[k] = v;
  }
  if (!data.due) {
    delete data.time;
    delete data.remindBefore;
  }
  const same = Object.entries(patch).every(([k, v]) => (t[k] ?? null) === v);
  if (same) return false;
  const c = checkTask(data, id);
  if (!c.ok) {
    play('error');
    toast(c.msg, c.shop ? { action: 'Ir à Loja', onAction: () => app.nav('loja'), ms: 5000 } : { ms: 5000 });
    return false;
  }
  await saveTask(id, data, c.consume);
  play('tick');
  haptic('done');
  const what = 'due' in patch ? (patch.due ? `para ${relDay(patch.due).toLowerCase()}` : 'para Sem data') : `para ${colName}`;
  toast(`“${t.title}” movida ${what}.`, { action: 'Desfazer', onAction: () => saveTask(id, strip(t)) });
  return true;
}
