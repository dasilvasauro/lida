// Peças usadas por várias telas.
import { app, displayName } from '../state.js';
import { esc, fmtInt } from '../lib/util.js';
import { nowMs } from '../lib/clock.js';
import { levelTitle } from '../core/model.js';
import { boosts, levelProgress } from '../core/game.js';
import { icon, bar } from '../ui/ui.js';

// Foto da conta Google; sem foto (ou se ela não carregar), a inicial do nome.
export function avatar(size) {
  const letter = (displayName() || 'V').trim()[0].toUpperCase();
  const initial = `<span class="av-initial" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${esc(letter)}</span>`;
  const photo = app.user?.photoURL;
  if (!photo) return initial;
  return `<img class="av-img" src="${esc(photo)}" alt="" width="${size}" height="${size}" referrerpolicy="no-referrer" onerror="this.outerHTML=this.dataset.fb" data-fb="${esc(initial)}">`;
}

// Cartão de nível: título, barra de XP, ouro, vouchers e impulsos ativos.
export function levelCard(S) {
  const m = S.money;
  const lp = levelProgress(m);
  const b = boosts(S);
  const hrs = (until) => Math.max(1, Math.round((until - nowMs()) / 3600000));
  return `<a class="lvl" href="#loja" aria-label="Nível ${m.level}, ${fmtInt(m.gold)} de ouro. Abrir a Loja">
    <div class="lvl-badge" aria-hidden="true">${m.level}</div>
    <div class="lvl-info">
      <div class="row"><b>Nível ${m.level} · ${esc(levelTitle(m.level))}</b><span>${fmtInt(lp.into)} / ${fmtInt(lp.need)} XP</span></div>
      ${bar(lp.frac, { label: 'Progresso até o próximo nível' })}
      <div class="wallet"><span class="gold">${icon('coin')}<b data-count="gold">${fmtInt(m.gold)}</b></span><span class="vouch">${icon('card')}<b>${fmtInt(m.vouchers)}</b><i class="vdots" aria-label="${m.voucherProgress} de 3 para o próximo voucher">${[0, 1, 2].map((k) => `<i class="${k < m.voucherProgress ? 'on' : ''}"></i>`).join('')}</i></span>
        ${b.xp ? `<span class="boost">${icon('up')}XP ${hrs(b.xpUntil)} h</span>` : ''}${b.gold ? `<span class="boost">${icon('coin')}Ouro ${hrs(b.goldUntil)} h</span>` : ''}</div>
    </div>
  </a>`;
}

