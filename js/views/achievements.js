// Conquistas na aba Eu: o resumo (quantas, quanto ouro esperando), a lista completa por grupo, o
// resgate do ouro (à mão) e a revelação com suspense quando uma conquista é desbloqueada.
// Textos em português, inglês e espanhol (core/i18n.js).
import { P, personal } from '../state.js';
import { esc } from '../lib/util.js';
import { icon, sheet, toast } from '../ui/ui.js';
import { play } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';
import { ACHIEVEMENTS, CATS, TIER_NAME, achList, achName, achDesc, achById, achStats, checkAchievements, claimAchievement, toClaim } from '../core/achievements.js';
import { tr, fill, num } from '../core/i18n.js';

const L = (pt, en, es) => ({ pt, en, es });
const T = {
  title: L('Conquistas', 'Achievements', 'Logros'),
  of: L('{a} de {b}', '{a} of {b}', '{a} de {b}'),
  all: L('Ver todas', 'See all', 'Ver todas'),
  claimAll: L('Resgatar {g} de ouro', 'Claim {g} gold', 'Reclamar {g} de oro'),
  waiting: L('{n} esperando resgate', '{n} waiting to be claimed', '{n} esperando reclamo'),
  claim: L('Resgatar', 'Claim', 'Reclamar'),
  claimed: L('Resgatada', 'Claimed', 'Reclamado'),
  gold: L('{g} de ouro', '{g} gold', '{g} de oro'),
  locked: L('Bloqueada', 'Locked', 'Bloqueado'),
  unlocked: L('Conquista desbloqueada!', 'Achievement unlocked!', '¡Logro desbloqueado!'),
  suspense: L('Algo aconteceu…', 'Something happened…', 'Algo pasó…'),
  later: L('Depois', 'Later', 'Después'),
  got: L('+{g} de ouro', '+{g} gold', '+{g} de oro'),
  retroTitle: L('Você já tinha conquistas!', 'You already had achievements!', '¡Ya tenías logros!'),
  retroText: L('Pelo que você já fez no Lida, {n} conquistas foram desbloqueadas. O ouro está esperando por você.', 'Based on what you have already done in Lida, {n} achievements were unlocked. The gold is waiting for you.', 'Por lo que ya hiciste en Lida, se desbloquearon {n} logros. El oro te está esperando.'),
  next: L('Mais perto', 'Closest', 'Más cerca'),
  none: L('Conclua tarefas, cumpra hábitos e beba água: as conquistas aparecem aqui.', 'Complete tasks, keep habits and drink water: achievements show up here.', 'Completa tareas, cumple hábitos y bebe agua: los logros aparecen aquí.'),
};

/* ---------- Medalha ---------- */
export function medal(a, { size = 48, locked = false } = {}) {
  return `<span class="ach-medal t${a.tier}${locked ? ' locked' : ''}" style="--s:${size}px" aria-hidden="true"><i>${icon(locked ? 'lock' : a.icon)}</i></span>`;
}

