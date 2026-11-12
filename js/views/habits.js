// Tela de Hábitos: o dia em um olhar, água, hábitos com sequência, rotinas e desapego.
// Tom: leve e incentivador. Nada de vermelho por dia perdido; o foco é no que já foi feito.
import { alarmFields, readAlarm } from './alarm.js';
import { P, personal, app } from '../state.js';
import { HABIT_DAYS_ALL } from '../core/model.js';
import * as H from '../core/habits.js';
import { esc, fmtInt, plural, WD_LETTER, WD_SHORT, LOC } from '../lib/util.js';
import { today } from '../lib/clock.js';
import { icon, sheet, toast, confirmDialog, ring, empty, COLORS, colorPicker, readForm } from '../ui/ui.js';
import { popover } from '../ui/pickers.js';
import { play } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';
import { celebrate } from './celebrate.js';

const EMOJI = ['📚', '🏃', '🧘', '💪', '🥗', '😴', '💊', '✍️', '🎸', '🧹', '🌱', '🙏', '🚶', '🦷', '☀️', '🎯'];
const SUGGEST = [
  { title: 'Ler', goal: 10, unit: 'páginas', icon: '📚' },
  { title: 'Caminhar', goal: 1, icon: '🚶' },
  { title: 'Meditar', goal: 1, icon: '🧘' },
  { title: 'Alongar', goal: 1, icon: '💪' },
  { title: 'Dormir antes das 23h', goal: 1, icon: '😴' },
];

function heroLine(done, total) {
  if (!total) return 'Hábitos pequenos, todos os dias, viram grandes mudanças.';
  if (done >= total) return 'Dia completo. Você cumpriu tudo o que se propôs.';
  if (done === 0) return 'Um passo de cada vez. Comece pelo mais fácil.';
  if (total - done === 1) return 'Falta só um. Você está quase lá.';
  return 'Bom ritmo. Continue de onde parou.';
}

export const habitsView = {
  title: 'Hábitos',
  sub: () => '',
  render(el) {
    const S = P();
    const d = today();
    const list = S.habit.filter((h) => !h.archived);
    const todays = list.filter((h) => H.isScheduled(h, d));
    const doneN = todays.filter((h) => H.isDone(S, h, d)).length;
    const best = Math.max(0, ...list.map((h) => H.streak(S, h, d)));
    const wg = H.waterGoal(S);
    const wt = H.waterToday(S, d);
    el.innerHTML = `
      <section class="hab-hero" style="--i:0">
        <div class="hero-ring">${ring(todays.length ? doneN / todays.length : 0, { size: 76, stroke: 7, label: `${doneN} de ${todays.length} hábitos hoje` })}${todays.length ? `<span aria-hidden="true"><b>${doneN}<small>/${todays.length}</small></b></span>` : ''}</div>
        <div class="grow"><b>${todays.length ? `${doneN} de ${plural(todays.length, 'hábito', 'hábitos')} hoje` : 'Seus hábitos'}</b><p>${heroLine(doneN, todays.length)}</p>
        ${best >= 2 ? `<span class="streak-chip">${icon('flame')}Melhor sequência ativa: ${plural(best, 'dia', 'dias')}</span>` : ''}</div>
      </section>

      ${waterCard(wt, wg, S)}

      <section class="block" style="--i:2"><div class="block-head"><h2>Hábitos<span class="count">${list.length || ''}</span></h2><button type="button" class="btn small" data-hnew>${icon('plus')}Novo hábito</button></div>
        ${
          list.length
            ? `<div class="habits">${list.map((h, i) => habitCard(S, h, d, i)).join('')}</div>`
            : `${empty({ ic: 'habit', title: 'Comece com um hábito pequeno', text: 'O segredo é ser fácil o bastante para fazer até num dia ruim. Algumas ideias:' })}
               <div class="chips center">${SUGGEST.map((s, i) => `<button type="button" class="chip" data-suggest="${i}">${s.icon} ${esc(s.title)}</button>`).join('')}</div>`
        }
        ${S.money.items.dayOff > 0 && todays.length && doneN < todays.length ? `<button type="button" class="btn ghost small dayoff" data-dayoff>${icon('coffee')}Usar Folga dos hábitos hoje (${S.money.items.dayOff})</button>` : ''}
      </section>

      <section class="block" style="--i:3"><div class="block-head"><h2>Rotinas<span class="count">${S.routine.length || ''}</span></h2>${S.routine.length < H.MAX_ROUTINES ? `<button type="button" class="btn small" data-routine>${icon('plus')}Nova rotina</button>` : ''}</div>
        ${
          S.routine.length
            ? `<ul class="routines">${S.routine.map(routineRow).join('')}</ul>`
            : `<p class="hint pad">Uma rotina é uma lista curta (ex.: "Manhã": água, alongar, planejar o dia) que aparece em Hoje nos dias escolhidos. Rende mais XP quanto mais itens tiver.</p>`
        }
      </section>

      <section class="block" style="--i:4"><div class="block-head"><h2>Desapego<span class="count">${S.quit.length ? `${S.quit.length}/${H.quitSlots(S)}` : ''}</span></h2>${S.quit.length < H.quitSlots(S) ? `<button type="button" class="btn small" data-quit>${icon('plus')}Largar um hábito</button>` : ''}</div>
        ${S.quit.length ? `<div class="quits">${S.quit.map((q) => quitCard(q, d)).join('')}</div>` : `<p class="hint pad">Para o que você quer deixar de fazer. Cada dia sem recair rende um check-in, e as recompensas crescem ao longo da semana.</p>`}
      </section>`;
    bind(el);
  },
};

