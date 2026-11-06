// Busca: tarefas (título, descrição, etiquetas e projeto), hábitos, projetos e itens da mente.
// Filtros rápidos: só abertas e por etiqueta. Resultados atualizam enquanto digita.
import { P, app, personal } from '../state.js';
import { taskOpen } from '../core/model.js';
import { esc, norm } from '../lib/util.js';
import { icon, sheet } from '../ui/ui.js';
import { taskList, bindTasks } from './tasks.js';

export function openSearch() {
  let onlyOpen = true;
  let tag = null;
  let closeSheet = null;
  let unsub = null;
  closeSheet = sheet({
    onClose: () => unsub?.(),
    title: 'Buscar',
    wide: true,
    body: `<div class="search">
      <label class="search-in">${icon('search')}<input type="search" placeholder="Tarefas, etiquetas, projetos, hábitos" autocomplete="off" enterkeyhint="search" aria-label="Buscar" autofocus></label>
      <div class="chips" data-filters></div>
      <div data-results></div></div>`,
    onMount(el) {
      const input = el.querySelector('input');
      const res = el.querySelector('[data-results]');
      const filters = el.querySelector('[data-filters]');
      const paintFilters = () => {
        const S = P();
        filters.innerHTML = `<button type="button" class="chip${onlyOpen ? ' on' : ''}" data-open aria-pressed="${onlyOpen}">Só abertas</button>${S.tag
          .map((t) => `<button type="button" class="chip tag${tag === t.id ? ' on' : ''}" data-tag="${esc(t.id)}" aria-pressed="${tag === t.id}" style="--c:${esc(t.color || 'var(--dim)')}"><i class="dot"></i>${esc(t.name)}</button>`)
          .join('')}`;
        filters.querySelector('[data-open]').onclick = () => {
          onlyOpen = !onlyOpen;
          paintFilters();
          run();
        };
        filters.querySelectorAll('[data-tag]').forEach(
          (b) =>
            (b.onclick = () => {
              tag = tag === b.dataset.tag ? null : b.dataset.tag;
              paintFilters();
              run();
            }),
        );
      };
      const run = () => {
        const S = P();
        const q = norm(input.value);
        if (!q && !tag) {
          res.innerHTML = `<p class="hint search-hint">Dica: na adição rápida, escreva em linguagem natural, como <b>Pagar luz amanhã 9h p1 #Casa @contas</b>.</p>`;
          return;
        }
        const proj = new Map(S.project.map((p) => [p.id, p.name]));
        const tagName = new Map(S.tag.map((t) => [t.id, t.name]));
        const hay = (t) => norm([t.title, t.notes, proj.get(t.projectId), ...(t.tags || []).map((x) => tagName.get(x)), ...(t.subtasks || []).map((s) => s.title)].filter(Boolean).join(' '));
        const tasks = S.task
          .filter((t) => !t.archived && (!onlyOpen || taskOpen(t)) && (!tag || (t.tags || []).includes(tag)) && (!q || hay(t).includes(q)))
          .sort((a, b) => Number(!!a.done) - Number(!!b.done) || (a.due || '9').localeCompare(b.due || '9'))
          .slice(0, 50);
        const habits = q ? S.habit.filter((h) => norm(h.title).includes(q)) : [];
        const projects = q ? S.project.filter((p) => norm(p.name).includes(q)) : [];
        const brain = q ? S.brain.filter((b) => norm(b.text).includes(q)) : [];
        const parts = [];
        if (tasks.length) parts.push(`<section class="block"><div class="block-head"><h2>Tarefas<span class="count">${tasks.length}</span></h2></div>${taskList(tasks, { S, showDue: true })}</section>`);
        if (projects.length) parts.push(`<section class="block"><div class="block-head"><h2>Projetos</h2></div><div class="chips">${projects.map((p) => `<button type="button" class="chip" data-proj="${esc(p.id)}" style="--c:${esc(p.color || 'var(--accent)')}"><i class="dot"></i>${esc(p.name)}</button>`).join('')}</div></section>`);
        if (habits.length) parts.push(`<section class="block"><div class="block-head"><h2>Hábitos</h2></div><div class="chips">${habits.map((h) => `<button type="button" class="chip" data-habits>${esc(h.icon || '')} ${esc(h.title)}</button>`).join('')}</div></section>`);
        if (brain.length) parts.push(`<section class="block"><div class="block-head"><h2>Na mente</h2></div><div class="chips">${brain.map((b) => `<span class="chip">${esc(b.text)}</span>`).join('')}</div></section>`);
        res.innerHTML = parts.join('') || `<p class="hint search-hint">Nada encontrado${onlyOpen ? '. Experimente desligar "Só abertas".' : '.'}</p>`;
        bindTasks(res);
        res.querySelectorAll('[data-proj]').forEach((b) => (b.onclick = () => (closeSheet(), app.nav(`projeto-${b.dataset.proj}`))));
        res.querySelectorAll('[data-habits]').forEach((b) => (b.onclick = () => (closeSheet(), app.nav('habitos'))));
      };
      paintFilters();
      run();
      input.oninput = run;
      // Concluir uma tarefa nos resultados atualiza a lista.
      unsub = personal.subscribe(() => setTimeout(run, 30));
    },
  });
}
