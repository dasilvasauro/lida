// Aba "Eu": perfil, nível e marcos, estatísticas com gráficos, constância dos hábitos,
// IPL (índice de produtividade), humor, visão e reflexões. Ajustes fica num link pequeno daqui.
import { P, app, personal, displayName } from '../state.js';
import { levelTitle, nextTitle } from '../core/model.js';
import { MILESTONES } from '../core/game.js';
import { habitsOnDay, doneDay } from '../core/tasks.js';
import { today } from '../lib/clock.js';
import { esc, fmtInt, plural, addDays, sum, weekday, MSHORT, WD_SHORT, ymOf, fmtMonth, daysBetween, uid } from '../lib/util.js';
import { icon, sheet, toast, confirmDialog, empty, COLORS, colorPicker, readForm } from '../ui/ui.js';
import { columns, line, heat } from '../ui/chart.js';
import { IPL_PARTS, dayIPL, grade, gradeLine, monthIPL } from '../core/ipl.js';
import { showDaySummary, showMonthSummary, partsBars } from './summary.js';
import { haptic } from '../ui/haptics.js';
import { avatar, levelCard } from './common.js';

export const MOODS = [
  { id: 'radiant', emoji: '😄', name: 'Radiante' },
  { id: 'happy', emoji: '🙂', name: 'Bem' },
  { id: 'normal', emoji: '😐', name: 'Normal' },
  { id: 'annoyed', emoji: '😕', name: 'Chateado' },
  { id: 'disappointed', emoji: '😞', name: 'Desanimado' },
];

// Rostos desenhados (em vez dos emojis do sistema, que mudam de aparelho para aparelho).
// Olhos e boca mudam de forma; a cor só reforça (de verde a vermelho, passando pelo cinza).
const FACE = {
  radiant: '<path d="M8 10.2c.6-1 1.8-1 2.4 0M13.6 10.2c.6-1 1.8-1 2.4 0"/><path d="M7.6 13.4h8.8a4.4 4.4 0 0 1-8.8 0z" class="fill"/>',
  happy: '<path d="M9 9.6v.8M15 9.6v.8" stroke-width="2.4"/><path d="M8.4 13.8a4.2 4.2 0 0 0 7.2 0"/>',
  normal: '<path d="M9 9.6v.8M15 9.6v.8" stroke-width="2.4"/><path d="M8.8 15h6.4"/>',
  annoyed: '<path d="M8 9.2l2.2.8M16 9.2l-2.2.8"/><path d="M9.2 16.2c1.6-1.4 4-1.4 5.6 0"/>',
  disappointed: '<path d="M8.2 10.4c.7.6 1.6.6 2.3 0M13.5 10.4c.7.6 1.6.6 2.3 0"/><path d="M8.6 16.8a4.2 4.2 0 0 1 6.8 0"/>',
};
export const face = (id, size = 28) =>
  `<svg class="face face-${id}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.2" class="face-bg"/>${FACE[id] || ''}</svg>`;
const MOOD = Object.fromEntries(MOODS.map((m) => [m.id, m]));

export { grade } from '../core/ipl.js';

const GOAL_STATES = [
  ['Inativo', 'Nenhuma ação ainda.'],
  ['Planejado', 'Métodos e recursos pensados.'],
  ['Organizado', 'Virou cronograma e tarefas.'],
  ['Ativo', 'Em prática toda semana.'],
  ['Consistente', 'Já dá frutos e faz parte da rotina.'],
];

export const meView = {
  title: 'Eu',
  sub: () => '',
  range: 7,
  render(el) {
    const S = P();
    const d = today();
    const m = S.money;
    const nt = nextTitle(m.level);
    const name = displayName() || (app.demo ? 'Modo demo' : 'Você');
    const sub = app.demo ? 'Dados de exemplo' : app.mode === 'cloud' ? app.user?.email || 'Conta Google' : 'Somente neste aparelho';
    el.innerHTML = `
      <section class="me-head"><div class="me-av">${avatar(64)}</div><div class="grow"><h2>${esc(name)}</h2><p>${esc(levelTitle(m.level))} · ${esc(sub)}</p></div></section>
      ${levelCard(S)}
      ${nt ? `<p class="hint next-title">Próximo título: <b>${esc(nt[1])}</b> no nível ${nt[0]}</p>` : ''}
      ${milestones(m.level)}
      ${stats(S, d)}
      ${habitHeat(S, d)}
      ${iplSection(S, d)}
      ${moods(S, d)}
      ${vision(S, d)}
      ${reflections(S)}
      <p class="me-foot"><a href="#ajustes" class="link">${icon('settings', 'sm')} Ajustes, aparência e conta</a></p>`;
    bind(el);
  },
};

