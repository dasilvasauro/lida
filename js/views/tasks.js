// Peças das listas de tarefas: linha (por tipo), cartão do sprint, adicionar rápido e o painel de edição.
import { P, app, prefs } from '../state.js';
import { PRIORITIES, TASK_KINDS, recurrenceLabel } from '../core/model.js';
import { toggleTask, toggleSub, addTask, saveTask, removeTask, strip, checkTask, sprintInfo } from '../core/tasks.js';
import { ITEMS, applyTaskItem } from '../core/game.js';
import { esc, uid, relDay, fmtTime, plural, addDays } from '../lib/util.js';
import { today } from '../lib/clock.js';
import { icon, sheet, toast, confirmDialog, opt, readForm, bar } from '../ui/ui.js';
import { play } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';
import { celebrate } from './celebrate.js';
import { focusTask } from './focus.js';

/* ---------- Linha ---------- */
export function taskRow(t, { showDue = false, S = P(), i = 0 } = {}) {
  const day = today();
  const meta = [];
  const kind = t.kind || 'normal';
  if (kind === 'challenge') meta.push(`<span class="badge warm">${icon('bolt')}Desafio do dia</span>`);
  if (kind === 'bonus') meta.push(`<span class="badge pos">${icon('gift')}Bônus</span>`);
  if (t.powerups?.dice) meta.push(`<span class="badge acc">${icon('dice')}×2</span>`);
  if (t.due && (showDue || t.due < day) && kind !== 'challenge') meta.push(`<span class="${t.due < day && !t.done ? 'late' : t.due === day ? 'today' : ''}">${icon('plan')}${esc(relDay(t.due, day))}</span>`);
  if (t.time) meta.push(`<span>${icon('timer')}${esc(fmtTime(t.time))}</span>`);
  if (kind === 'timed' && t.duration) meta.push(`<span>${icon('timer')}${t.duration} min</span>`);
  if (t.recurrence) meta.push(`<span title="${esc(recurrenceLabel(t.recurrence))}">${icon('repeat')}</span>`);
  const subs = t.subtasks || [];
  if (subs.length && kind !== 'routine') meta.push(`<span>${icon('list')}${subs.filter((s) => s.done).length}/${subs.length}</span>`);
  if (t.notes) meta.push(`<span aria-label="Tem descrição">${icon('edit')}</span>`);
  const proj = t.projectId && S.byId.get(t.projectId);
  if (proj) meta.push(`<span class="tag"><i class="dot" style="--c:${esc(proj.color || 'var(--dim)')}"></i>${esc(proj.name)}</span>`);
  const label = t.done ? 'Reabrir tarefa' : 'Concluir tarefa';
  const routine = kind === 'routine' && subs.length && !t.done;
  const doneN = subs.filter((s) => s.done).length;
  return `<li class="task kind-${kind}${t.done ? ' done' : ''}${t.failed ? ' failed' : ''}" data-id="${esc(t.id)}" style="--i:${i}">
    <button type="button" class="task-check" data-p="${esc(kind === 'routine' ? 'R' : t.priority || 'P4')}" data-check aria-label="${label}: ${esc(t.title)}">${icon('check')}</button>
    <div class="task-body">
      <div class="task-open" data-open role="button" tabindex="0">
        <span class="task-title">${kind === 'routine' ? `<span class="routine-tag">${icon('repeat')}</span>` : ''}${esc(t.title)}</span>
        ${meta.length ? `<div class="task-meta">${meta.join('')}</div>` : ''}
      </div>
      ${
        routine
          ? `<div class="routine-items">${bar(doneN / subs.length, { cls: 'thin', label: 'Itens da rotina' })}
          <ul>${subs.map((s) => `<li><label class="check mini${s.done ? ' on' : ''}"><input type="checkbox" data-sub="${esc(s.id)}"${s.done ? ' checked' : ''}><span>${esc(s.title)}</span></label></li>`).join('')}</ul></div>`
          : ''
      }
    </div>
    ${kind === 'timed' && !t.done ? `<button type="button" class="icon-btn play-btn" data-focus aria-label="Iniciar foco: ${esc(t.title)}">${icon('play')}</button>` : ''}
  </li>`;
}

export const taskList = (list, opts = {}) => `<ul class="tasks">${list.map((t, i) => taskRow(t, { ...opts, i })).join('')}</ul>`;

