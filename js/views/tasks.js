// Peças comuns das listas de tarefas: linha da tarefa, adicionar rápido e o painel de edição.
import { P, app, prefs } from '../state.js';
import { PRIORITIES, recurrenceLabel } from '../core/model.js';
import { toggleTask, addTask, updateTask, removeTask, strip } from '../core/tasks.js';
import { esc, uid, relDay, fmtTime, fmtInt } from '../lib/util.js';
import { today } from '../lib/clock.js';
import { icon, sheet, toast, confirmDialog, opt, readForm } from '../ui/ui.js';
import { play } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';
import { levelUp } from '../ui/reward.js';

/* ---------- Linha ---------- */
export function taskRow(t, { showDue = false, S = P() } = {}) {
  const day = today();
  const meta = [];
  if (t.due && (showDue || t.due < day)) meta.push(`<span class="${t.due < day && !t.done ? 'late' : t.due === day ? 'today' : ''}">${icon('plan')}${esc(relDay(t.due, day))}</span>`);
  if (t.time) meta.push(`<span>${icon('timer')}${esc(fmtTime(t.time))}</span>`);
  if (t.recurrence) meta.push(`<span title="${esc(recurrenceLabel(t.recurrence))}">${icon('repeat')}</span>`);
  const subs = t.subtasks || [];
  if (subs.length) meta.push(`<span>${icon('list')}${subs.filter((s) => s.done).length}/${subs.length}</span>`);
  if (t.notes) meta.push(`<span aria-label="Tem descrição">${icon('edit')}</span>`);
  const proj = t.projectId && S.byId.get(t.projectId);
  if (proj) meta.push(`<span class="tag"><i class="dot" style="--c:${esc(proj.color || 'var(--dim)')}"></i>${esc(proj.name)}</span>`);
  const label = t.done ? 'Reabrir tarefa' : 'Concluir tarefa';
  return `<li class="task${t.done ? ' done' : ''}" data-id="${esc(t.id)}">
    <button type="button" class="task-check" data-p="${esc(t.priority || 'P4')}" data-check aria-label="${label}: ${esc(t.title)}">${icon('check')}</button>
    <div class="task-body" data-open role="button" tabindex="0">
      <span class="task-title">${esc(t.title)}</span>
      ${meta.length ? `<div class="task-meta">${meta.join('')}</div>` : ''}
    </div>
  </li>`;
}

export const taskList = (list, opts) => `<ul class="tasks">${list.map((t) => taskRow(t, opts)).join('')}</ul>`;

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
  });
}

async function onCheck(btn, li, id) {
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
  await new Promise((r) => setTimeout(r, wasDone ? 120 : 380));
  if (!wasDone && !prefs().showDone) li.classList.add('leaving');
  const res = await toggleTask(id);
  setTimeout(() => {
    app.hold = false;
    app.refresh();
  }, !wasDone && !prefs().showDone ? 300 : 0);
  if (!res) return;
  if (res.done) {
    const r = res.reward;
    toast(r.xp ? `Concluída · +${fmtInt(r.xp)} XP, +${fmtInt(r.gold)} de ouro` : 'Tarefa concluída', { action: 'Desfazer', onAction: () => toggleTask(id) });
    if (res.levelUp) setTimeout(() => levelUp(res.levelUp), 450);
    else if (r.xp) setTimeout(() => play('coin'), 260);
  }
}