/* ---------- Água ---------- */
const GLASS = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12l-1.6 15.2a1.5 1.5 0 0 1-1.5 1.3H9.1a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M6.8 10.5c2.5-1 5.5 1 10.4 0" /></svg>';
const BOTTLE = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2.5h4v2.5l1.5 2.2a3 3 0 0 1 .5 1.7V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8.9a3 3 0 0 1 .5-1.7L10 5z"/><path d="M8 12.5h8"/></svg>';
function waterCard(total, goal, S) {
  const f = Math.min(1, total / goal);
  const left = Math.max(0, goal - total);
  const glass = H.waterGlass(S);
  const bottle = H.waterBottle(S);
  const L = (ml) => (ml >= 1000 ? `${(ml / 1000).toLocaleString(LOC, { maximumFractionDigits: 2 })} L` : `${ml} ml`);
  const streak = H.waterStreak(S);
  const wk = H.waterWeek(S);
  const hits = wk.filter((w) => w.st === 'done').length;
  return `<section class="water card${f >= 1 ? ' full' : ''}" style="--i:1;--f:${f}">
    <div class="drop" aria-hidden="true"><svg viewBox="0 0 64 80"><defs><clipPath id="dropclip"><path d="M32 4C32 4 8 32 8 50a24 24 0 0 0 48 0C56 32 32 4 32 4z"/></clipPath></defs>
      <path class="drop-bg" d="M32 4C32 4 8 32 8 50a24 24 0 0 0 48 0C56 32 32 4 32 4z"/>
      <g clip-path="url(#dropclip)"><g class="drop-fill" style="transform:translateY(${(1 - f) * 76}px)"><path class="wave" d="M-64 6 Q-48 0 -32 6 T0 6 T32 6 T64 6 T96 6 V90 H-64Z"/></g></g></svg></div>
    <div class="water-top">${streak ? `<span class="streak${streak >= 3 ? ' hot' : ''}" title="Dias seguidos batendo a meta">${icon('flame')}${streak}</span>` : ''}<button type="button" class="icon-btn" data-water-set aria-label="Ajustar meta de água">${icon('settings')}</button></div>
    <div class="grow">
      <div class="water-n"><b>${L(total)}</b><span>de ${L(goal)}</span></div>
      <small>${f >= 1 ? 'Meta de hoje batida. Ótimo!' : `Faltam ${L(left)} · ao bater a meta, +20 XP`}</small>
      <div class="water-btns">
        <button type="button" class="btn small water-btn" data-water="${glass}" aria-label="Copo, ${glass} ml">${GLASS}<span>Copo<small>${L(glass)}</small></span></button>
        <button type="button" class="btn small water-btn" data-water="${bottle}" aria-label="Garrafa, ${bottle} ml">${BOTTLE}<span>Garrafa<small>${L(bottle)}</small></span></button>
        ${total ? `<button type="button" class="icon-btn" data-water-undo aria-label="Desfazer o último">${icon('back')}</button>` : ''}
      </div>
      <div class="water-week"><ol class="hab-week" aria-label="Meta de água nos últimos 7 dias">${wk.map((w) => `<li class="${w.st}" title="${esc(w.date)} · ${L(w.ml)}"><i></i><span>${WD_LETTER[new Date(`${w.date}T12:00`).getDay()]}</span></li>`).join('')}</ol><small>${hits} de 7 dias na meta</small></div>
    </div>
  </section>`;
}

