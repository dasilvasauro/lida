// Loja: itens por ouro e por vouchers, temas e o inventário (com o uso dos itens).
import { P, app } from '../state.js';
import * as G from '../core/game.js';
import { THEMES, swatch, themeName } from '../ui/theme.js';
import { esc, fmtInt } from '../lib/util.js';
import { nowMs } from '../lib/clock.js';
import { icon, toast, confirmDialog } from '../ui/ui.js';
import { play, preview, PACKS, PACK_ORDER, soundPrefs, setSoundPrefs } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';
import { levelUp } from '../ui/reward.js';

const TONE = { magicDice: 'acc', xpBoost: 'acc', goldBoost: 'warn', respite: 'pos', relief: 'pos', extraP0: 'neg', extraP1: 'warn', bonusTask: 'pos', changeModus: 'acc', extraQuitter: 'neg', freeze: 'acc', autoFreeze: 'acc', dayOff: 'warn', instantLuck: 'pos', luckyCard: 'pos' };

export const shopView = {
  title: 'Loja',
  sub: () => '',
  tab: 'ouro',
  render(el) {
    const S = P();
    const m = S.money;
    const tab = shopView.tab;
    const inv = Object.entries(m.items).filter(([k, n]) => n > 0 && G.ITEMS[k]);
    const b = G.boosts(S);
    const hrs = (u) => Math.max(1, Math.round((u - nowMs()) / 3600000));
    el.innerHTML = `
      <div class="wallet-bar" style="--i:0">
        <div><small>Ouro</small><b>${icon('coin')}${fmtInt(m.gold)}</b></div>
        <div><small>Vouchers</small><b>${icon('card')}${fmtInt(m.vouchers)}</b><i class="vdots" aria-label="${m.voucherProgress} de 3 para o próximo voucher">${[0, 1, 2].map((k) => `<i class="${k < m.voucherProgress ? 'on' : ''}"></i>`).join('')}</i></div>
        <div><small>Nível</small><b>${m.level}</b></div>
      </div>
      ${b.xp || b.gold ? `<div class="boost-bar" style="--i:1">${icon('sparkles')}${[b.xp ? `Impulso de XP ativo por mais ${hrs(b.xpUntil)} h` : '', b.gold ? `Impulso de ouro ativo por mais ${hrs(b.goldUntil)} h` : ''].filter(Boolean).join(' · ')}</div>` : ''}
      ${
        inv.length
          ? `<section class="block" style="--i:1"><div class="block-head"><h2>Seus itens</h2></div><div class="inv">${inv.map(([k, n]) => invTile(k, n)).join('')}</div></section>`
          : ''
      }
      <div class="seg small shop-tabs" role="tablist" style="--i:2">
        ${[
          ['ouro', 'Ouro'],
          ['vouchers', 'Vouchers'],
          ['temas', 'Temas'],
          ['sons', 'Sons'],
        ]
          .map(([k, l]) => `<button type="button" role="tab" class="${tab === k ? 'on' : ''}" aria-selected="${tab === k}" data-tab="${k}">${l}</button>`)
          .join('')}
      </div>
      <section class="block shop-list" style="--i:3">${tab === 'temas' ? themes(S) : tab === 'sons' ? packs(S) : items(tab === 'ouro' ? G.SHOP_GOLD : G.SHOP_VOUCHERS, m)}</section>
      <p class="hint shop-foot">${
        tab === 'sons'
          ? 'Conjuntos comprados valem em todos os aparelhos. Escolha qual usar aqui ou em Ajustes.'
          : tab === 'vouchers'
          ? 'Vouchers vêm de hábitos (a cada 3 metas batidas), do Pomodoro (a cada hora de foco) e dos marcos de nível.'
          : 'Ouro vem de tarefas concluídas, rotinas, água e check-ins do Desapego.'
      }</p>`;
    bind(el);
  },
};

function invTile(k, n) {
  const it = G.ITEMS[k];
  const act = { luckyCard: 'Abrir', magicDice: 'Rolar', xpBoost: 'Ativar', goldBoost: 'Ativar', dayOff: 'Usar' }[k];
  const where = { respite: 'No cartão da tarefa', relief: 'No cartão da tarefa', freeze: 'Use no hábito', autoFreeze: 'Automático', extraP0: 'Automático', extraP1: 'Automático', bonusTask: 'Ao criar', changeModus: 'Em Ajustes', extraQuitter: 'Ativo' }[k];
  return `<div class="inv-tile tone-${TONE[k] || 'acc'}"><span class="inv-ic">${icon(it.icon)}<b>${n}</b></span><span class="grow"><b>${esc(it.name)}</b><small>${act ? '' : esc(where || '')}</small></span>${act ? `<button type="button" class="btn small primary" data-use="${k}">${act}</button>` : ''}</div>`;
}

