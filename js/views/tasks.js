// Peças das listas de tarefas: linha (por tipo), cartão do sprint, adicionar rápido e o painel de edição.
import { P, app, prefs, personal } from '../state.js';
import { PRIORITIES, TASK_KINDS, recurrenceLabel } from '../core/model.js';
import { toggleTask, toggleSub, addTask, saveTask, removeTask, strip, checkTask, sprintInfo } from '../core/tasks.js';
import { ITEMS, applyTaskItem } from '../core/game.js';
import { esc, uid, relDay, fmtTime, plural, addDays, weekday, WD_SHORT, WD_LETTER, fmtDateHuman, isoOfMs } from '../lib/util.js';
import { today } from '../lib/clock.js';
import { icon, sheet, toast, confirmDialog, promptDialog, opt, readForm, bar, COLORS, copyText, morph } from '../ui/ui.js';
import { parseQuick } from '../core/parse.js';
import { renderRich, richToolbar, bindToolbar, toggleCheckLine, plainPreview } from '../ui/rich.js';
import { play } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';
import { celebrate } from './celebrate.js';
import { focusTask, focusOn } from './focus.js';
import { focusOf } from '../core/focus.js';
import { REMIND_BEFORE, notifyPrefs } from '../core/notify.js';

/* ---------- Linha ---------- */
export function taskRow(t, { showDue = false, S = P(), i = 0 } = {}) {
  const day = today();
  const meta = [];
  const kind = t.kind || 'normal';
  if (!t.done && focusOf(S)?.taskId === t.id) meta.push(`<span class="badge focus">${icon('target')}Em foco</span>`);
  if (kind === 'challenge') meta.push(`<span class="badge warm">${icon('bolt')}Desafio do dia</span>`);
  if (kind === 'bonus') meta.push(`<span class="badge pos">${icon('gift')}Bônus</span>`);
  if (t.powerups?.dice) meta.push(`<span class="badge acc">${icon('dice')}×2</span>`);
  if (t.due && (showDue || t.due < day) && kind !== 'challenge') meta.push(`<span class="${t.due < day && !t.done ? 'late' : t.due === day ? 'today' : ''}">${icon('plan')}${esc(relDay(t.due, day))}</span>`);
  if (t.time) meta.push(`<span>${icon('timer')}${esc(fmtTime(t.time))}</span>`);
  if (kind === 'timed' && t.duration) meta.push(`<span>${icon('timer')}${t.duration} min</span>`);
  if (t.recurrence) meta.push(`<span title="${esc(recurrenceLabel(t.recurrence))}">${icon('repeat')}</span>`);
  const subs = t.subtasks || [];
  if (subs.length && kind !== 'routine') meta.push(`<span>${icon('list')}${subs.filter((s) => s.done).length}/${subs.length}</span>`);
  for (const tid of t.tags || []) {
    const tg = S.byId.get(tid);
    if (tg) meta.push(`<span class="tagchip" style="--c:${esc(tg.color || 'var(--dim)')}">@${esc(tg.name)}</span>`);
  }
  const proj = t.projectId && S.byId.get(t.projectId);
  if (proj) meta.push(`<span class="tag"><i class="dot" style="--c:${esc(proj.color || 'var(--dim)')}"></i>${esc(proj.name)}</span>`);
  const label = t.done ? 'Reabrir tarefa' : 'Concluir tarefa';
  const doneN = subs.filter((s) => s.done).length;
  const hasSubs = subs.length > 0 && !t.done;
  const folded = hasSubs && isFolded(t.id);
  return `<li class="task kind-${kind}${t.done ? ' done' : ''}${t.failed ? ' failed' : ''}${hasSubs ? ' has-subs' : ''}${folded ? ' folded' : ''}" data-id="${esc(t.id)}" style="--i:${i}">
    <button type="button" class="task-check" data-p="${esc(kind === 'routine' ? 'R' : t.priority || 'P4')}" data-check aria-label="${label}: ${esc(t.title)}">${icon('check')}</button>
    <div class="task-body">
      <div class="task-open" data-open role="button" tabindex="0" aria-label="${esc(t.title)}. Segure para editar.">
        <span class="task-title">${kind === 'routine' ? `<span class="routine-tag">${icon('repeat')}</span>` : ''}${esc(t.title)}</span>
        ${t.notes && !t.done ? `<p class="task-desc">${esc(plainPreview(t.notes))}</p>` : ''}
        ${meta.length ? `<div class="task-meta">${meta.join('')}</div>` : ''}
      </div>
      ${
        hasSubs
          ? `<div class="sub-items"${folded ? ' hidden' : ''}>${kind === 'routine' ? bar(doneN / subs.length, { cls: 'thin', label: 'Itens da rotina' }) : ''}
          <ul>${subs.map((s) => `<li><label class="check mini${s.done ? ' on' : ''}"><input type="checkbox" data-sub="${esc(s.id)}"${s.done ? ' checked' : ''}><span>${esc(s.title)}</span></label></li>`).join('')}</ul></div>`
          : ''
      }
    </div>
    ${hasSubs ? `<button type="button" class="icon-btn fold-btn" data-fold aria-expanded="${!folded}" aria-label="${folded ? 'Mostrar' : 'Esconder'} subtarefas">${icon('down', 'sm')}</button>` : ''}
    ${kind === 'timed' && !t.done ? `<button type="button" class="icon-btn play-btn" data-focus aria-label="Iniciar foco: ${esc(t.title)}">${icon('play')}</button>` : ''}
  </li>`;
}