/* ---------- Cartão de hábito ---------- */
function habitCard(S, h, d, i) {
  const goal = h.goal || 1;
  const log = H.logOf(S, h, d);
  const count = log?.count || 0;
  const scheduled = H.isScheduled(h, d);
  const done = H.isDone(S, h, d);
  const st = H.streak(S, h, d);
  const color = h.color || COLORS[i % COLORS.length];
  const frac = Math.min(1, count / goal);
  const R = 24;
  const C = 2 * Math.PI * R;
  const wk = H.week(S, h, d);
  const sub = log?.mod
    ? log.mod === 'freeze'
      ? 'Protegido hoje com Congelamento'
      : log.mod === 'autoFreeze'
        ? 'Salvo pelo Congelamento Automático'
        : 'Folga hoje'
    : !scheduled
      ? done
        ? 'Feito na folga · extra'
        : 'Folga hoje · se quiser, conta como extra'
      : goal > 1
        ? `${count} de ${goal}${h.unit ? ` ${esc(h.unit)}` : ''}`
        : done
          ? 'Feito hoje'
          : st
            ? 'Mantenha a sequência'
            : 'Comece hoje';
  return `<article class="habit${done ? ' done' : ''}${scheduled ? '' : ' rest'}" data-h="${esc(h.id)}" style="--c:${esc(color)};--i:${i}">
    <button type="button" class="hab-tap" data-tap aria-label="${esc(h.title)}: ${done ? 'feito, toque para desfazer' : goal > 1 ? `marcar ${count + 1} de ${goal}` : 'marcar como feito'}">
      <svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="${R}" class="hab-track"/><circle cx="28" cy="28" r="${R}" class="hab-arc" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}" transform="rotate(-90 28 28)"/></svg>
      <span class="hab-face">${done ? icon('check') : h.icon ? `<span class="emoji">${esc(h.icon)}</span>` : goal > 1 ? `<b>${count}</b>` : `<b>${esc((h.title || '?').trim()[0].toUpperCase())}</b>`}</span>
    </button>
    <div class="hab-body" data-edit role="button" tabindex="0">
      <b translate="no">${esc(h.title)}</b>
      <small>${sub}</small>
      <ol class="hab-week" aria-label="Últimos 7 dias">${wk.map((w) => `<li class="${w.st}" title="${esc(w.date)}"><i></i><span>${WD_LETTER[new Date(`${w.date}T12:00`).getDay()]}</span></li>`).join('')}</ol>
    </div>
    <div class="hab-side">${st ? `<span class="streak${st >= 3 ? ' hot' : ''}" title="Sequência atual">${icon('flame')}${st}</span>` : ''}<button type="button" class="icon-btn" data-more aria-label="Mais opções para ${esc(h.title)}">${icon('more')}</button></div>
  </article>`;
}

/* ---------- Rotinas ---------- */
const wdText = (days) => {
  const d = [...(days || HABIT_DAYS_ALL)].sort();
  if (d.length === 7) return 'Todos os dias';
  if (d.join() === '1,2,3,4,5') return 'Dias úteis';
  if (d.join() === '0,6') return 'Fins de semana';
  return d.map((x) => WD_SHORT[x]).join(', ');
};
const routineRow = (r) => `<li><button type="button" class="routine-row" data-r="${esc(r.id)}" style="--c:${esc(r.color || 'var(--accent)')}">
  <span class="r-ic">${icon('repeat')}</span><span class="grow"><b translate="no">${esc(r.title)}</b><small>${wdText(r.weekdays)} · ${plural((r.items || []).length, 'item', 'itens')}</small></span>${icon('right', 'sm')}</button></li>`;