function items(ids, m) {
  return `<ul class="shop-items">${ids
    .map((k, i) => {
      const it = G.ITEMS[k];
      const can = (m[it.cur] || 0) >= it.cost;
      const own = m.items[k] || 0;
      return `<li class="shop-item tone-${TONE[k] || 'acc'}" style="--i:${i}">
        <span class="shop-ic">${icon(it.icon)}</span>
        <div class="grow"><b>${esc(it.name)}${own ? `<span class="own">${own} no inventário</span>` : ''}</b><p>${esc(it.desc)}</p></div>
        <button type="button" class="price${can ? '' : ' short'}" data-buy="${k}" aria-label="Comprar ${esc(it.name)} por ${it.cost} ${it.cur === 'gold' ? 'de ouro' : 'vouchers'}">${icon(it.cur === 'gold' ? 'coin' : 'card')}${fmtInt(it.cost)}</button>
      </li>`;
    })
    .join('')}</ul>`;
}

function themes(S) {
  const owned = new Set(S.walletMeta.themes || []);
  const level = S.money.level;
  const ids = Object.keys(THEMES).filter((id) => THEMES[id].unlock);
  return `<div class="themes">${ids
    .map((id) => {
      const u = THEMES[id].unlock;
      const have = owned.has(id) || (u.level && level >= u.level);
      const price = G.THEME_PRICES[id];
      const label = have ? `${icon('check')}Seu` : u.level ? `${icon('lock')}Nível ${u.level}` : `${icon('coin')}${fmtInt(price)}`;
      return `<button type="button" class="theme-opt${have ? ' have' : ''}" data-theme="${id}"${have || u.level ? ' aria-disabled="true"' : ''}>${swatch(id)}<span>${esc(themeName(id))}</span><small>${label}</small></button>`;
    })
    .join('')}</div><p class="hint">Temas comprados ficam em Ajustes. Alguns são liberados por nível.</p>`;
}

function packs(S) {
  const cur = soundPrefs().pack || 'classic';
  return `<ul class="shop-items packs">${PACK_ORDER.map((id, i) => {
    const p = PACKS[id];
    const own = G.ownsPack(id, S);
    const on = own && cur === id;
    const can = S.money.gold >= p.price;
    const btn = on
      ? `<span class="price on">${icon('check')}Em uso</span>`
      : own
        ? `<button type="button" class="price" data-pack-use="${id}">Usar</button>`
        : `<button type="button" class="price${can ? '' : ' short'}" data-pack-buy="${id}" aria-label="Comprar ${esc(p.name)} por ${p.price} de ouro">${icon('coin')}${fmtInt(p.price)}</button>`;
    return `<li class="shop-item tone-${['acc', 'warn', 'pos', 'acc', 'neg'][i % 5]}" style="--i:${i}">
      <button type="button" class="shop-ic pack-hear" data-pack-hear="${id}" aria-label="Ouvir ${esc(p.name)}">${icon('volume')}</button>
      <div class="grow"><b>${esc(p.name)}${!p.price ? '<span class="own">Grátis</span>' : ''}</b><p>${esc(p.desc)}</p></div>
      ${btn}
    </li>`;
  }).join('')}</ul>`;
}

async function onPackBuy(id, el) {
  const p = PACKS[id];
  const S = P();
  if (S.money.gold < p.price) {
    play('error');
    return toast(`Faltam ${fmtInt(p.price - S.money.gold)} de ouro para ${p.name}.`);
  }
  if (!(await confirmDialog(`${p.desc}\n\nComprar por ${fmtInt(p.price)} de ouro?`, { ok: 'Comprar', title: p.name }))) return;
  if (!(await G.buySoundPack(id, p.price)).ok) return toast('Não foi possível comprar.');
  setSoundPrefs({ pack: id });
  play('purchase');
  haptic('done');
  toast(`${p.name} liberado e em uso.`);
  shopView.render(el);
}

function bind(el) {
  el.querySelectorAll('[data-pack-hear]').forEach((b) => (b.onclick = () => preview(b.dataset.packHear)));
  el.querySelectorAll('[data-pack-buy]').forEach((b) => (b.onclick = () => onPackBuy(b.dataset.packBuy, el)));
  el.querySelectorAll('[data-pack-use]').forEach(
    (b) =>
      (b.onclick = () => {
        setSoundPrefs({ pack: b.dataset.packUse });
        play('complete');
        shopView.render(el);
      }),
  );
  el.querySelectorAll('[data-tab]').forEach(
    (b) =>
      (b.onclick = () => {
        shopView.tab = b.dataset.tab;
        haptic('tick');
        shopView.render(el);
      }),
  );
  el.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => onBuy(b.dataset.buy)));
  el.querySelectorAll('[data-use]').forEach((b) => (b.onclick = () => onUse(b.dataset.use)));
  el.querySelectorAll('[data-theme]').forEach((b) => (b.onclick = () => onTheme(b.dataset.theme)));
}