/* ---------- Recolher subtarefas (lembrado neste aparelho) ---------- */
const FK = 'lida.folded';
const foldedSet = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(FK) || '[]'));
  } catch {
    return new Set();
  }
};
export const isFolded = (id) => foldedSet().has(id);
export function setFolded(id, on) {
  const f = foldedSet();
  if (on) f.add(id);
  else f.delete(id);
  try {
    localStorage.setItem(FK, JSON.stringify([...f].slice(-300)));
  } catch {
    /* sem armazenamento */
  }
}
function toggleFold(li) {
  const id = li.dataset.id;
  const on = !li.classList.contains('folded');
  setFolded(id, on);
  li.classList.toggle('folded', on);
  const box = li.querySelector('.sub-items');
  const btn = li.querySelector('[data-fold]');
  if (btn) {
    btn.setAttribute('aria-expanded', String(!on));
    btn.setAttribute('aria-label', `${on ? 'Mostrar' : 'Esconder'} subtarefas`);
  }
  if (!box) return;
  if (on) {
    box.style.height = `${box.scrollHeight}px`;
    requestAnimationFrame(() => (box.style.height = '0px'));
    setTimeout(() => {
      box.hidden = true;
      box.style.height = '';
    }, 220);
  } else {
    box.hidden = false;
    const h = box.scrollHeight;
    box.style.height = '0px';
    requestAnimationFrame(() => (box.style.height = `${h}px`));
    setTimeout(() => (box.style.height = ''), 240);
  }
  haptic('tick');
}

// Segurar (toque longo) chama a função; o clique que viria depois é ignorado.
export function onLongPress(el, fn, ms = 450) {
  let t = 0;
  let x = 0;
  let y = 0;
  let fired = false;
  const cancel = () => clearTimeout(t);
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    fired = false;
    x = e.clientX;
    y = e.clientY;
    cancel();
    t = setTimeout(() => {
      fired = true;
      haptic('start');
      el.classList.add('pressed');
      setTimeout(() => el.classList.remove('pressed'), 250);
      fn();
    }, ms);
  });
  el.addEventListener('pointermove', (e) => Math.hypot(e.clientX - x, e.clientY - y) > 8 && cancel());
  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!fired) fn();
    fired = true;
  });
  el.addEventListener('click', (e) => {
    if (fired) {
      e.stopImmediatePropagation();
      e.preventDefault();
      fired = false;
    }
  }, true);
}


export const taskList = (list, opts = {}) => `<ul class="tasks">${list.map((t, i) => taskRow(t, { ...opts, i })).join('')}</ul>`;

// Liga cliques de concluir/abrir em qualquer lista dentro de `root`.
export function bindTasks(root) {
  root.querySelectorAll('.task:not(.kb-card)').forEach((li) => {
    const id = li.dataset.id;
    li.querySelector('[data-check]').onclick = (e) => onCheck(e.currentTarget, li, id);
    const body = li.querySelector('[data-open]');
    // Tocar/clicar abre os detalhes; segurar vai direto para a edição; a setinha recolhe as subtarefas.
    body.onclick = () => openTask(id);
    onLongPress(li.querySelector('.task-body'), () => editTask(id));
    li.querySelector('[data-fold]')?.addEventListener('click', () => toggleFold(li));
    body.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openTask(id);
      }
    };
    li.querySelectorAll('[data-sub]').forEach((c) => (c.onchange = () => onSub(c, id)));
    li.querySelector('[data-focus]')?.addEventListener('click', () => focusTask(id));
  });
}

async function onSub(input, taskId) {
  input.closest('.check')?.classList.toggle('on', input.checked);
  app.hold = true;
  const r = await toggleSub(taskId, input.dataset.sub);
  if (r?.done) {
    play('progress', { fraction: r.fraction });
    haptic('tick');
  } else play('uncheck');
  setTimeout(() => {
    app.hold = false;
    app.refresh();
  }, 220);
}

export async function onCheck(btn, li, id) {
  const wasDone = li.classList.contains('done');
  btn.classList.remove('popping');
  void btn.offsetWidth;
  if (!wasDone) {
    btn.classList.add('popping');
    setTimeout(() => btn.classList.remove('popping'), 450);
    li.classList.add('done');
    play('complete');
    haptic('done');
  } else {
    li.classList.remove('done');
    play('uncheck');
    haptic('tap');
  }
  // Espera a animação antes de a lista se redesenhar.
  app.hold = true;
  await new Promise((r) => setTimeout(r, wasDone ? 120 : 420));
  if (!wasDone && !prefs().showDone) li.classList.add('leaving');
  const res = await toggleTask(id);
  setTimeout(
    () => {
      app.hold = false;
      app.refresh();
    },
    !wasDone && !prefs().showDone ? 320 : 0,
  );
  if (res?.done) celebrate(res.reward.xp ? 'Concluída' : 'Tarefa concluída', res.reward, res, { undo: () => toggleTask(id) });
}