/* ---------- Desapego ---------- */
function quitCard(q, d) {
  const days = H.daysClean(q, d);
  const doneToday = (q.checkins || []).includes(d);
  const next = H.nextQuitReward(q);
  const cyc = q.rewardCycle || 0;
  return `<article class="quit card" data-q="${esc(q.id)}">
    <div class="quit-days"><b>${days}</b><small>${days === 1 ? 'dia livre' : 'dias livre'}</small></div>
    <div class="grow"><b translate="no">${esc(q.title)}</b>
      <ol class="cycle" aria-label="Ciclo de check-ins: ${cyc} de 7">${[1, 2, 3, 4, 5, 6, 7].map((n) => `<li class="${n <= cyc ? 'on' : ''}${n === 7 ? ' big' : ''}"></li>`).join('')}</ol>
      <small>${doneToday ? 'Check-in de hoje feito. Até amanhã!' : `Hoje: +${next.xp} XP, +${next.gold} de ouro${next.card ? ' e uma Carta da Sorte' : ''}`}</small>
      <button type="button" class="btn small ${doneToday ? 'ghost' : 'primary'} quit-btn" data-checkin${doneToday ? ' disabled' : ''}>${doneToday ? icon('check') + 'Feito hoje' : 'Fazer check-in'}</button></div>
    <button type="button" class="icon-btn quit-more" data-qmore aria-label="Mais opções">${icon('more')}</button>
  </article>`;
}

/* ---------- Ações ---------- */
function bind(el) {
  el.querySelector('[data-hnew]').onclick = () => editHabit(null);
  el.querySelectorAll('[data-suggest]').forEach((b) => (b.onclick = () => editHabit(null, SUGGEST[+b.dataset.suggest])));
  el.querySelectorAll('.habit').forEach((card) => {
    const h = () => P().byId.get(card.dataset.h);
    card.querySelector('[data-tap]').onclick = () => onTap(card, h());
    const body = card.querySelector('[data-edit]');
    body.onclick = () => editHabit(h());
    body.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), editHabit(h()));
    card.querySelector('[data-more]').onclick = (e) => habitMenu(e.currentTarget, h());
  });
  el.querySelectorAll('[data-water]').forEach((b) => (b.onclick = () => onWater(+b.dataset.water)));
  el.querySelector('[data-water-undo]')?.addEventListener('click', async () => {
    const ml = await H.undoWater();
    if (ml) toast(`${ml} ml removidos.`);
  });
  el.querySelector('[data-water-set]').onclick = waterSettings;
  el.querySelector('[data-dayoff]')?.addEventListener('click', async () => {
    if (!(await confirmDialog('Todos os hábitos de hoje vão contar como feitos e nenhuma sequência se perde. Usar uma Folga dos hábitos?', { ok: 'Usar folga', title: 'Folga dos hábitos' }))) return;
    if (await H.dayOff()) {
      play('powerup');
      toast('Folga registrada. Descanse sem culpa.');
    }
  });
  el.querySelector('[data-routine]')?.addEventListener('click', () => editRoutine(null));
  el.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => editRoutine(b.dataset.r)));
  el.querySelector('[data-quit]')?.addEventListener('click', addQuitSheet);
  el.querySelectorAll('.quit').forEach((card) => {
    const q = () => P().byId.get(card.dataset.q);
    card.querySelector('[data-checkin]').onclick = () => onCheckin(card, q());
    card.querySelector('[data-qmore]').onclick = (e) => quitMenu(e.currentTarget, q());
  });
}

// Marcar um hábito atualiza só o cartão (o anel enche com animação). A tela é redesenhada
// depois de uma pausa sem toques, para marcar várias vezes seguidas sem nada piscar.
let holdT = 0;
function holdFor(ms) {
  app.hold = true;
  clearTimeout(holdT);
  holdT = setTimeout(() => {
    app.hold = false;
    app.refresh();
  }, ms);
}

function patchCard(card, h) {
  const S = P();
  const i = Number(getComputedStyle(card).getPropertyValue('--i')) || 0;
  const tmp = document.createElement('div');
  tmp.innerHTML = habitCard(S, h, today(), i);
  const next = tmp.firstElementChild;
  const arc = card.querySelector('.hab-arc');
  arc.setAttribute('stroke-dashoffset', next.querySelector('.hab-arc').getAttribute('stroke-dashoffset'));
  const wasDone = card.classList.contains('done');
  card.classList.toggle('done', next.classList.contains('done'));
  const face = card.querySelector('.hab-face');
  face.innerHTML = next.querySelector('.hab-face').innerHTML;
  face.classList.toggle('popping', !wasDone && next.classList.contains('done'));
  card.querySelector('.hab-body small').innerHTML = next.querySelector('.hab-body small').innerHTML;
  card.querySelector('.hab-week').innerHTML = next.querySelector('.hab-week').innerHTML;
  card.querySelector('.hab-side').innerHTML = next.querySelector('.hab-side').innerHTML;
  card.querySelector('[data-more]').onclick = (e) => habitMenu(e.currentTarget, P().byId.get(h.id));
}