// Liga cliques de concluir/abrir em qualquer lista dentro de `root`.
export function bindTasks(root) {
  root.querySelectorAll('.task').forEach((li) => {
    const id = li.dataset.id;
    li.querySelector('[data-check]').onclick = (e) => onCheck(e.currentTarget, li, id);
    const body = li.querySelector('[data-open]');
    body.onclick = () => editTask(id);
    body.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        editTask(id);
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
  btn.classList.remove('pop');
  void btn.offsetWidth;
  if (!wasDone) {
    btn.classList.add('pop');
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
  return `<section class="sprint card" data-sprint="${esc(t.id)}">
    <div class="sprint-head">
      <span class="sprint-ic">${icon('flag')}</span>
      <div class="grow"><small>Sprint · ${s.left ? `${plural(s.left, 'dia restante', 'dias restantes')}` : 'termina hoje'}</small><b data-open-sprint role="button" tabindex="0">${esc(t.title)}</b></div>
      <span class="sprint-pct">${Math.round(s.steps * 100)}%</span>
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
  el.querySelector('[data-open-sprint]').onclick = () => editTask(id);
  el.querySelector('[data-finish]')?.addEventListener('click', async () => {
    play('complete');
    haptic('done');
    const res = await toggleTask(id);
    if (res?.done) celebrate('Sprint concluído', res.reward, res);
  });
}

/* ---------- Adicionar rápido ---------- */
// defaults: campos que a tarefa nova recebe (ex.: { due: hoje } na tela Hoje).
export function quickAdd(defaults = {}) {
  return `<form class="quick-add" data-quick="${esc(defaults.due || 'sem-data')}">
    <span class="qa-plus">${icon('plus')}</span>
    <input name="title" placeholder="Adicionar tarefa" autocomplete="off" enterkeyhint="done" aria-label="Nova tarefa">
    <button type="button" class="icon-btn qa-more" data-more aria-label="Mais opções">${icon('more')}</button>
    <input type="hidden" name="defaults" value="${esc(JSON.stringify(defaults))}">
  </form>`;
}
export function bindQuick(root) {
  const f = root.querySelector('[data-quick]');
  if (!f) return;
  const defaults = () => JSON.parse(f.defaults.value || '{}');
  f.querySelector('[data-more]').onclick = () => editTask(null, { ...defaults(), title: f.title.value.trim() });
  f.onsubmit = async (e) => {
    e.preventDefault();
    const title = f.title.value.trim();
    if (!title) return;
    f.title.value = '';
    haptic('add');
    play('tick');
    const key = f.dataset.quick;
    app.lastAdded = await addTask({ ...defaults(), title });
    // A lista é redesenhada: devolve o foco ao mesmo campo para anotar várias em sequência.
    setTimeout(() => document.querySelector(`[data-quick="${key}"] input[name=title]`)?.focus(), 80);
  };
}

/* ---------- Painel de edição ---------- */
const REPEAT = [
  ['', 'Não repete'],
  ['daily', 'Todo dia'],
  ['weekdays', 'Dias úteis (seg a sex)'],
  ['weekly', 'Toda semana, no mesmo dia'],
  ['monthly', 'Todo mês, no mesmo dia'],
  ['yearly', 'Todo ano, na mesma data'],
];
function repeatValue(rec) {
  if (!rec) return '';
  if (rec.type === 'weekly' && (rec.weekdays || []).slice().sort().join() === '1,2,3,4,5') return 'weekdays';
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
  const bonusN = S.money.items.bonusTask || 0;
  const subHtml = () =>
    subs
      .map(
        (s, i) => `<li class="subtask${s.done ? ' done' : ''}"><label class="check"><input type="checkbox" data-sub="${i}"${s.done ? ' checked' : ''}><span>${esc(s.title)}</span></label>
        <button type="button" class="icon-btn" data-subdel="${i}" aria-label="Remover ${esc(s.title)}">${icon('x', 'sm')}</button></li>`,
      )
      .join('');
  const powerups = id && !t.done && !t.failed ? ['respite', 'relief'].filter((k) => (S.money.items[k] || 0) > 0 && (k === 'respite' ? t.time : t.due)) : [];
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
      <label class="field"><span>Descrição</span><textarea name="notes" rows="3" placeholder="Detalhes, links, o que for útil">${esc(t.notes || '')}</textarea></label>
      <div class="grid2 only-not-challenge">
        <label class="field only-sprint"><span>Início</span><input type="date" name="start" value="${esc(t.start || t.createdDay || today())}"></label>
        <label class="field"><span data-duelabel>${kind === 'sprint' ? 'Fim' : 'Data'}</span><input type="date" name="due" value="${esc(t.due || (kind === 'sprint' ? addDays(today(), 7) : ''))}"></label>
        <label class="field not-sprint"><span>Horário</span><input type="time" name="time" value="${esc(t.time || '')}"></label>
      </div>
      <label class="field only-timed"><span>Duração: <b data-dur>${t.duration || 30} min</b></span><input type="range" name="duration" min="5" max="120" step="5" value="${t.duration || 30}"></label>
      <div class="grid2">
        <label class="field"><span>Prioridade</span><select name="priority">${PRIORITIES.map((p) => opt(p.id, `${p.short} · ${p.id === 'P4' ? 'Nenhuma' : p.name}`, (t.priority || 'P4') === p.id)).join('')}</select></label>
        <label class="field only-repeat"><span>Repetir</span><select name="repeat">${REPEAT.map(([v, l]) => opt(v, l, repeatValue(t.recurrence) === v)).join('')}</select></label>
      </div>
      ${S.project.length ? `<label class="field"><span>Projeto</span><select name="projectId">${opt('', 'Nenhum', !t.projectId)}${S.project.map((p) => opt(p.id, p.name, p.id === t.projectId)).join('')}</select></label>` : ''}
      <div class="field"><span data-sublabel>${kind === 'sprint' ? 'Etapas do sprint' : 'Subtarefas'}</span>
        <ul class="subs" data-subs>${subHtml()}</ul>
        <div class="sub-add"><input data-subnew placeholder="${kind === 'sprint' ? 'Adicionar etapa' : 'Adicionar subtarefa'}" autocomplete="off" aria-label="Nova subtarefa"><button type="button" class="btn small" data-subadd>${icon('plus')}Adicionar</button></div>
      </div>
      ${
        powerups.length
          ? `<div class="field"><span>Power-ups</span><div class="chips">${powerups.map((k) => `<button type="button" class="chip" data-power="${k}">${icon(ITEMS[k].icon)}${ITEMS[k].name} · ${k === 'respite' ? '+3 h' : '+1 dia'}<small>${S.money.items[k]}</small></button>`).join('')}</div></div>`
          : ''
      }
      ${t.failed ? `<p class="form-meta neg">Esta tarefa venceu. Ainda dá para concluir, mas sem recompensa.</p>` : ''}
      <p class="form-meta" data-repeatnote>${t.recurrence ? esc(recurrenceLabel(t.recurrence)) + '. Ao concluir, a próxima ocorrência é criada sozinha.' : ''}</p>
      <div class="sheet-actions">
        ${id ? `<button type="button" class="btn ghost danger-text" data-del>${icon('trash')}Excluir</button>` : '<span></span>'}
        <button class="btn primary">${id ? 'Salvar' : 'Adicionar tarefa'}</button>
      </div>
    </form>`,
    onMount(el, close) {
      const f = el.querySelector('[data-f]');
      const list = el.querySelector('[data-subs]');
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
      el.querySelectorAll('[data-power]').forEach((b) =>
        b.addEventListener('click', async () => {
          const k = b.dataset.power;
          if (!(await confirmDialog(`Usar ${ITEMS[k].name} em "${t.title}"? ${ITEMS[k].desc}`, { ok: 'Usar', title: ITEMS[k].name }))) return;
          close();
          if (await applyTaskItem(k, P().byId.get(id))) {
            play('powerup');
            haptic('start');
            toast(k === 'respite' ? 'Respiro usado: +3 horas de prazo.' : 'Alívio usado: prazo adiado em 1 dia.');
          }
        }),
      );
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
        const due = isChallenge ? today() : v.due || undefined;
        const data = {
          ...(id ? strip(t) : defaults),
          kind,
          title: v.title.trim(),
          notes: v.notes.trim() || undefined,
          due,
          time: due && v.time && kind !== 'sprint' ? v.time : undefined,
          start: kind === 'sprint' ? v.start || today() : undefined,
          duration: kind === 'timed' ? Number(v.duration) || 30 : undefined,
          priority: v.priority || 'P4',
          projectId: v.projectId || undefined,
          recurrence: kind === 'normal' || kind === 'timed' ? repeatFrom(v.repeat, due, t.recurrence) : undefined,
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