/* ---------- Bloco na aba Eu ---------- */
export function achSection(S = P()) {
  const list = achList(S);
  const got = list.filter((a) => a.unlocked);
  const pend = list.filter((a) => a.unlocked && !a.claimed);
  const gold = pend.reduce((s, a) => s + a.gold, 0);
  const recent = got.sort((a, b) => b.at - a.at).slice(0, 5);
  const close = list.filter((a) => !a.unlocked).sort((a, b) => b.value / b.goal - a.value / a.goal).slice(0, Math.max(2, 6 - recent.length));
  return `<section class="block ach-block"><div class="block-head"><h2>${esc(tr(T.title))}<span class="count">${esc(fill(tr(T.of), { a: got.length, b: ACHIEVEMENTS.length }))}</span></h2><button type="button" class="link" data-ach-all>${esc(tr(T.all))}</button></div>
    <button type="button" class="ach-card" data-ach-all>
      <div class="ach-strip">${recent.map((a) => `<span class="ach-mini" title="${esc(achName(a))}">${medal(a, { size: 44 })}</span>`).join('')}${close
        .map((a) => `<span class="ach-mini dim" title="${esc(achName(a))}">${medal(a, { size: 44, locked: true })}<i class="ach-ring" style="--p:${Math.round((a.value / a.goal) * 100)}"></i></span>`)
        .join('')}</div>
      <div class="bar"><i style="width:${Math.round((got.length / ACHIEVEMENTS.length) * 100)}%"></i></div>
      ${pend.length ? `<span class="ach-pend">${icon('coin')}${esc(fill(tr(T.waiting), { n: pend.length }))} · <b>${esc(fill(tr(T.gold), { g: num(gold) }))}</b></span>` : !got.length ? `<span class="ach-pend muted">${esc(tr(T.none))}</span>` : ''}
    </button></section>`;
}
export function bindAchSection(el) {
  el.querySelectorAll('[data-ach-all]').forEach((b) => (b.onclick = () => (haptic('tick'), openAchievements())));
}

/* ---------- Lista completa ---------- */
function row(a) {
  const pct = Math.round((a.value / a.goal) * 100);
  return `<li class="ach-row${a.unlocked ? ' got' : ''}" data-aid="${a.id}">
    ${medal(a, { size: 46, locked: !a.unlocked })}
    <div class="ach-txt"><b>${esc(achName(a))}</b><p>${esc(achDesc(a))}</p>
      ${a.unlocked ? '' : `<div class="ach-prog"><div class="bar"><i style="width:${pct}%"></i></div><small>${num(a.value)} / ${num(a.goal)}</small></div>`}
      <small class="ach-tier t${a.tier}">${esc(tr(TIER_NAME[a.tier]))} · ${esc(fill(tr(T.gold), { g: num(a.gold) }))}</small></div>
    ${a.unlocked ? (a.claimed ? `<span class="ach-done">${icon('check', 'sm')}${esc(tr(T.claimed))}</span>` : `<button type="button" class="btn small primary" data-claim="${a.id}">${icon('coin')}${esc(tr(T.claim))}</button>`) : ''}
  </li>`;
}

export function openAchievements() {
  let off = () => {};
  sheet({
    title: tr(T.title),
    wide: true,
    body: '<div class="ach-sheet" data-achbody></div>',
    onMount(el) {
      const body = el.querySelector('[data-achbody]');
      const draw = () => {
        if (!body.isConnected) return;
        const S = P();
        const list = achList(S, achStats(S));
        const pend = list.filter((a) => a.unlocked && !a.claimed);
        const gold = pend.reduce((s, a) => s + a.gold, 0);
        body.innerHTML = `${pend.length > 1 ? `<button type="button" class="btn primary wide" data-claimall>${icon('coin')}${esc(fill(tr(T.claimAll), { g: num(gold) }))}</button>` : ''}
          ${Object.entries(CATS)
            .map(([k, c]) => {
              const items = list.filter((a) => a.cat === k).sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || a.tier - b.tier || a.goal - b.goal);
              const n = items.filter((a) => a.unlocked).length;
              return `<section class="ach-cat"><h3>${icon(c.icon, 'sm')}${esc(tr(c.name))}<span>${n}/${items.length}</span></h3><ul>${items.map(row).join('')}</ul></section>`;
            })
            .join('')}`;
        body.querySelectorAll('[data-claim]').forEach((b) => (b.onclick = () => claim([b.dataset.claim], b)));
        body.querySelector('[data-claimall]')?.addEventListener('click', (e) => claim(pend.map((a) => a.id), e.currentTarget));
      };
      off = personal.subscribe(() => setTimeout(draw, 50));
      draw();
    },
    onClose: () => off(),
  });
}