async function onTap(card, h) {
  const btn = card.querySelector('[data-tap]');
  btn.classList.remove('bump');
  void btn.offsetWidth;
  btn.classList.add('bump');
  holdFor(1200);
  const off = !H.isScheduled(h, today()) && !(H.logOf(P(), h, today())?.count > 0);
  const r = await H.tap(h);
  patchCard(card, P().byId.get(h.id));
  if (off && !r.undone) toast('Hoje é folga deste hábito: conta como extra, sem cobrar nada se faltar.', { ms: 2600 });
  if (r.completed) {
    play('complete');
    haptic('done');
    const st = H.streak(P(), h);
    const line = H.cheer(st);
    const res = { levelUp: r.levelUp, cards: r.cards, vouchers: r.vouchers };
    celebrate(line || `${h.title}: feito!`, null, res);
  } else if (r.undone) {
    play('uncheck');
    haptic('tap');
  } else {
    play('progress', { fraction: r.fraction });
    haptic('tick');
  }
}

async function onWater(ml) {
  holdFor(1200);
  const r = await H.addWater(ml);
  const card = document.querySelector('.water');
  if (card) {
    const f = Math.min(1, r.total / r.goal);
    card.querySelector('.drop-fill').style.transform = `translateY(${(1 - f) * 76}px)`;
    card.classList.toggle('full', f >= 1);
    const b = card.querySelector('.water-n b');
    if (b) b.textContent = r.total >= 1000 ? `${(r.total / 1000).toLocaleString(LOC, { maximumFractionDigits: 2 })} L` : `${r.total} ml`;
  }
  play('water');
  haptic('tick');
  if (r.hit) {
    setTimeout(() => play('complete'), 200);
    if (r.streakPrize) celebrate(`Ofensiva de ${r.streakPrize.days} dias de água!`, { xp: 20 + r.streakPrize.xp, gold: 10 + r.streakPrize.gold }, r);
    else celebrate('Meta de água batida', { xp: 20, gold: 10 }, r);
  }
}

function waterSettings() {
  const S = P();
  sheet({
    title: 'Água',
    body: `<form class="form" data-f>
      <label class="field"><span>Meta diária (ml)</span><input type="number" name="goal" min="500" max="6000" step="100" value="${H.waterGoal(S)}" inputmode="numeric"></label>
      <div class="grid2">
        <label class="field"><span>Copo (ml)</span><input type="number" name="glass" min="50" max="1000" step="10" value="${H.waterGlass(S)}" inputmode="numeric"></label>
        <label class="field"><span>Garrafa (ml)</span><input type="number" name="bottle" min="100" max="3000" step="50" value="${H.waterBottle(S)}" inputmode="numeric"></label>
      </div>
      <p class="form-meta">Uma referência comum é 35 ml por quilo de peso por dia. Ajuste ao que fizer sentido para você.</p>
      <div class="sheet-actions"><span></span><button class="btn primary">Salvar</button></div></form>`,
    onMount(el, close) {
      el.querySelector('[data-f]').onsubmit = async (e) => {
        e.preventDefault();
        const v = readForm(e.target);
        const prev = personal.get('prefs');
        const base = prev ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== 'id' && !k.startsWith('_'))) : {};
        await personal.save('prefs', { ...base, waterGoal: Math.max(500, v.goal || 2000), waterGlass: Math.max(50, v.glass || 250), waterBottle: Math.max(100, v.bottle || 500) }, 'prefs');
        close();
      };
    },
  });
}