/* ---------- Marcos ---------- */
function milestones(level) {
  const next = MILESTONES.find((x) => x.level > level);
  return `<section class="block"><div class="block-head"><h2>Marcos</h2>${next ? `<span class="hint">Próximo: nível ${next.level}</span>` : ''}</div>
    <ol class="miles">${MILESTONES.map((x) => `<li class="${x.level <= level ? 'got' : x === next ? 'next' : ''}"><span class="mile-ic">${icon(x.level <= level ? 'check' : x.icon)}</span><b>Nível ${x.level}</b><small>${esc(x.text)}</small></li>`).join('')}</ol></section>`;
}

/* ---------- Estatísticas ---------- */
const xpOn = (S, day) => sum((S.evByDate.get(day) || []).filter((e) => e.kind !== 'import' && (e.xp || 0) > 0), (e) => e.xp);
const goldOn = (S, day) => sum((S.evByDate.get(day) || []).filter((e) => e.kind !== 'import' && (e.gold || 0) > 0), (e) => e.gold);

function stats(S, d) {
  const n = meView.range;
  const days = Array.from({ length: n }, (_, i) => addDays(d, i - n + 1));
  const doneBy = new Map();
  for (const t of S.task) if (t.done && t.doneAt) doneBy.set(doneDay(t), (doneBy.get(doneDay(t)) || 0) + 1);
  const xp = days.map((x) => xpOn(S, x));
  const done = days.map((x) => doneBy.get(x) || 0);
  let hd = 0;
  let ht = 0;
  for (const x of days) {
    const h = habitsOnDay(S, x);
    hd += h.done;
    ht += h.done + h.missed;
  }
  const focus = sum(S.ev.filter((e) => e.kind === 'focus' && days.includes(e.date)), (e) => e.focusSec || 0);
  const gold = sum(days, (x) => goldOn(S, x));
  const lab = (x) => (n <= 7 ? WD_SHORT[weekday(x)] : `${Number(x.slice(8))}`);
  const fmtD = (x) => `${Number(x.slice(8))} ${MSHORT[Number(x.slice(5, 7)) - 1]}`;
  return `<section class="block"><div class="block-head"><h2>Seus números</h2>
      <div class="seg small range" role="radiogroup" aria-label="Período">${[7, 30].map((r) => `<button type="button" role="radio" aria-checked="${n === r}" class="${n === r ? 'on' : ''}" data-range="${r}">${r} dias</button>`).join('')}</div></div>
    <div class="tiles">
      <div class="tile"><small>Tarefas concluídas</small><b>${fmtInt(sum(done))}</b></div>
      <div class="tile"><small>Hábitos em dia</small><b>${ht ? `${Math.round((hd / ht) * 100)}%` : '–'}</b></div>
      <div class="tile"><small>XP ganho</small><b>${fmtInt(sum(xp))}</b></div>
      <div class="tile"><small>Foco</small><b>${focus >= 3600 ? `${(focus / 3600).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h` : `${Math.round(focus / 60)} min`}</b></div>
    </div>
    <div class="charts">
      <figure class="card chart-card"><figcaption><b>XP por dia</b><span>${fmtInt(gold)} de ouro no período</span></figcaption>
        ${columns(days.map((x, i) => ({ label: lab(x), value: xp[i], tip: `${fmtInt(xp[i])} XP|${fmtD(x)}` })), { every: n <= 7 ? 1 : 5, ariaLabel: `XP por dia nos últimos ${n} dias` })}</figure>
      <figure class="card chart-card"><figcaption><b>Tarefas concluídas</b><span>média de ${(sum(done) / n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por dia</span></figcaption>
        ${columns(days.map((x, i) => ({ label: lab(x), value: done[i], tip: `${plural(done[i], 'tarefa', 'tarefas')}|${fmtD(x)}` })), { every: n <= 7 ? 1 : 5, ariaLabel: `Tarefas concluídas por dia nos últimos ${n} dias` })}</figure>
    </div></section>`;
}

/* ---------- Constância dos hábitos ---------- */
function habitHeat(S, d) {
  if (!S.habit.length) return '';
  const weeks = 18;
  const end = d;
  // Começa num domingo para as linhas serem os dias da semana.
  const start = addDays(end, -(weeks * 7 - 1));
  const first = addDays(start, -weekday(start));
  const cells = [];
  for (let x = first; x <= end; x = addDays(x, 1)) {
    const h = habitsOnDay(S, x);
    const tot = h.done + h.missed;
    cells.push({ date: x, v: tot ? h.done / tot : null, tip: tot ? `${h.done} de ${tot}|${Number(x.slice(8))} ${MSHORT[Number(x.slice(5, 7)) - 1]}` : `Sem hábitos|${Number(x.slice(8))} ${MSHORT[Number(x.slice(5, 7)) - 1]}` });
  }
  return `<section class="block"><div class="block-head"><h2>Constância dos hábitos</h2><span class="hint">${weeks} semanas</span></div>
    <div class="card heat-card">${heat(cells, { ariaLabel: 'Hábitos cumpridos por dia nas últimas semanas' })}</div></section>`;
}

/* ---------- IPL ---------- */
function iplSection(S, d) {
  const ym = ymOf(d);
  const mo = monthIPL(S, ym);
  const last30 = S.score.filter((s) => s.date >= addDays(d, -30) && s.date < d && s.score != null).sort((a, b) => a.date.localeCompare(b.date));
  const past = S.month.filter((x) => x.month < ym && (x.score != null || x.grade)).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 4);
  const now = dayIPL(S, d, { live: true });
  const g = mo ? mo.grade : null;
  const lbl = (x) => `${Number(x.slice(8))}/${x.slice(5, 7)}`;
  const y = addDays(d, -1);
  const hasY = S.scoreByDate.has(y);
  return `<section class="block" id="ipl"><div class="block-head"><h2>IPL <small class="h-sub">Índice de Produtividade do Lida</small></h2>${hasY ? '<button type="button" class="link" data-sum-day>Resumo de ontem</button>' : ''}</div>
    <div class="card score-card">
      <div class="ipl-top">
        ${g ? `<div class="grade"><b>${g}</b><span>${mo.score} de média em ${esc(fmtMonth(ym).split(' de ')[0])}</span></div>` : `<div class="grade"><b>–</b><span>A média do mês aparece depois do primeiro dia fechado.</span></div>`}
        ${now.score != null ? `<button type="button" class="ipl-now" data-sum-today><small>Hoje, até agora</small><b>${now.score}</b></button>` : ''}
      </div>
      ${g ? `<p class="grade-line">${esc(gradeLine(g))}</p>` : ''}
      ${last30.length > 1 ? `<figure class="chart-card flat"><figcaption><b>Flutuação</b><span>últimos 30 dias</span></figcaption>${line(last30.map((p) => ({ value: p.score, label: lbl(p.date), tip: `IPL ${p.score} · ${grade(p.score)}|${lbl(p.date)} · ${plural(p.tasksDone || 0, 'tarefa', 'tarefas')}` })), { ariaLabel: 'IPL diário nos últimos 30 dias' })}</figure>` : ''}
      ${now.score != null ? `<div class="ipl-today"><small>Partes de hoje</small>${partsBars(now.parts, { compact: true })}</div>` : ''}
      ${past.length ? `<div class="past">${past.map((x) => `<button type="button" data-sum-month="${x.month}"><small>${esc(fmtMonth(x.month).split(' de ')[0].slice(0, 3))}</small><b>${esc(x.grade || grade(x.score || 0))}</b></button>`).join('')}</div>` : ''}
      <details class="ipl-how">
        <summary>${icon('bulb', 'sm')} Como o IPL é calculado</summary>
        <p>O IPL vai de 0 a 100 e avalia o dia por partes, não pela quantidade de tarefas. <b>Só entram as partes que fazem sentido para o seu uso</b>: sem projetos, a parte de projetos não conta; sem Pomodoro, o foco não conta. As partes que valem no dia são somadas pelos pesos e a conta é reescalada para 0–100.</p>
        <ul>${IPL_PARTS.map((p) => `<li><b>${esc(p.name)}</b> <span class="w">peso ${p.w}</span><br>${esc(p.how)}</li>`).join('')}</ul>
        <p>O dia fecha à meia-noite (ou quando você abre o Lida no dia seguinte). Dias de folga sem nenhuma atividade ficam sem nota e não puxam a média para baixo. A nota do mês é a média dos dias com nota.</p>
        <p class="hint">Exemplo: num dia com 4 tarefas planejadas (3 feitas), hábitos em 80% e sem projetos, o IPL usa só Execução, Hábitos, Constância e Planejamento.</p>
      </details>
    </div></section>`;
}

