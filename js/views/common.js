// Peças usadas por várias telas.
import { app, displayName, personal, P } from '../state.js';
import { esc, fmtInt } from '../lib/util.js';
import { nowMs } from '../lib/clock.js';
import { levelTitle } from '../core/model.js';
import { boosts, levelProgress } from '../core/game.js';
import { icon, bar, sheet } from '../ui/ui.js';
import { mascotFor, mascotCollection } from '../ui/mascot.js';

// Avatar: a escolha em Ajustes (foto enviada, Lidinho do seu título ou a conta Google); sem nada,
// a foto da conta Google ou a inicial do nome.
export function avatar(size) {
  const letter = (displayName() || 'V').trim()[0].toUpperCase();
  const initial = `<span class="av-initial" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${esc(letter)}</span>`;
  const pr = P().profileMeta || {};
  if (pr.avatar === 'photo' && pr.photo) return `<img class="av-img" src="${esc(pr.photo)}" alt="" width="${size}" height="${size}">`;
  if (pr.avatar === 'mascot') return `<span class="av-mascot" style="width:${size}px;height:${size}px">${mascotFor(P().money.level, { size: Math.round(size * 0.92) })}</span>`;
  if (pr.avatar === 'initial') return initial;
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
  return `<div class="lvl"><a class="lvl-link" href="#loja" aria-label="Nível ${m.level}, ${fmtInt(m.gold)} de ouro. Abrir a Loja">
    <div class="lvl-badge" aria-hidden="true">${m.level}</div>
    <div class="lvl-info">
      <div class="row"><b class="lvl-title">Nível ${m.level} · ${esc(levelTitle(m.level))}</b><span>${fmtInt(lp.into)} / ${fmtInt(lp.need)} XP</span></div>
      ${bar(lp.frac, { label: 'Progresso até o próximo nível' })}
      <div class="wallet"><span class="gold">${icon('coin')}<b data-count="gold">${fmtInt(m.gold)}</b></span><span class="vouch">${icon('card')}<b>${fmtInt(m.vouchers)}</b><i class="vdots" aria-label="${m.voucherProgress} de 3 para o próximo voucher">${[0, 1, 2].map((k) => `<i class="${k < m.voucherProgress ? 'on' : ''}"></i>`).join('')}</i></span>
        ${b.xp ? `<span class="boost">${icon('up')}XP ${hrs(b.xpUntil)} h</span>` : ''}${b.gold ? `<span class="boost">${icon('coin')}Ouro ${hrs(b.goldUntil)} h</span>` : ''}</div>
    </div></a>
    <button type="button" class="lvl-mascot" data-mascot aria-label="Lidinho, ${esc(levelTitle(m.level))}: ver os títulos">${mascotFor(m.level, { size: 64 })}</button>
  </div>`;
}


// Coleção do Lidinho: o título atual, os anteriores com os seus textos e a sombra dos próximos.
export function openMascot(level) {
  sheet({
    title: 'Lidinho',
    body: `<p class="sheet-text">Cada título é uma fase da sua jornada de produtividade. Os próximos ficam na sombra até você chegar lá.</p>${mascotCollection(level)}`,
    onMount(el) {
      setTimeout(() => el.querySelector('[data-now]')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 260);
    },
  });
}

// Reduz a foto escolhida para 256 px (corte quadrado no centro) e guarda como JPEG (~20–40 KB),
// cifrada e sincronizada como qualquer outro registro.
export async function photoFromFile(file, max = 256) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Escolha uma imagem.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Imagem grande demais (máximo 15 MB).');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Não consegui abrir essa imagem.'));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement('canvas');
    c.width = c.height = Math.min(max, side);
    c.getContext('2d').drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, c.width, c.height);
    let q = 0.86;
    let data = c.toDataURL('image/jpeg', q);
    while (data.length > 60000 && q > 0.4) data = c.toDataURL('image/jpeg', (q -= 0.12));
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const saveProfile = (patch) => personal.save('profile', { ...(P().profileMeta || {}), ...patch }, 'profile');

// Folha para escolher o avatar.
export function openAvatar(onDone) {
  const pr = P().profileMeta || {};
  const cur = pr.avatar || (app.user?.photoURL ? 'google' : 'initial');
  const opts = [
    ['photo', 'Foto', pr.photo ? `<img src="${esc(pr.photo)}" alt="">` : icon('upload')],
    ['mascot', 'Lidinho', mascotFor(P().money.level, { size: 56 })],
    ...(app.user?.photoURL ? [['google', 'Conta Google', `<img src="${esc(app.user.photoURL)}" alt="" referrerpolicy="no-referrer">`]] : []),
    ['initial', 'Inicial', `<span class="av-initial">${esc((displayName() || 'V').trim()[0].toUpperCase())}</span>`],
  ];
  sheet({
    title: 'Foto de perfil',
    body: `<div class="av-pick">${opts.map(([k, l, art]) => `<button type="button" class="av-opt${cur === k ? ' on' : ''}" data-av="${k}"><span class="av-art">${art}</span><span>${l}</span></button>`).join('')}</div>
      <p class="hint">A foto é reduzida para 256 px e fica cifrada, como o resto dos seus dados. O Lidinho muda junto com o seu título.</p>
      <input type="file" accept="image/*" data-avfile hidden>
      <div class="sheet-actions">${pr.photo ? '<button type="button" class="btn ghost" data-avdel>Remover foto</button>' : ''}<button type="button" class="btn primary" data-avok>Pronto</button></div>`,
    onMount(el, close) {
      const file = el.querySelector('[data-avfile]');
      const pick = async (k) => {
        if (k === 'photo' && (!P().profileMeta?.photo || el.querySelector('[data-av="photo"]').classList.contains('on'))) return file.click();
        await saveProfile({ avatar: k });
        el.querySelectorAll('[data-av]').forEach((b) => b.classList.toggle('on', b.dataset.av === k));
        onDone?.();
      };
      el.querySelectorAll('[data-av]').forEach((b) => (b.onclick = () => pick(b.dataset.av)));
      file.onchange = async () => {
        try {
          const photo = await photoFromFile(file.files[0]);
          await saveProfile({ avatar: 'photo', photo });
          el.querySelector('[data-av="photo"] .av-art').innerHTML = `<img src="${esc(photo)}" alt="">`;
          el.querySelectorAll('[data-av]').forEach((b) => b.classList.toggle('on', b.dataset.av === 'photo'));
          onDone?.();
        } catch (e) {
          (await import('../ui/ui.js')).toast(e.message || 'Não consegui usar essa imagem.');
        }
        file.value = '';
      };
      el.querySelector('[data-avdel]')?.addEventListener('click', async () => {
        await saveProfile({ avatar: app.user?.photoURL ? 'google' : 'initial', photo: undefined });
        onDone?.();
        close();
      });
      el.querySelector('[data-avok]').onclick = close;
    },
  });
}