function habitMenu(anchor, h) {
  const S = P();
  const d = today();
  const freeze = S.money.items.freeze || 0;
  const log = H.logOf(S, h, d);
  popover(
    anchor,
    (body, close) => {
      body.innerHTML = `<div class="menu">
        <button type="button" class="pick-opt" data-a="edit"><span class="row">${icon('edit')}Editar</span></button>
        ${(log?.count || 0) > 0 && !H.isDone(S, h, d) ? `<button type="button" class="pick-opt" data-a="minus"><span class="row">${icon('minus')}Tirar um</span></button>` : ''}
        ${H.isScheduled(h, d) && !H.isDone(S, h, d) ? `<button type="button" class="pick-opt" data-a="freeze"${freeze ? '' : ' disabled'}><span class="row">${icon('snow')}Proteger com Congelamento</span><small>${freeze ? `${freeze} no inventário` : 'Na Loja'}</small></button>` : ''}
        <button type="button" class="pick-opt danger-text" data-a="del"><span class="row">${icon('trash')}Excluir hábito</span></button>
      </div>`;
      body.querySelectorAll('[data-a]').forEach(
        (b) =>
          (b.onclick = async () => {
            close(false);
            const a = b.dataset.a;
            if (a === 'edit') editHabit(h);
            if (a === 'minus') await H.setCount(h, Math.max(0, (log?.count || 0) - 1));
            if (a === 'freeze' && (await H.protect(h, 'freeze'))) {
              play('powerup');
              toast(`"${h.title}" protegido hoje. A sequência está a salvo.`);
            }
            if (a === 'del' && (await confirmDialog(`Excluir "${h.title}" e todo o histórico dele?`, { ok: 'Excluir', danger: true, title: 'Excluir hábito' }))) {
              await H.removeHabit(h);
              toast('Hábito excluído.');
            }
          }),
      );
    },
    { title: h.title, minWidth: 240 },
  );
}

const wdPicker = (name, days) =>
  `<div class="wdays" role="group" aria-label="Dias da semana">${[1, 2, 3, 4, 5, 6, 0]
    .map((d) => `<label><input type="checkbox" name="${name}" value="${d}"${(days || HABIT_DAYS_ALL).includes(d) ? ' checked' : ''}><span title="${WD_SHORT[d]}">${WD_LETTER[d]}</span></label>`)
    .join('')}</div>`;
const readDays = (form, name) => [...form.querySelectorAll(`input[name=${name}]:checked`)].map((x) => Number(x.value));