/* ---------- Humor ---------- */
function moods(S, d) {
  const days = Array.from({ length: 30 }, (_, i) => addDays(d, i - 29));
  const marked = days.filter((x) => S.moodByDate.get(x));
  if (!marked.length) return '';
  const count = Object.fromEntries(MOODS.map((m) => [m.id, 0]));
  for (const x of marked) count[S.moodByDate.get(x)] = (count[S.moodByDate.get(x)] || 0) + 1;
  return `<section class="block"><div class="block-head"><h2>Humor</h2><span class="hint">30 dias</span></div>
    <div class="card mood-card">
      <ol class="mood-strip" aria-label="Humor dos últimos 30 dias">${days
        .map((x) => {
          const mm = MOOD[S.moodByDate.get(x)];
          return `<li class="mo-${mm?.id || 'none'}" tabindex="-1" data-tip="${esc(mm ? mm.name : 'Sem registro')}|${Number(x.slice(8))} ${MSHORT[Number(x.slice(5, 7)) - 1]}">${mm ? face(mm.id, 16) : ''}</li>`;
        })
        .join('')}</ol>
      <ul class="mood-count">${MOODS.map((mm) => `<li><span class="mo-${mm.id}">${face(mm.id, 22)}</span><b>${count[mm.id]}</b><small>${mm.name}</small></li>`).join('')}</ul>
    </div></section>`;
}