/* ---------- Sprint ---------- */
export function sprintCard(t) {
  const s = sprintInfo(t);
  const subs = t.subtasks || [];
  return `<section class="sprint card${isFolded(t.id) ? ' folded' : ''}" data-sprint="${esc(t.id)}">
    <div class="sprint-head">
      <span class="sprint-ic">${icon('flag')}</span>
      <div class="grow"><small>Sprint · ${s.left ? `${plural(s.left, 'dia restante', 'dias restantes')}` : 'termina hoje'}</small><b data-open-sprint role="button" tabindex="0">${esc(t.title)}</b></div>
      <span class="sprint-pct">${Math.round(s.steps * 100)}%</span>
      <button type="button" class="icon-btn fold-btn" data-sfold aria-expanded="${!isFolded(t.id)}" aria-label="${isFolded(t.id) ? 'Mostrar' : 'Esconder'} etapas">${icon('down', 'sm')}</button>
    </div>
    ${bar(s.steps, { label: 'Etapas concluídas' })}
    <div class="sprint-time"><span>Dia ${s.elapsed} de ${s.total}</span>${bar(s.time, { cls: 'thin time', label: 'Tempo do sprint' })}</div>
    <ul class="sprint-steps">${subs.map((x) => `<li><label class="check mini${x.done ? ' on' : ''}"><input type="checkbox" data-sub="${esc(x.id)}"${x.done ? ' checked' : ''}><span>${esc(x.title)}</span></label></li>`).join('')}</ul>
    ${s.steps >= 1 ? `<button type="button" class="btn primary wide" data-finish>${icon('trophy')}Concluir sprint</button>` : ''}
  </section>`;
}
export function bindSprint(root) {
  const el = root.querySelector('[data-sprint]');
  if (!el) return;
  const id = el.dataset.sprint;
  el.querySelectorAll('[data-sub]').forEach((c) => (c.onchange = () => onSub(c, id)));
  el.querySelector('[data-open-sprint]').onclick = () => openTask(id);
  onLongPress(el.querySelector('.sprint-head'), () => editTask(id));
  el.querySelector('[data-sfold]').onclick = () => {
    const on = !el.classList.contains('folded');
    setFolded(id, on);
    el.classList.toggle('folded', on);
    el.querySelector('[data-sfold]').setAttribute('aria-expanded', String(!on));
    haptic('tick');
  };
  el.querySelector('[data-finish]')?.addEventListener('click', async () => {
    play('complete');
    haptic('done');
    const res = await toggleTask(id);
    if (res?.done) celebrate('Sprint concluído', res.reward, res);
  });
}

/* ---------- Adicionar rápido ---------- */
// defaults: campos que a tarefa nova recebe (ex.: { due: hoje } na tela Hoje).
// O texto é lido em linguagem natural: "Pagar luz amanhã 9h p1 #Casa @contas".
export function quickAdd(defaults = {}, key = '') {
  return `<form class="quick-add" data-quick="${esc(key || defaults.due || defaults.projectId || 'sem-data')}">
    <span class="qa-plus">${icon('plus')}</span>
    <input name="title" placeholder="Adicionar tarefa" autocomplete="off" enterkeyhint="done" aria-label="Nova tarefa" aria-describedby="qa-help">
    <button type="button" class="icon-btn qa-more" data-more aria-label="Mais opções">${icon('more')}</button>
    <input type="hidden" name="defaults" value="${esc(JSON.stringify(defaults))}">
    <div class="qa-preview" data-preview aria-live="polite"></div>
  </form>`;
}

function previewChips(r, defaults) {
  const chips = [];
  const due = r.due || null;
  if (due && due !== defaults.due) chips.push(`${icon('plan')}${esc(relDay(due))}`);
  if (r.time) chips.push(`${icon('timer')}${esc(fmtTime(r.time))}`);
  if (r.recurrence) chips.push(`${icon('repeat')}${esc(recurrenceLabel(r.recurrence))}`);
  if (r.priority) chips.push(`${icon('flag')}${r.priority}`);
  if (r.projectName) chips.push(`${icon('folder')}${esc(r.projectName)}`);
  const S = P();
  for (const id of r.tags) chips.push(`@${esc(S.byId.get(id)?.name || '')}`);
  for (const n of r.newTags) chips.push(`@${esc(n)} <small>nova</small>`);
  return chips.map((c) => `<span class="qa-chip">${c}</span>`).join('');
}

// Linguagem natural → tarefa. Devolve { id } ou { error, shop }. Usado pela adição rápida e pela CLI.
export async function addFromText(text, defaults = {}) {
  const S = P();
  const r = parseQuick(text, { today: today(), projects: S.project, tags: S.tag });
  if (!r.title) return { error: 'Escreva o título da tarefa.' };
  const batch = [];
  const newIds = [];
  for (const name of r.newTags) {
    const id = uid();
    newIds.push(id);
    batch.push({ type: 'tag', id, data: { name, color: COLORS[(S.tag.length + batch.length) % COLORS.length] } });
  }
  const data = { ...defaults, title: r.title };
  if (r.due) data.due = r.due;
  if (r.time) data.time = r.time;
  if (r.priority) data.priority = r.priority;
  if (r.projectId) data.projectId = r.projectId;
  if (r.recurrence) data.recurrence = r.recurrence;
  const tags = [...new Set([...(defaults.tags || []), ...r.tags, ...newIds])];
  if (tags.length) data.tags = tags;
  const c = checkTask({ kind: 'normal', priority: 'P4', ...data });
  if (!c.ok) return { error: c.msg, shop: !!c.shop };
  if (batch.length) await personal.saveMany(batch);
  return { id: await addTask(data, c.consume) };
}

export async function createFromText(text, defaults = {}) {
  const r = await addFromText(text, defaults);
  if (r.error) {
    play('error');
    toast(r.error, r.shop ? { action: 'Ir à Loja', onAction: () => app.nav('loja'), ms: 5000 } : { ms: 5000 });
    return null;
  }
  return r.id;
}