export function editHabit(h, preset = {}) {
  const v = h || { goal: 1, ...preset };
  sheet({
    title: h ? 'Editar hábito' : 'Novo hábito',
    wide: true,
    body: `<form class="form" data-f>
      <label class="field"><span>Nome</span><input name="title" value="${esc(v.title || '')}" required autocomplete="off" placeholder="Ex.: Ler, meditar, caminhar" ${h ? '' : 'autofocus'}></label>
      <div class="grid2">
        <label class="field"><span>Meta por dia</span><input type="number" name="goal" min="1" max="99" value="${v.goal || 1}" inputmode="numeric"></label>
        <label class="field"><span>Unidade (opcional)</span><input name="unit" value="${esc(v.unit || '')}" placeholder="vezes, páginas, copos"></label>
      </div>
      <div class="field"><span>Dias</span>${wdPicker('days', v.days)}</div>
      <div class="field"><span>Ícone</span>
        <div class="icon-in"><input name="icon" value="${esc(v.icon || '')}" maxlength="16" autocomplete="off" inputmode="text" placeholder="☺" aria-label="Ícone: qualquer emoji ou caractere"><small>Toque e escolha qualquer emoji do teclado, ou uma letra. Ou use uma sugestão:</small></div>
        <div class="emojis">${['', ...EMOJI].map((e) => `<button type="button" class="emoji-opt${(v.icon || '') === e ? ' on' : ''}" data-emoji="${e}" aria-label="${e || 'Sem ícone'}">${e || 'Aa'}</button>`).join('')}</div></div>
      <div class="field"><span>Cor</span>${colorPicker('color', v.color || COLORS[0])}</div>
      ${alarmFields({ tone: v.alarm || '', time: v.alarmTime || '', withTime: true })}
      <label class="field"><span>Por que este hábito? (opcional)</span><textarea name="notes" rows="2" placeholder="Um lembrete para os dias difíceis">${esc(v.notes || '')}</textarea></label>
      <p class="form-meta">Bater a meta do dia rende progresso de voucher: a cada 3, um voucher.</p>
      <div class="sheet-actions"><span></span><button class="btn primary">${h ? 'Salvar' : 'Criar hábito'}</button></div>
    </form>`,
    onMount(el, close) {
      const f = el.querySelector('[data-f]');
      // Ícone: fica só o primeiro "caractere visível" (um emoji pode ter vários códigos).
      const first = (str) => {
        const t = String(str || '').trim();
        if (!t) return '';
        try {
          return [...new Intl.Segmenter(LOC, { granularity: 'grapheme' }).segment(t)][0].segment;
        } catch {
          return [...t][0];
        }
      };
      const paintEmoji = () => el.querySelectorAll('[data-emoji]').forEach((b) => b.classList.toggle('on', b.dataset.emoji === f.icon.value));
      f.icon.addEventListener('input', () => {
        const g = first(f.icon.value.slice(-8));
        f.icon.value = /[\p{L}\p{N}]/u.test(g) ? g.toUpperCase() : g;
        paintEmoji();
      });
      el.querySelectorAll('[data-emoji]').forEach((b) => (b.onclick = () => ((f.icon.value = b.dataset.emoji), paintEmoji(), haptic('tick'))));
      f.onsubmit = async (e) => {
        e.preventDefault();
        const r = readForm(f);
        const days = readDays(f, 'days');
        if (!days.length) return toast('Escolha pelo menos um dia.');
        const base = h ? Object.fromEntries(Object.entries(h).filter(([k]) => k !== 'id' && !k.startsWith('_'))) : {};
        const tone = readAlarm(f, h);
        if (tone === null) return;
        if (tone && !r.alarmTime) return toast('Escolha o horário do alarme.');
        await H.saveHabit(h?.id, { ...base, title: r.title.trim(), goal: r.goal || 1, unit: r.unit.trim() || undefined, days: days.length === 7 ? undefined : days, icon: r.icon || undefined, color: r.color, notes: r.notes.trim() || undefined, alarm: tone || undefined, alarmTime: tone ? r.alarmTime : undefined });
        close();
        if (!h) {
          play('tick');
          toast('Hábito criado. Toque no círculo para marcar.');
        }
      };
    },
  });
}

export function editRoutine(id, { fromTask } = {}) {
  const S = P();
  const r = id ? S.byId.get(id) : null;
  if (id && !r) return toast(fromTask ? 'A rotina desta tarefa foi excluída.' : 'Rotina não encontrada.');
  let items = [...(r?.items || [])];
  const itemsHtml = () => items.map((t, i) => `<li class="subtask"><span>${esc(t)}</span><button type="button" class="icon-btn" data-del="${i}" aria-label="Remover ${esc(t)}">${icon('x', 'sm')}</button></li>`).join('');
  sheet({
    title: r ? 'Editar rotina' : 'Nova rotina',
    wide: true,
    body: `<form class="form" data-f>
      <label class="field"><span>Nome</span><input name="title" value="${esc(r?.title || '')}" required autocomplete="off" placeholder="Ex.: Manhã, Fim do expediente" ${r ? '' : 'autofocus'}></label>
      <div class="field"><span>Itens</span><ul class="subs" data-items>${itemsHtml()}</ul>
        <div class="sub-add"><input data-new placeholder="Adicionar item" autocomplete="off" aria-label="Novo item"><button type="button" class="btn small" data-add>${icon('plus')}Adicionar</button></div></div>
      <div class="field"><span>Dias</span>${wdPicker('days', r?.weekdays)}</div>
      <div class="field"><span>Cor</span>${colorPicker('color', r?.color || COLORS[1])}</div>
      ${alarmFields({ tone: r?.alarm || '', time: r?.time || '', withTime: true })}
      <p class="form-meta">A rotina aparece em Hoje nos dias escolhidos. Rende de 50 a 200 de XP e ouro, conforme o número de itens. Rotina não concluída não pune.</p>
      <div class="sheet-actions">${r ? `<button type="button" class="btn ghost danger-text" data-remove>${icon('trash')}Excluir</button>` : '<span></span>'}<button class="btn primary">${r ? 'Salvar' : 'Criar rotina'}</button></div>
    </form>`,
    onMount(el, close) {
      const f = el.querySelector('[data-f]');
      const ul = el.querySelector('[data-items]');
      const input = el.querySelector('[data-new]');
      const redraw = () => {
        ul.innerHTML = itemsHtml();
        ul.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => (items.splice(+b.dataset.del, 1), redraw())));
      };
      redraw();
      const add = () => {
        const v = input.value.trim();
        if (!v) return;
        items.push(v);
        input.value = '';
        redraw();
        input.focus();
      };
      el.querySelector('[data-add]').onclick = add;
      input.onkeydown = (e) => e.key === 'Enter' && (e.preventDefault(), add());
      el.querySelector('[data-remove]')?.addEventListener('click', async () => {
        if (!(await confirmDialog(`Excluir a rotina "${r.title}"?`, { ok: 'Excluir', danger: true, title: 'Excluir rotina' }))) return;
        close();
        await H.removeRoutine(r);
      });
      f.onsubmit = async (e) => {
        e.preventDefault();
        if (input.value.trim()) add();
        if (!items.length) return toast('Adicione pelo menos um item.');
        const days = readDays(f, 'days');
        if (!days.length) return toast('Escolha pelo menos um dia.');
        const tone = readAlarm(f, r);
        if (tone === null) return;
        if (tone && !f.alarmTime.value) return toast('Escolha o horário do alarme.');
        await H.saveRoutine(r?.id, { title: f.title.value.trim(), items, weekdays: days, color: readForm(f).color, alarm: tone || undefined, time: f.alarmTime.value || undefined });
        close();
        toast(r ? 'Rotina salva.' : 'Rotina criada. Ela aparece em Hoje nos dias escolhidos.');
      };
    },
  });
}