/* ---------- Visão ---------- */
function nextCheckpoint(v, d) {
  return (v?.checkpoints || []).filter((c) => c >= d).sort()[0] || null;
}
function vision(S, d) {
  const v = S.vision;
  if (!v || (!v.goals?.length && !v.develop?.length && !v.abandon?.length))
    return `<section class="block"><div class="block-head"><h2>Visão</h2></div>
      <div class="card">${empty({ ic: 'target', title: 'Para onde você está indo?', text: 'Escreva seus objetivos e o que quer desenvolver ou deixar para trás. A cada poucos semanas, o Lida lembra você de revisar.', action: `<button type="button" class="btn primary" data-vision>${icon('plus')}Criar minha visão</button>` })}</div></section>`;
  const cp = nextCheckpoint(v, d);
  const due = !cp || cp <= d;
  return `<section class="block"><div class="block-head"><h2>Visão</h2><button type="button" class="link" data-vision>Editar</button></div>
    <div class="card vision-card">
      ${due ? `<div class="review">${icon('bell')}<span class="grow">Hora de revisar seus objetivos</span><button type="button" class="btn small primary" data-review>Revisar</button></div>` : `<p class="hint">Próxima revisão em ${daysBetween(d, cp)} dias</p>`}
      ${(v.goals || []).length ? `<ul class="goals">${v.goals.map((g) => `<li><span class="grow"><b>${esc(g.title)}</b><small>${GOAL_STATES[(g.state || 1) - 1][0]} · ${GOAL_STATES[(g.state || 1) - 1][1]}</small></span><span class="gsteps" aria-label="Nível ${g.state || 1} de 5">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= (g.state || 1) ? 'on' : ''}"></i>`).join('')}</span></li>`).join('')}</ul>` : ''}
      ${v.develop?.length ? `<div class="traits"><small>Desenvolver</small><div class="chips">${v.develop.map((t) => `<span class="chip on">${esc(t)}</span>`).join('')}</div></div>` : ''}
      ${v.abandon?.length ? `<div class="traits"><small>Deixar para trás</small><div class="chips">${v.abandon.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div></div>` : ''}
    </div></section>`;
}

function newCheckpoints(d) {
  return [10, 20, 30].map((n) => addDays(d, n));
}

function editVision(review = false) {
  const S = P();
  const v = S.vision || {};
  let goals = (v.goals || []).map((g) => ({ ...g }));
  const goalsHtml = () =>
    goals
      .map(
        (g, i) => `<li class="goal-edit"><div class="row"><input data-gt="${i}" value="${esc(g.title)}" aria-label="Objetivo"><button type="button" class="icon-btn" data-gdel="${i}" aria-label="Remover">${icon('x', 'sm')}</button></div>
        <div class="seg small gstate" role="radiogroup" aria-label="Estado">${GOAL_STATES.map((s, k) => `<button type="button" role="radio" class="${(g.state || 1) === k + 1 ? 'on' : ''}" aria-checked="${(g.state || 1) === k + 1}" data-gs="${i}:${k + 1}" title="${s[1]}">${k + 1}</button>`).join('')}</div>
        <small class="hint" data-gsl="${i}">${GOAL_STATES[(g.state || 1) - 1].join(': ')}</small></li>`,
      )
      .join('');
  sheet({
    title: review ? 'Revisar a visão' : 'Minha visão',
    wide: true,
    body: `<form class="form" data-f>
      ${review ? '<p class="sheet-text">Como estão seus objetivos? Atualize o estado de cada um, de 1 (inativo) a 5 (consistente).</p>' : ''}
      <div class="field"><span>Objetivos</span><ul class="subs" data-goals>${goalsHtml()}</ul>
        <div class="sub-add"><input data-gnew placeholder="Novo objetivo" autocomplete="off" aria-label="Novo objetivo"><button type="button" class="btn small" data-gadd>${icon('plus')}Adicionar</button></div></div>
      <label class="field"><span>Quero desenvolver (separe por vírgulas)</span><input name="develop" value="${esc((v.develop || []).join(', '))}" placeholder="Paciência, disciplina, criatividade"></label>
      <label class="field"><span>Quero deixar para trás</span><input name="abandon" value="${esc((v.abandon || []).join(', '))}" placeholder="Procrastinar, reclamar"></label>
      <div class="sheet-actions"><span></span><button class="btn primary">Salvar</button></div></form>`,
    onMount(el, close) {
      const ul = el.querySelector('[data-goals]');
      const redraw = () => {
        ul.innerHTML = goalsHtml();
        ul.querySelectorAll('[data-gt]').forEach((x) => (x.oninput = () => (goals[+x.dataset.gt].title = x.value)));
        ul.querySelectorAll('[data-gdel]').forEach((x) => (x.onclick = () => (goals.splice(+x.dataset.gdel, 1), redraw())));
        ul.querySelectorAll('[data-gs]').forEach(
          (x) =>
            (x.onclick = () => {
              const [i, st] = x.dataset.gs.split(':').map(Number);
              goals[i].state = st;
              haptic('tick');
              redraw();
            }),
        );
      };
      redraw();
      const input = el.querySelector('[data-gnew]');
      const add = () => {
        if (!input.value.trim()) return;
        goals.push({ id: uid(8), title: input.value.trim(), state: 1 });
        input.value = '';
        redraw();
        input.focus();
      };
      el.querySelector('[data-gadd]').onclick = add;
      input.onkeydown = (e) => e.key === 'Enter' && (e.preventDefault(), add());
      el.querySelector('[data-f]').onsubmit = async (e) => {
        e.preventDefault();
        if (input.value.trim()) add();
        const r = readForm(e.target);
        const split = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
        const d = today();
        const cps = review || !nextCheckpoint(v, d) ? newCheckpoints(d) : v.checkpoints;
        await personal.save('vision', { develop: split(r.develop), abandon: split(r.abandon), goals: goals.filter((g) => g.title.trim()), checkpoints: cps }, 'vision');
        close();
        toast(review ? 'Revisão feita. A próxima é daqui a 10 dias.' : 'Visão salva.');
      };
    },
  });
}

/* ---------- Reflexões ---------- */
function reflections(S) {
  const list = [...S.refl].sort((a, b) => (b._ca || 0) - (a._ca || 0));
  return `<section class="block"><div class="block-head"><h2>Reflexões<span class="count">${list.length || ''}</span></h2><button type="button" class="btn small" data-refl-new>${icon('plus')}Nova</button></div>
    ${
      list.length
        ? `<div class="refls">${list.map((r) => `<button type="button" class="refl" data-refl="${esc(r.id)}" style="--c:${esc(colorOf(r.color))}"><b>${esc(r.title)}</b><small>${plural((r.cards || []).length, 'cartão', 'cartões')}</small><p>${esc((r.cards || [])[0] || '')}</p></button>`).join('')}</div>`
        : '<p class="hint pad">Guarde aprendizados em cartões curtos: frases para reler quando precisar. Ex.: "O que aprendi este mês".</p>'
    }</section>`;
}
// Cores do Lida anterior vinham por nome.
const NAMED = { blue: '#59C3F0', emerald: '#5FE3B5', amber: '#F2C14E', rose: '#F2716B', purple: '#C08CF5', cyan: '#59C3F0', indigo: '#7C8CFF', zinc: '#8FA3B8' };
const colorOf = (c) => NAMED[c] || c || COLORS[0];

// Reflexão em tela cheia: um cartão por vez (arraste, setas ou teclado), com a cor da reflexão.
function viewRefl(id) {
  const r = P().byId.get(id);
  if (!r) return;
  const cards = r.cards || [];
  const ov = document.createElement('div');
  ov.className = 'refl-full';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', r.title);
  ov.style.setProperty('--c', colorOf(r.color));
  ov.innerHTML = `<header class="rf-head"><h2>${esc(r.title)}</h2><button type="button" class="icon-btn" data-x aria-label="Fechar">${icon('x')}</button></header>
    <ol class="rf-track">${cards.map((c, i) => `<li><div class="rf-card"><small>${i + 1} de ${cards.length}</small><p>${esc(c)}</p></div></li>`).join('')}</ol>
    <footer class="rf-foot">
      <button type="button" class="icon-btn" data-prev aria-label="Anterior">${icon('left')}</button>
      <div class="rf-dots" aria-hidden="true">${cards.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>
      <button type="button" class="icon-btn" data-next aria-label="Próximo">${icon('right')}</button>
    </footer>
    <div class="rf-actions"><button type="button" class="btn ghost danger-text" data-del>${icon('trash')}Excluir</button><button type="button" class="btn" data-edit>${icon('edit')}Editar</button></div>`;
  document.body.appendChild(ov);
  document.body.classList.add('has-sheet');
  requestAnimationFrame(() => ov.classList.add('open'));
  const track = ov.querySelector('.rf-track');
  const dots = [...ov.querySelectorAll('.rf-dots i')];
  const at = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
  const go = (i) => track.scrollTo({ left: Math.max(0, Math.min(cards.length - 1, i)) * track.clientWidth, behavior: 'smooth' });
  track.addEventListener('scroll', () => dots.forEach((d, i) => d.classList.toggle('on', i === at())), { passive: true });
  const close = () => {
    document.removeEventListener('keydown', onKey, true);
    ov.classList.remove('open');
    setTimeout(() => {
      ov.remove();
      if (!document.querySelector('.sheet-wrap')) document.body.classList.remove('has-sheet');
    }, 220);
  };
  const onKey = (e) => {
    if (document.querySelector('.sheet-wrap')) return;
    if (e.key === 'Escape') (e.preventDefault(), e.stopPropagation(), close());
    else if (e.key === 'ArrowRight') go(at() + 1);
    else if (e.key === 'ArrowLeft') go(at() - 1);
  };
  document.addEventListener('keydown', onKey, true);
  ov.querySelector('[data-x]').onclick = close;
  ov.querySelector('[data-prev]').onclick = () => go(at() - 1);
  ov.querySelector('[data-next]').onclick = () => go(at() + 1);
  ov.querySelector('[data-edit]').onclick = () => {
    close();
    setTimeout(() => editRefl(r), 240);
  };
  ov.querySelector('[data-del]').onclick = async () => {
    if (!(await confirmDialog(`Excluir "${r.title}"?`, { ok: 'Excluir', danger: true, title: 'Excluir reflexão' }))) return;
    close();
    await personal.remove(r.id);
  };
  setTimeout(() => ov.querySelector('[data-x]').focus({ preventScroll: true }), 50);
}

function editRefl(r = null) {
  sheet({
    title: r ? 'Editar reflexão' : 'Nova reflexão',
    wide: true,
    body: `<form class="form" data-f>
      <label class="field"><span>Título</span><input name="title" value="${esc(r?.title || '')}" required autocomplete="off" placeholder="Ex.: O que aprendi este mês" ${r ? '' : 'autofocus'}></label>
      <label class="field"><span>Cartões (um por linha)</span><textarea name="cards" rows="6" required placeholder="Feito é melhor que perfeito.&#10;Descansar também é produtivo.">${esc((r?.cards || []).join('\n'))}</textarea></label>
      <div class="field"><span>Cor</span>${colorPicker('color', colorOf(r?.color))}</div>
      <div class="sheet-actions"><span></span><button class="btn primary">Salvar</button></div></form>`,
    onMount(el, close) {
      el.querySelector('[data-f]').onsubmit = async (e) => {
        e.preventDefault();
        const v = readForm(e.target);
        const cards = v.cards.split('\n').map((x) => x.trim()).filter(Boolean);
        if (!cards.length) return toast('Escreva pelo menos um cartão.');
        await personal.save('refl', { title: v.title.trim(), cards, color: v.color }, r?.id);
        close();
      };
    },
  });
}

function bind(el) {
  el.querySelectorAll('[data-range]').forEach(
    (b) =>
      (b.onclick = () => {
        meView.range = Number(b.dataset.range);
        haptic('tick');
        meView.render(el);
      }),
  );
  el.querySelector('[data-sum-day]')?.addEventListener('click', () => showDaySummary(addDays(today(), -1)));
  el.querySelector('[data-sum-today]')?.addEventListener('click', () => showDaySummary(today()));
  el.querySelectorAll('[data-sum-month]').forEach((b) => (b.onclick = () => showMonthSummary(b.dataset.sumMonth)));
  el.querySelectorAll('[data-vision]').forEach((b) => (b.onclick = () => editVision(false)));
  el.querySelector('[data-review]')?.addEventListener('click', () => editVision(true));
  el.querySelector('[data-refl-new]').onclick = () => editRefl(null);
  el.querySelectorAll('[data-refl]').forEach((b) => (b.onclick = () => viewRefl(b.dataset.refl)));
}

/* ---------- Humor do dia (usado em Hoje) ---------- */
export function moodPicker(S, d) {
  const cur = S.moodByDate.get(d);
  const m = MOOD[cur];
  return `<section class="mood-pick${cur ? ' set' : ''}" aria-label="Humor de hoje"><span class="mood-q">${m ? `Hoje você está: <b>${m.name.toLowerCase()}</b>` : 'Como você está hoje?'}</span>
    <div class="moods" role="radiogroup" aria-label="Humor">${MOODS.map((x) => `<button type="button" role="radio" aria-checked="${cur === x.id}" class="mood mo-${x.id}${cur === x.id ? ' on' : ''}" data-mood="${x.id}" title="${x.name}" aria-label="${x.name}">${face(x.id, 30)}</button>`).join('')}</div></section>`;
}
export function bindMood(el) {
  el.querySelectorAll('[data-mood]').forEach(
    (b) =>
      (b.onclick = async () => {
        const d = today();
        haptic('tick');
        await personal.save('mood', { date: d, mood: b.dataset.mood }, `md_${d}`);
      }),
  );
}