export function bindQuick(root) {
  const f = root.querySelector('[data-quick]');
  if (!f) return;
  const defaults = () => JSON.parse(f.defaults.value || '{}');
  const pv = f.querySelector('[data-preview]');
  f.querySelector('[data-more]').onclick = () => {
    const S = P();
    const r = parseQuick(f.title.value, { today: today(), projects: S.project, tags: S.tag });
    const d = { ...defaults(), title: r.title };
    for (const k of ['due', 'time', 'priority', 'projectId', 'recurrence']) if (r[k]) d[k] = r[k];
    if (r.tags.length) d.tags = r.tags;
    editTask(null, d);
  };
  f.title.oninput = () => {
    const S = P();
    const v = f.title.value;
    pv.innerHTML = v.trim() ? previewChips(parseQuick(v, { today: today(), projects: S.project, tags: S.tag }), defaults()) : '';
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const text = f.title.value.trim();
    if (!text) return;
    const key = f.dataset.quick;
    const id = await createFromText(text, defaults());
    if (!id) return;
    f.title.value = '';
    pv.innerHTML = '';
    haptic('add');
    play('tick');
    app.lastAdded = id;
    // A lista é redesenhada: devolve o foco ao mesmo campo para anotar várias em sequência.
    setTimeout(() => document.querySelector(`[data-quick="${key}"] input[name=title]`)?.focus(), 80);
  };
}