function addQuitSheet() {
  sheet({
    title: 'Largar um hábito',
    body: `<form class="form" data-f>
      <label class="field"><span>O que você quer deixar de fazer?</span><input name="title" required autocomplete="off" placeholder="Ex.: Refrigerante, rede social antes de dormir" autofocus></label>
      <p class="form-meta">Faça um check-in por dia sem recair. As recompensas crescem a cada dia do ciclo de 7, e o 7º dia traz uma Carta da Sorte. Se recair, o contador volta ao dia 1 e você perde metade do XP do nível atual e do ouro.</p>
      <div class="sheet-actions"><span></span><button class="btn primary">Começar hoje</button></div></form>`,
    onMount(el, close) {
      el.querySelector('[data-f]').onsubmit = async (e) => {
        e.preventDefault();
        await H.addQuit(e.target.title.value.trim());
        close();
        toast('Dia 1. Você consegue.');
      };
    },
  });
}

async function onCheckin(card, q) {
  const r = await H.checkinQuit(q);
  if (!r) return;
  play(r.card ? 'levelup' : 'complete');
  haptic('done');
  celebrate(r.card ? 'Semana completa! +1 Carta da Sorte' : `Check-in do dia ${r.n}`, { xp: r.xp, gold: r.gold }, r);
}

function quitMenu(anchor, q) {
  popover(
    anchor,
    (body, close) => {
      body.innerHTML = `<div class="menu">
        <button type="button" class="pick-opt" data-a="relapse"><span class="row">${icon('refresh')}Tive uma recaída</span></button>
        <button type="button" class="pick-opt danger-text" data-a="del"><span class="row">${icon('trash')}Excluir</span></button></div>`;
      body.querySelectorAll('[data-a]').forEach(
        (b) =>
          (b.onclick = async () => {
            close(false);
            if (b.dataset.a === 'relapse') {
              if (!(await confirmDialog('Recaídas fazem parte do caminho. O contador volta ao dia 1 e você perde metade do XP do nível atual e do ouro. Registrar?', { ok: 'Registrar recaída', danger: true, title: 'Recaída' }))) return;
              const loss = await H.relapseQuit(q);
              play('penalty');
              haptic('bad');
              toast(`Recomeço registrado (${fmtInt(loss.xp)} XP, ${fmtInt(loss.gold)} de ouro). Amanhã é o dia 1 de novo, e tudo bem.`, { ms: 5000 });
            } else {
              if (!(await confirmDialog(`Excluir "${q.title}"? Para não virar atalho, excluir tem o mesmo custo de uma recaída.`, { ok: 'Excluir', danger: true, title: 'Excluir' }))) return;
              await H.removeQuit(q);
              toast('Excluído.');
            }
          }),
      );
    },
    { title: q.title, minWidth: 220 },
  );
}