/* ---------- Adicionar rápido ---------- */
// defaults: campos que a tarefa nova recebe (ex.: { due: hoje } na tela Hoje).
export function quickAdd(defaults = {}) {
  return `<form class="quick-add" data-quick="${esc(defaults.due || 'sem-data')}">
    <span class="qa-plus">${icon('plus')}</span>
    <input name="title" placeholder="Adicionar tarefa" autocomplete="off" enterkeyhint="done" aria-label="Nova tarefa">
    <input type="hidden" name="defaults" value="${esc(JSON.stringify(defaults))}">
  </form>`;
}
export function bindQuick(root) {
  const f = root.querySelector('[data-quick]');
  if (!f) return;
  f.onsubmit = async (e) => {
    e.preventDefault();
    const title = f.title.value.trim();
    if (!title) return;
    f.title.value = '';
    haptic('add');
    play('tick');
    const key = f.dataset.quick;
    await addTask({ ...JSON.parse(f.defaults.value || '{}'), title });
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

export function editTask(id, defaults = {}) {
  const S = P();
  const t = id ? S.byId.get(id) : { priority: 'P4', ...defaults };
  if (id && !t) return;
  let subs = (t.subtasks || []).map((s) => ({ ...s }));
  const subHtml = () =>
    subs
      .map(
        (s, i) => `<li class="subtask${s.done ? ' done' : ''}"><label class="check"><input type="checkbox" data-sub="${i}"${s.done ? ' checked' : ''}><span>${esc(s.title)}</span></label>
        <button type="button" class="icon-btn" data-subdel="${i}" aria-label="Remover subtarefa ${esc(s.title)}">${icon('x', 'sm')}</button></li>`,
      )
      .join('');
  sheet({
    title: id ? 'Editar tarefa' : 'Nova tarefa',
    wide: true,
    body: `<form class="form" data-f>
      <label class="field"><span>Título</span><input name="title" value="${esc(t.title || '')}" required autocomplete="off" ${id ? '' : 'autofocus'}></label>
      <label class="field"><span>Descrição</span><textarea name="notes" rows="3" placeholder="Detalhes, links, o que for útil">${esc(t.notes || '')}</textarea></label>
      <div class="grid2">
        <label class="field"><span>Data</span><input type="date" name="due" value="${esc(t.due || '')}"></label>
        <label class="field"><span>Horário</span><input type="time" name="time" value="${esc(t.time || '')}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>Prioridade</span><select name="priority">${PRIORITIES.map((p) => opt(p.id, `${p.short} · ${p.id === 'P4' ? 'Nenhuma' : p.name}`, (t.priority || 'P4') === p.id)).join('')}</select></label>
        <label class="field"><span>Repetir</span><select name="repeat">${REPEAT.map(([v, l]) => opt(v, l, repeatValue(t.recurrence) === v)).join('')}</select></label>
      </div>
      ${S.project.length ? `<label class="field"><span>Projeto</span><select name="projectId">${opt('', 'Nenhum', !t.projectId)}${S.project.map((p) => opt(p.id, p.name, p.id === t.projectId)).join('')}</select></label>` : ''}
      <div class="field"><span>Subtarefas</span>
        <ul class="subs" data-subs>${subHtml()}</ul>
        <div class="sub-add"><input data-subnew placeholder="Adicionar subtarefa" autocomplete="off" aria-label="Nova subtarefa"><button type="button" class="btn small" data-subadd>${icon('plus')}Adicionar</button></div>
      </div>
      <p class="form-meta" data-repeatnote>${t.recurrence ? esc(recurrenceLabel(t.recurrence)) + '. Ao concluir, a próxima ocorrência é criada automaticamente.' : ''}</p>
      <div class="sheet-actions">
        ${id ? `<button type="button" class="btn ghost danger-text" data-del>${icon('trash')}Excluir</button>` : '<span></span>'}
        <button class="btn primary">${id ? 'Salvar' : 'Adicionar tarefa'}</button>
      </div>
    </form>`,
    onMount(el, close) {
      const f = el.querySelector('[data-f]');
      const list = el.querySelector('[data-subs]');
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
        const data = {
          ...(id ? strip(t) : defaults),
          title: v.title.trim(),
          notes: v.notes.trim() || undefined,
          due: v.due || undefined,
          time: v.due && v.time ? v.time : undefined,
          priority: v.priority || 'P4',
          projectId: v.projectId || undefined,
          recurrence: repeatFrom(v.repeat, v.due, t.recurrence),
          subtasks: subs.length ? subs : undefined,
        };
        if (data.recurrence && !data.due) data.due = today();
        close();
        if (id) await updateTask(id, data);
        else await addTask(data);
        if (v.time && !v.due) toast('O horário só vale para tarefas com data.');
      };
    },
  });
}