/* ---------- Detalhes (ao tocar numa tarefa) ---------- */
// Um cartão com tudo da tarefa: prazo, prioridade, projeto, etiquetas, descrição formatada (com as caixas
// de seleção funcionando) e subtarefas marcáveis. Editar fica a um toque; segurar a tarefa vai direto.
export function openTask(id) {
  const t0 = P().byId.get(id);
  if (!t0) return;
  let close = null;
  const draw = (el) => {
    const S = P();
    const t = S.byId.get(id);
    if (!t) return close?.();
    const kind = t.kind || 'normal';
    const pr = PRIORITIES.find((p) => p.id === (t.priority || 'P4'));
    const subs = t.subtasks || [];
    const doneN = subs.filter((s) => s.done).length;
    const proj = t.projectId && S.byId.get(t.projectId);
    const tags = (t.tags || []).map((x) => S.byId.get(x)).filter(Boolean);
    const inFocus = focusOf(S)?.taskId === id && !t.done;
    const late = t.due && t.due < today() && !t.done;
    const isRoutine = kind === 'routine';
    // Power-ups que valem para esta tarefa: Respiro (+3 h, precisa de horário) e Alívio (+1 dia, precisa de data).
    const powers = !t.done && !t.failed && !isRoutine && kind !== 'sprint' ? ['respite', 'relief'].filter((k) => (k === 'respite' ? t.time : t.due)) : [];
    const rows = [];
    if (t.due) rows.push([icon('plan'), kind === 'sprint' ? 'Fim' : 'Data', `<span class="${late ? 'neg' : ''}">${esc(fmtDateHuman(t.due))}${late ? ' · atrasada' : ''}</span>`]);
    if (t.time) rows.push([icon('timer'), 'Horário', esc(fmtTime(t.time)) + (t.remindBefore ? ` <small>(lembrete ${t.remindBefore >= 60 ? `${t.remindBefore / 60} h` : `${t.remindBefore} min`} antes)</small>` : '')]);
    if (kind === 'timed' && t.duration) rows.push([icon('timer'), 'Duração', `${t.duration} min`]);
    if (t.recurrence) rows.push([icon('repeat'), 'Repete', esc(recurrenceLabel(t.recurrence))]);
    if (proj) rows.push([icon('folder'), 'Projeto', `<a href="#projeto-${esc(proj.id)}" data-goproj class="tag"><i class="dot" style="--c:${esc(proj.color || 'var(--accent)')}"></i>${esc(proj.name)}</a>`]);
    if (tags.length) rows.push([icon('tag'), 'Etiquetas', tags.map((g) => `<span class="tagchip" style="--c:${esc(g.color || 'var(--dim)')}">@${esc(g.name)}</span>`).join(' ')]);
    if (t.done && t.doneAt) rows.push([icon('check'), 'Concluída', esc(fmtDateHuman(isoOfMs(t.doneAt)))]);
    let sprint = '';
    if (kind === 'sprint' && t.due) {
      const si = sprintInfo(t);
      sprint = `<div class="td-sprint"><div><small>Etapas</small>${bar(si.steps, { label: 'Etapas' })}<b>${si.done}/${si.count}</b></div><div><small>Dias</small>${bar(si.time, { cls: 'time', label: 'Tempo' })}<b>${si.elapsed}/${si.total}</b></div></div>`;
    }
    const tdHtml = `
      <div class="td-head">
        <button type="button" class="task-check${t.done ? ' on' : ''}" data-p="${esc(isRoutine ? 'R' : t.priority || 'P4')}" data-tdcheck aria-label="${t.done ? 'Reabrir' : 'Concluir'}">${icon('check')}</button>
        <div class="grow">
          <h3 class="td-title${t.done ? ' done' : ''}">${esc(t.title)}</h3>
          <div class="td-badges">
            ${!isRoutine && pr && pr.id !== 'P4' ? `<span class="badge prio" style="--tone:var(--${pr.tone})">${pr.short} · ${pr.name}</span>` : ''}
            ${kind !== 'normal' ? `<span class="badge acc">${icon(TASK_KINDS[kind].icon)}${TASK_KINDS[kind].label}</span>` : ''}
            ${inFocus ? `<span class="badge focus">${icon('target')}Em foco</span>` : ''}
            ${t.failed && !t.done ? '<span class="badge warm">Venceu</span>' : ''}
          </div>
        </div>
      </div>
      ${rows.length ? `<dl class="td-rows">${rows.map(([ic, k, v]) => `<div><dt>${ic}<span>${k}</span></dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
      ${sprint}
      ${t.notes ? `<div class="td-sec"><h4>Descrição<button type="button" class="td-copy" data-tdcopy aria-label="Copiar a descrição">${icon('copy', 'sm')}<span>Copiar</span></button></h4><div class="rich td-notes" data-tdnotes>${renderRich(t.notes)}</div></div>` : ''}
      ${
        powers.length
          ? `<div class="td-sec"><h4>Power-ups</h4><div class="td-powers">${powers
              .map((k) => {
                const n = S.money.items[k] || 0;
                return `<button type="button" class="td-power${n ? '' : ' empty'}" data-tdpower="${k}"><span class="tdp-ic">${icon(ITEMS[k].icon)}</span><span class="grow"><b>${ITEMS[k].name}</b><small>${k === 'respite' ? 'Mais 3 horas no horário' : 'Prazo para o dia seguinte, sem punição'}</small></span><span class="tdp-n">${n ? `${n}×` : 'Loja'}</span></button>`;
              })
              .join('')}</div></div>`
          : ''
      }
      ${
        subs.length
          ? `<div class="td-sec"><h4>${kind === 'sprint' ? 'Etapas' : isRoutine ? 'Itens' : 'Subtarefas'} <span class="count">${doneN}/${subs.length}</span></h4>${bar(doneN / subs.length, { cls: 'thin', label: 'Progresso' })}
        <ul class="td-subs">${subs.map((x) => `<li><label class="check${x.done ? ' on' : ''}"><input type="checkbox" data-tdsub="${esc(x.id)}"${x.done ? ' checked' : ''}><span>${esc(x.title)}</span></label></li>`).join('')}</ul></div>`
          : ''
      }
      <div class="td-actions">
        <button type="button" class="btn ${t.done ? 'ghost' : 'primary'}" data-tddone>${icon(t.done ? 'refresh' : 'check')}${t.done ? 'Reabrir' : 'Concluir'}</button>
        ${!t.done && !t.failed && kind !== 'sprint' ? `<button type="button" class="btn ghost" data-tdfocus>${icon('target')}${inFocus ? 'Parar foco' : 'Focar'}</button>` : ''}
        ${kind === 'timed' && !t.done ? `<button type="button" class="btn ghost" data-tdplay>${icon('play')}Modo foco</button>` : ''}
        <button type="button" class="btn ghost" data-tdedit>${icon('edit')}${isRoutine ? 'Editar rotina' : 'Editar'}</button>
      </div>`;
    const box = el.querySelector('[data-td]');
    morph(box, () => (box.innerHTML = tdHtml));
    const done = async () => {
      const was = !!P().byId.get(id)?.done;
      play(was ? 'uncheck' : 'complete');
      haptic(was ? 'tap' : 'done');
      const res = await toggleTask(id);
      if (res?.done) celebrate('Concluída', res.reward, res, { undo: () => toggleTask(id) });
      draw(el);
    };
    el.querySelector('[data-tdcheck]').onclick = done;
    el.querySelector('[data-tddone]').onclick = done;
    el.querySelector('[data-tdedit]').onclick = () => {
      close();
      setTimeout(() => editTask(id), 230);
    };
    el.querySelector('[data-tdfocus]')?.addEventListener('click', async () => {
      await focusOn(inFocus ? null : id);
      draw(el);
    });
    el.querySelector('[data-tdplay]')?.addEventListener('click', () => {
      close();
      setTimeout(() => focusTask(id), 230);
    });
    el.querySelector('[data-goproj]')?.addEventListener('click', () => close());
    el.querySelectorAll('[data-tdpower]').forEach(
      (b) =>
        (b.onclick = async () => {
          const k = b.dataset.tdpower;
          const cur = P().byId.get(id);
          if (!((P().money.items[k] || 0) > 0)) {
            play('error');
            return toast(`Você não tem ${ITEMS[k].name}.`, { action: 'Ir à Loja', onAction: () => (close(), app.nav('loja')) });
          }
          if (!(await confirmDialog(`Usar ${ITEMS[k].name} em "${cur.title}"? ${ITEMS[k].desc}`, { ok: 'Usar', title: ITEMS[k].name }))) return;
          if (await applyTaskItem(k, P().byId.get(id))) {
            play('powerup');
            haptic('start');
            const n = P().byId.get(id);
            toast(k === 'respite' ? `Respiro usado: novo horário ${fmtTime(n.time)}.` : `Alívio usado: novo prazo ${fmtDateHuman(n.due).toLowerCase()}.`);
          }
          draw(el);
        }),
    );
    el.querySelector('[data-tdcopy]')?.addEventListener('click', async (e) => {
      const b = e.currentTarget;
      const ok = await copyText(P().byId.get(id)?.notes || '');
      haptic('tick');
      if (!ok) return toast('Não consegui copiar.');
      b.classList.add('done');
      b.querySelector('span').textContent = 'Copiada';
      setTimeout(() => {
        if (!b.isConnected) return;
        b.classList.remove('done');
        b.querySelector('span').textContent = 'Copiar';
      }, 1600);
    });
    el.querySelectorAll('[data-tdsub]').forEach(
      (c) =>
        (c.onchange = async () => {
          const r = await toggleSub(id, c.dataset.tdsub);
          if (r?.done) {
            play('progress', { fraction: r.fraction });
            haptic('tick');
          } else play('uncheck');
          draw(el);
        }),
    );
    el.querySelectorAll('[data-tdnotes] [data-line]').forEach(
      (b) =>
        (b.onclick = async () => {
          const cur = P().byId.get(id);
          await personal.patch(id, { notes: toggleCheckLine(cur.notes || '', Number(b.dataset.line)) });
          play('tick');
          draw(el);
        }),
    );
  };
  close = sheet({
    title: t0.kind === 'routine' ? 'Rotina' : 'Tarefa',
    body: '<div class="task-detail" data-td></div>',
    onMount(el) {
      draw(el);
    },
  });
}

/* ---------- Painel de edição ---------- */
const REPEAT = [
  ['', 'Não repete'],
  ['daily', 'Todo dia'],
  ['weekdays', 'Dias úteis (seg a sex)'],
  ['weekly', 'Toda semana, no mesmo dia'],
  ['custom', 'Escolher os dias'],
  ['monthly', 'Todo mês, no mesmo dia'],
  ['yearly', 'Todo ano, na mesma data'],
];
function repeatValue(rec) {
  if (!rec) return '';
  const wd = (rec.weekdays || []).slice().sort();
  if (rec.type === 'weekly' && wd.join() === '1,2,3,4,5') return 'weekdays';
  if (rec.type === 'weekly' && wd.length > 1) return 'custom';
  return rec.type;
}
function repeatFrom(v, due, prev) {
  if (!v) return undefined;
  if (prev && repeatValue(prev) === v) return prev; // mantém detalhes vindos do Lida anterior
  const d = due ? new Date(`${due}T12:00`) : new Date();
  if (v === 'weekdays') return { type: 'weekly', weekdays: [1, 2, 3, 4, 5] };
  if (v === 'weekly') return { type: 'weekly', weekdays: [d.getDay()] };
  if (v === 'monthly') return { type: 'monthly', dayOfMonth: d.getDate() };
  if (v === 'yearly') return { type: 'yearly', dayOfMonth: d.getDate(), monthOfYear: d.getMonth() };
  return { type: v };
}

const KIND_ORDER = ['normal', 'timed', 'sprint', 'challenge', 'bonus'];

export function editTask(id, defaults = {}) {
  const S = P();
  const t = id ? S.byId.get(id) : { priority: 'P4', kind: 'normal', ...defaults };
  if (id && !t) return;
  if (t.kind === 'routine' && id) return import('./habits.js').then((m) => m.editRoutine(t.routineId, { fromTask: id }));
  let kind = t.kind || 'normal';
  let subs = (t.subtasks || []).map((s) => ({ ...s }));
  let selTags = [...(t.tags || [])];
  const bonusN = S.money.items.bonusTask || 0;
  const subHtml = () =>
    subs
      .map(
        (s, i) => `<li class="subtask${s.done ? ' done' : ''}"><label class="check"><input type="checkbox" data-sub="${i}"${s.done ? ' checked' : ''}><span>${esc(s.title)}</span></label>
        <button type="button" class="icon-btn" data-subdel="${i}" aria-label="Remover ${esc(s.title)}">${icon('x', 'sm')}</button></li>`,
      )
      .join('');
  sheet({
    title: id ? 'Editar tarefa' : 'Nova tarefa',
    wide: true,
    body: `<form class="form task-form" data-f data-kind="${kind}">
      <div class="kinds" role="radiogroup" aria-label="Tipo de tarefa">${KIND_ORDER.map((k) => {
        const K = TASK_KINDS[k];
        const extra = k === 'bonus' && kind !== 'bonus' ? `<small>${bonusN}</small>` : '';
        return `<button type="button" role="radio" class="kind${k === kind ? ' on' : ''}" data-k="${k}" aria-checked="${k === kind}">${icon(K.icon)}<span>${K.label}</span>${extra}</button>`;
      }).join('')}</div>
      <p class="form-meta kind-hint" data-hint>${esc(TASK_KINDS[kind].hint)}</p>
      <label class="field"><span>Título</span><input name="title" value="${esc(t.title || '')}" required autocomplete="off" ${id ? '' : 'autofocus'}></label>
      <div class="field"><span>Descrição</span>${richToolbar()}<textarea name="notes" rows="3" placeholder="Detalhes, links, listas. Aceita **negrito**, *itálico* e [links](https://…)">${esc(t.notes || '')}</textarea>
        <div class="rich rich-preview" data-rich${t.notes ? '' : ' hidden'}>${renderRich(t.notes || '')}</div></div>
      <div class="grid2 only-not-challenge">
        <label class="field only-sprint"><span>Início</span><input type="date" name="start" value="${esc(t.start || t.createdDay || today())}"></label>
        <label class="field"><span data-duelabel>${kind === 'sprint' ? 'Fim' : 'Data'}</span><input type="date" name="due" value="${esc(t.due || (kind === 'sprint' ? addDays(today(), 7) : ''))}"></label>
        <label class="field not-sprint"><span>Horário</span><input type="time" name="time" value="${esc(t.time || '')}"></label>
      </div>
      <label class="field not-sprint" data-remind${t.time ? '' : ' hidden'}><span>Lembrar</span><select name="remindBefore">${opt('', `Padrão (${(REMIND_BEFORE.find(([m]) => m === Number(notifyPrefs().before || 0)) || REMIND_BEFORE[0])[1].toLowerCase()})`, t.remindBefore == null)}${REMIND_BEFORE.map(([m, l]) => opt(String(m), l, t.remindBefore === m)).join('')}</select></label>
      <label class="field only-timed"><span>Duração: <b data-dur>${t.duration || 30} min</b></span><input type="range" name="duration" min="5" max="120" step="5" value="${t.duration || 30}"></label>
      <div class="grid2">
        <label class="field"><span>Prioridade</span><select name="priority">${PRIORITIES.map((p) => opt(p.id, `${p.short} · ${p.id === 'P4' ? 'Nenhuma' : p.name}`, (t.priority || 'P4') === p.id)).join('')}</select></label>
        <label class="field only-repeat"><span>Repetir</span><select name="repeat">${REPEAT.map(([v, l]) => opt(v, l, repeatValue(t.recurrence) === v)).join('')}</select></label>
      </div>
      <div class="field only-repeat" data-wdays${repeatValue(t.recurrence) === 'custom' ? '' : ' hidden'}><span>Repetir nestes dias</span>
        <div class="wdays" role="group" aria-label="Dias da semana">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label><input type="checkbox" name="rdays" value="${d}"${(t.recurrence?.weekdays || []).includes(d) ? ' checked' : ''}><span title="${WD_SHORT[d]}">${WD_LETTER[d]}</span></label>`).join('')}</div></div>
      <div class="field"><span>Etiquetas</span><div class="chips tag-pick" data-tags>${tagChips(S, t.tags || [])}</div></div>
      ${S.project.length ? `<label class="field"><span>Projeto</span><select name="projectId">${opt('', 'Nenhum', !t.projectId)}${S.project.map((p) => opt(p.id, p.name, p.id === t.projectId)).join('')}</select></label>` : ''}
      <div class="field"><span data-sublabel>${kind === 'sprint' ? 'Etapas do sprint' : 'Subtarefas'}</span>
        <ul class="subs" data-subs>${subHtml()}</ul>
        <div class="sub-add"><input data-subnew placeholder="${kind === 'sprint' ? 'Adicionar etapa' : 'Adicionar subtarefa'}" autocomplete="off" aria-label="Nova subtarefa"><button type="button" class="btn small" data-subadd>${icon('plus')}Adicionar</button></div>
      </div>
            ${t.failed ? `<p class="form-meta neg">Esta tarefa venceu. Ainda dá para concluir, mas sem recompensa.</p>` : ''}
      <p class="form-meta" data-repeatnote>${t.recurrence ? esc(recurrenceLabel(t.recurrence)) + '. Ao concluir, a próxima ocorrência é criada sozinha.' : ''}</p>
      <div class="sheet-actions">
        ${id ? `<button type="button" class="btn ghost danger-text" data-del>${icon('trash')}Excluir</button>` : '<span></span>'}
        ${id && !t.done && !t.failed && kind !== 'sprint' && kind !== 'routine' ? `<button type="button" class="btn ghost" data-focuson>${icon('target')}${focusOf()?.taskId === id ? 'Em foco' : 'Focar'}</button>` : ''}
        <button class="btn primary">${id ? 'Salvar' : 'Adicionar tarefa'}</button>
      </div>
    </form>`,
    onMount(el, close) {
      const f = el.querySelector('[data-f]');
      const list = el.querySelector('[data-subs]');
      // Descrição: barra de formatação e pré-visualização ao vivo (com caixas de seleção clicáveis).
      const rich = el.querySelector('[data-rich]');
      const paintRich = () => {
        rich.innerHTML = renderRich(f.notes.value);
        rich.hidden = !f.notes.value.trim();
        rich.querySelectorAll('[data-line]').forEach(
          (b) =>
            (b.onclick = () => {
              f.notes.value = toggleCheckLine(f.notes.value, Number(b.dataset.line));
              play('tick');
              paintRich();
            }),
        );
      };
      paintRich();
      f.notes.addEventListener('input', paintRich);
      bindToolbar(el, f.notes, paintRich);
      el.querySelector('[data-focuson]')?.addEventListener('click', async () => {
        close();
        await focusOn(focusOf()?.taskId === id ? null : id);
      });
      // "Lembrar" só aparece quando há horário.
      f.time.addEventListener('change', () => (el.querySelector('[data-remind]').hidden = !f.time.value));
      // Etiquetas: tocar alterna; "+ Nova" cria.
      const tagsBox = el.querySelector('[data-tags]');
      const bindTags = () => {
        tagsBox.querySelectorAll('[data-tag]').forEach(
          (b) =>
            (b.onclick = () => {
              const id = b.dataset.tag;
              selTags = selTags.includes(id) ? selTags.filter((x) => x !== id) : [...selTags, id];
              b.classList.toggle('on', selTags.includes(id));
              b.setAttribute('aria-pressed', selTags.includes(id));
              haptic('tick');
            }),
        );
        tagsBox.querySelector('[data-tagnew]').onclick = async () => {
          const name = (await promptDialog('Nova etiqueta', { label: 'Nome', ok: 'Criar' }))?.replace(/^@/, '').trim();
          if (!name) return;
          const S2 = P();
          const ex = S2.tag.find((x) => x.name.toLowerCase() === name.toLowerCase());
          const id = ex?.id || (await personal.save('tag', { name, color: COLORS[S2.tag.length % COLORS.length] }));
          if (!selTags.includes(id)) selTags.push(id);
          tagsBox.innerHTML = tagChips(P(), selTags);
          bindTags();
        };
      };
      bindTags();
      const setKind = (k) => {
        kind = k;
        f.dataset.kind = k;
        el.querySelectorAll('[data-k]').forEach((b) => {
          b.classList.toggle('on', b.dataset.k === k);
          b.setAttribute('aria-checked', b.dataset.k === k);
        });
        el.querySelector('[data-hint]').textContent = TASK_KINDS[k].hint;
        el.querySelector('[data-duelabel]').textContent = k === 'sprint' ? 'Fim' : 'Data';
        el.querySelector('[data-sublabel]').textContent = k === 'sprint' ? 'Etapas do sprint' : 'Subtarefas';
        el.querySelector('[data-subnew]').placeholder = k === 'sprint' ? 'Adicionar etapa' : 'Adicionar subtarefa';
        if (k === 'sprint' && (!f.due.value || f.due.value <= today())) {
          f.due.value = addDays(today(), 7);
          f.due.dispatchEvent(new Event('change'));
        }
        haptic('tick');
      };
      el.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => setKind(b.dataset.k)));
      const wdBox = el.querySelector('[data-wdays]');
      f.repeat.addEventListener('change', () => {
        wdBox.hidden = f.repeat.value !== 'custom';
        if (f.repeat.value === 'custom' && !f.querySelector('input[name=rdays]:checked')) {
          const d = f.due.value ? weekday(f.due.value) : weekday(today());
          const box = f.querySelector(`input[name=rdays][value="${d}"]`);
          if (box) box.checked = true;
        }
      });
      const dur = f.duration;
      dur.oninput = () => (el.querySelector('[data-dur]').textContent = `${dur.value} min`);
      const redraw = () => {
        list.innerHTML = subHtml();
        bindSubs();
      };
      const bindSubs = () => {
        list.querySelectorAll('[data-sub]').forEach((c) =>
          c.addEventListener('change', () => {
            subs[+c.dataset.sub].done = c.checked;
            c.closest('.subtask').classList.toggle('done', c.checked);
            if (c.checked) play('tick');
          }),
        );
        list.querySelectorAll('[data-subdel]').forEach((b) =>
          b.addEventListener('click', () => {
            subs.splice(+b.dataset.subdel, 1);
            redraw();
          }),
        );
      };
      bindSubs();
      const newSub = el.querySelector('[data-subnew]');
      const addSub = () => {
        const v = newSub.value.trim();
        if (!v) return;
        subs.push({ id: uid(8), title: v, done: false });
        newSub.value = '';
        redraw();
        newSub.focus();
      };
      el.querySelector('[data-subadd]').onclick = addSub;
      newSub.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addSub();
        }
      };
      el.querySelector('[data-del]')?.addEventListener('click', async () => {
        if (prefs().confirmDelete && !(await confirmDialog(`Excluir "${t.title}"? Esta ação não pode ser desfeita.`, { ok: 'Excluir', danger: true, title: 'Excluir tarefa' }))) return;
        close();
        await removeTask(id);
        toast('Tarefa excluída');
      });
      f.onsubmit = async (e) => {
        e.preventDefault();
        const v = readForm(f);
        if (!v.title.trim()) return;
        if (newSub.value.trim()) addSub();
        const isChallenge = kind === 'challenge';
        const rdays = [...f.querySelectorAll('input[name=rdays]:checked')].map((x) => Number(x.value)).sort();
        if (v.repeat === 'custom' && (kind === 'normal' || kind === 'timed') && !rdays.length) return toast('Escolha os dias da semana.');
        let due = isChallenge ? today() : v.due || undefined;
        // Repetição em dias escolhidos: a primeira data cai no próximo desses dias.
        if (v.repeat === 'custom' && rdays.length && (kind === 'normal' || kind === 'timed')) {
          let d = due || today();
          for (let i = 0; i < 7 && !rdays.includes(weekday(d)); i++) d = addDays(d, 1);
          due = d;
        }
        const data = {
          ...(id ? strip(t) : defaults),
          kind,
          title: v.title.trim(),
          notes: v.notes.trim() || undefined,
          tags: selTags.length ? selTags : undefined,
          due,
          time: due && v.time && kind !== 'sprint' ? v.time : undefined,
          remindBefore: due && v.time && kind !== 'sprint' && v.remindBefore !== '' && v.remindBefore != null ? Number(v.remindBefore) : undefined,
          start: kind === 'sprint' ? v.start || today() : undefined,
          duration: kind === 'timed' ? Number(v.duration) || 30 : undefined,
          priority: v.priority || 'P4',
          projectId: v.projectId || undefined,
          recurrence: kind === 'normal' || kind === 'timed' ? (v.repeat === 'custom' ? { type: 'weekly', weekdays: rdays } : repeatFrom(v.repeat, due, t.recurrence)) : undefined,
          subtasks: subs.length ? subs : undefined,
        };
        if (data.recurrence && !data.due) data.due = today();
        if (kind === 'sprint' && data.due < data.start) return toast('O fim do sprint precisa ser depois do início.');
        const c = checkTask(data, id);
        if (!c.ok) {
          play('error');
          return toast(c.msg, c.shop ? { action: 'Ir à Loja', onAction: () => (close(), app.nav('loja')), ms: 5000 } : { ms: 5000 });
        }
        close();
        if (id) await saveTask(id, data, c.consume);
        else {
          app.lastAdded = await addTask(data, c.consume);
          play('tick');
        }
        if (c.consume.length) toast(`${c.consume.map((k) => ITEMS[k].name).join(' e ')} usado.`);
        else if (v.time && !due) toast('O horário só vale para tarefas com data.');
      };
    },
  });
}


function tagChips(S, sel) {
  return `${S.tag.map((tg) => `<button type="button" class="chip tag${sel.includes(tg.id) ? ' on' : ''}" data-tag="${esc(tg.id)}" aria-pressed="${sel.includes(tg.id)}" style="--c:${esc(tg.color || 'var(--dim)')}"><i class="dot"></i>${esc(tg.name)}</button>`).join('')}<button type="button" class="chip" data-tagnew>${icon('plus')}Nova</button>`;
}