async function onBuy(k) {
  const it = G.ITEMS[k];
  const m = P().money;
  if ((m[it.cur] || 0) < it.cost) {
    play('error');
    haptic('warn');
    const falta = it.cost - (m[it.cur] || 0);
    return toast(`Faltam ${fmtInt(falta)} ${it.cur === 'gold' ? 'de ouro' : falta === 1 ? 'voucher' : 'vouchers'} para ${it.name}.`);
  }
  if (it.cost >= 300 && !(await confirmDialog(`${it.desc}\n\nComprar por ${fmtInt(it.cost)} ${it.cur === 'gold' ? 'de ouro' : 'vouchers'}?`, { ok: 'Comprar', title: it.name }))) return;
  const r = await G.buy(k);
  if (!r.ok) return toast('Não foi possível comprar.');
  play('purchase');
  haptic('done');
  toast(k === 'instantLuck' ? 'Você ganhou uma Carta da Sorte. Abra em "Seus itens".' : `${it.name} comprado.`);
}

async function onUse(k) {
  if (k === 'luckyCard') {
    const r = await G.openLuckyCard();
    if (!r) return;
    const p = r.prize;
    const title = p.gold ? `+${fmtInt(p.gold)} de ouro` : p.xp ? `+${fmtInt(p.xp)} de XP` : p.vouchers ? '+1 voucher' : p.item ? G.ITEMS[p.item].name : 'Desta vez, nada';
    const text = p.big ? 'A sorte grande! Bom proveito.' : p.gold ? 'Um trocado para a Loja.' : p.xp ? 'Sabedoria acumulada.' : p.vouchers ? 'Vale para os itens de voucher.' : p.item ? 'Já está nos seus itens.' : 'Acontece. A próxima pode ser melhor.';
    reveal({
      kind: 'card',
      title,
      text,
      good: !!(p.gold || p.xp || p.vouchers || p.item),
      after: () => r.levelUp && levelUp(r.levelUp, r),
    });
  } else if (k === 'magicDice') {
    const r = await G.rollDice();
    if (!r) return;
    if (r.error) return toast(r.error);
    reveal({ kind: 'dice', face: r.roll, title: `Você tirou ${r.roll}`, text: `"${r.task.title}" vai render o dobro de XP e ouro.`, good: true });
  } else if (k === 'xpBoost' || k === 'goldBoost') {
    if (await G.activateBoost(k === 'xpBoost' ? 'xp' : 'gold')) {
      play('powerup');
      haptic('start');
      toast(`${G.ITEMS[k].name} ativo pelas próximas 24 horas.`);
    }
  } else if (k === 'dayOff') {
    app.nav('habitos');
    setTimeout(() => toast('Use a Folga no fim da lista de hábitos.'), 400);
  }
}

async function onTheme(id) {
  const S = P();
  const u = THEMES[id].unlock;
  if ((S.walletMeta.themes || []).includes(id) || (u.level && S.money.level >= u.level)) return toast('Este tema já é seu. Escolha em Ajustes.', { action: 'Ajustes', onAction: () => app.nav('ajustes') });
  if (u.level) return toast(`Liberado ao chegar no nível ${u.level}.`);
  const price = G.THEME_PRICES[id];
  if (S.money.gold < price) return toast(`Faltam ${fmtInt(price - S.money.gold)} de ouro para este tema.`);
  if (!(await confirmDialog(`Comprar o tema ${themeName(id)} por ${fmtInt(price)} de ouro?`, { ok: 'Comprar', title: 'Tema' }))) return;
  if ((await G.buyTheme(id)).ok) {
    play('purchase');
    toast(`Tema ${themeName(id)} liberado.`, { action: 'Usar agora', onAction: () => app.actions.setTheme(id) });
  }
}

// Revelação curta do Dado Mágico e da Carta da Sorte.
function reveal({ kind, face = 1, title, text, good, after }) {
  const wrap = document.createElement('div');
  wrap.className = 'reward-wrap';
  const pips = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }[face];
  wrap.innerHTML = `<div class="reward reveal-${kind}" role="dialog" aria-modal="true" aria-live="polite">
    ${
      kind === 'dice'
        ? `<div class="die rolling" aria-hidden="true">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<i class="${pips.includes(n) ? 'on' : ''}"></i>`).join('')}</div>`
        : `<div class="lucky flipping" aria-hidden="true"><div class="lucky-back">${icon('clover')}</div><div class="lucky-front${good ? ' good' : ''}">${icon(good ? 'sparkles' : 'clover')}</div></div>`
    }
    <h2 class="reveal-t">${esc(title)}</h2><p class="reveal-t">${esc(text)}</p>
    <button type="button" class="btn primary wide reveal-t" data-ok>Continuar</button></div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  play(kind === 'dice' ? 'powerup' : 'tick');
  setTimeout(() => {
    wrap.classList.add('revealed');
    play(good ? 'coin' : 'uncheck');
    haptic(good ? 'done' : 'tap');
  }, 900);
  const close = () => {
    wrap.classList.remove('open');
    setTimeout(() => {
      wrap.remove();
      after?.();
    }, 220);
  };
  wrap.querySelector('[data-ok]').onclick = close;
  wrap.addEventListener('click', (e) => e.target === wrap && close());
}