async function claim(ids, btn) {
  if (btn) btn.disabled = true;
  let gold = 0;
  for (const id of ids) {
    const r = await claimAchievement(id);
    if (r) gold += r.gold;
  }
  if (!gold) return;
  play('coin');
  haptic('done');
  toast(fill(tr(T.got), { g: num(gold) }));
}

/* ---------- Revelação com suspense ---------- */
const queue = [];
let showing = false;
export function revealAchievements(list) {
  queue.push(...list);
  if (!showing) next();
}
function next() {
  const a = queue.shift();
  if (!a) {
    showing = false;
    return;
  }
  showing = true;
  reveal(a).then(() => setTimeout(next, 250));
}

export function reveal(a) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'ach-wrap';
    const rays = Array.from({ length: 12 }, (_, i) => `<i style="--r:${i * 30}deg"></i>`).join('');
    wrap.innerHTML = `<div class="ach-pop" role="dialog" aria-modal="true" aria-live="polite">
      <div class="ach-stage"><div class="ach-rays" aria-hidden="true">${rays}</div>
        <div class="ach-coin"><div class="ach-face back">${icon('lock')}</div><div class="ach-face front">${medal(a, { size: 112 })}</div></div></div>
      <p class="ach-kicker" data-kick>${esc(tr(T.suspense))}</p>
      <div class="ach-reveal"><small class="ach-tier t${a.tier}">${esc(tr(TIER_NAME[a.tier]))}</small><h2>${esc(achName(a))}</h2><p>${esc(achDesc(a))}</p>
        <div class="ach-actions"><button type="button" class="btn ghost" data-later>${esc(tr(T.later))}</button><button type="button" class="btn primary" data-claim>${icon('coin')}${esc(fill(tr(T.claimAll), { g: num(a.gold) }))}</button></div></div>
    </div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('open'));
    play('progress');
    haptic('start');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(
      () => {
        wrap.classList.add('shown');
        wrap.querySelector('[data-kick]').textContent = tr(T.unlocked);
        play('levelup');
        haptic('done');
        setTimeout(() => wrap.querySelector('[data-claim]')?.focus(), 400);
      },
      reduce ? 200 : 2100,
    );
    const close = () => {
      clearTimeout(t);
      wrap.classList.remove('open');
      setTimeout(() => (wrap.remove(), resolve()), 220);
    };
    wrap.querySelector('[data-later]').onclick = close;
    wrap.querySelector('[data-claim]').onclick = async (e) => {
      await claim([a.id], e.currentTarget);
      close();
    };
    wrap.addEventListener('click', (e) => e.target === wrap && wrap.classList.contains('shown') && close());
  });
}

/* ---------- Vigia ---------- */
// Confere as conquistas um pouco depois de cada mudança (e ao abrir). Na primeira vez, o que já tinha
// sido alcançado aparece num aviso só, sem uma animação para cada.
let timer = null;
let running = false;
export function initAchievements() {
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const { fresh, first } = await checkAchievements(P());
      if (!fresh.length) return;
      if (first && fresh.length > 1) retroNotice(fresh.length);
      else revealAchievements(fresh);
    } catch (e) {
      console.warn('Conquistas', e);
    } finally {
      running = false;
    }
  };
  personal.subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(run, 2500);
  });
  setTimeout(run, 4000);
}

function retroNotice(n) {
  sheet({
    title: tr(T.retroTitle),
    body: `<div class="ach-retro">${toClaim(P())
      .slice(0, 8)
      .map((a) => medal(a, { size: 44 }))
      .join('')}</div><p class="sheet-text">${esc(fill(tr(T.retroText), { n }))}</p>
      <div class="sheet-actions"><span></span><button type="button" class="btn primary" data-go>${esc(tr(T.all))}</button></div>`,
    onMount(el, close) {
      play('levelup');
      el.querySelector('[data-go]').onclick = () => (close(), openAchievements());
    },
  });
}
export { achById };
