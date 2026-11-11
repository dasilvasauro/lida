// Peças usadas por várias telas.
import { app, displayName, personal, P } from '../state.js';
import { esc, fmtInt } from '../lib/util.js';
import { nowMs } from '../lib/clock.js';
import { levelTitle, LEVEL_TITLES } from '../core/model.js';
import { boosts, levelProgress } from '../core/game.js';
import { icon, bar, sheet } from '../ui/ui.js';
import { mascotFor, mascotCollection, mascotSvg, selfieSrc, unlockedTitles, COSTUMES, costumeKey } from '../ui/mascot.js';

// Avatar: a escolha em Ajustes (foto enviada, Lidinho inteiro ou em "selfie", conta Google ou inicial);
// sem nada, a foto da conta Google ou a inicial do nome. O Lidinho pode ser qualquer um já alcançado
// (profileMeta.lidinho) ou acompanhar o título atual (sem escolha).
export function avatarTitle(pr = P().profileMeta || {}) {
  const level = P().money.level;
  if (pr.lidinho && COSTUMES.some((c) => costumeKey(c.id) === pr.lidinho)) return pr.lidinho;
  return pr.lidinho && unlockedTitles(level).includes(pr.lidinho) ? pr.lidinho : levelTitle(level);
}
export function avatar(size) {
  const letter = (displayName() || 'V').trim()[0].toUpperCase();
  const initial = `<span class="av-initial" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${esc(letter)}</span>`;
  const pr = P().profileMeta || {};
  if (pr.avatar === 'photo' && pr.photo) return `<img class="av-img" src="${esc(pr.photo)}" alt="" width="${size}" height="${size}">`;
  if (pr.avatar === 'mascot') return `<span class="av-free" style="width:${size}px;height:${size}px">${mascotSvg(avatarTitle(pr), { size })}</span>`;
  if (pr.avatar === 'selfie') return `<img class="av-img av-selfie" src="${selfieSrc(avatarTitle(pr))}" alt="" width="${size}" height="${size}">`;
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

// Folha para escolher o avatar. Lidinho: inteiro (sem moldura) ou "selfie" (rosto no círculo), de
// qualquer título já alcançado, ou sempre o do título atual.
export function openAvatar(onDone) {
  const pr = P().profileMeta || {};
  const level = P().money.level;
  const cur = pr.avatar || (app.user?.photoURL ? 'google' : 'initial');
  const t = avatarTitle(pr);
  const opts = [
    ['photo', 'Foto', pr.photo ? `<img src="${esc(pr.photo)}" alt="">` : icon('upload')],
    ['selfie', 'Lidinho no círculo', `<img src="${selfieSrc(t)}" alt="">`],
    ['mascot', 'Lidinho inteiro', `<span class="av-free-art">${mascotSvg(t, { size: 56 })}</span>`],
    ...(app.user?.photoURL ? [['google', 'Conta Google', `<img src="${esc(app.user.photoURL)}" alt="" referrerpolicy="no-referrer">`]] : []),
    ['initial', 'Inicial', `<span class="av-initial">${esc((displayName() || 'V').trim()[0].toUpperCase())}</span>`],
  ];
  const lidis = () => {
    const p = P().profileMeta || {};
    const kind = p.avatar === 'mascot' ? 'mascot' : 'selfie';
    const chosen = p.lidinho && (unlockedTitles(level).includes(p.lidinho) || COSTUMES.some((c) => costumeKey(c.id) === p.lidinho)) ? p.lidinho : '';
    const art = (title, locked) => (kind === 'selfie' ? `<img class="${locked ? 'mascot locked' : ''}" src="${selfieSrc(title)}" alt="">` : mascotSvg(title, { size: 52, locked }));
    return `<div class="av-lidis-head"><b>Qual Lidinho?</b><small>Os próximos aparecem quando você chegar ao título.</small></div>
      <div class="av-lidis"><button type="button" class="av-lidi${chosen ? '' : ' on'}" data-lidi=""><span class="av-lidi-art">${art(levelTitle(level), false)}</span><span>Sempre o do meu título</span></button>
      ${LEVEL_TITLES.map(([min, title]) => {
        const locked = level < min;
        return `<button type="button" class="av-lidi${chosen === title ? ' on' : ''}" data-lidi="${esc(title)}"${locked ? ' disabled' : ''} aria-label="${locked ? `Libera no nível ${min}` : esc(title)}"><span class="av-lidi-art">${art(title, locked)}</span><span>${locked ? `Nível ${min}` : esc(title)}</span></button>`;
      }).join('')}</div>
      <div class="av-lidis-head"><b>Fantasias</b><small>Liberadas para todo mundo.</small></div>
      <div class="av-lidis">${COSTUMES.map((c) => `<button type="button" class="av-lidi${chosen === costumeKey(c.id) ? ' on' : ''}" data-lidi="${costumeKey(c.id)}"><span class="av-lidi-art">${art(costumeKey(c.id), false)}</span><span>${esc(c.name.split(',')[0])}</span></button>`).join('')}</div>`;
  };
  sheet({
    title: 'Foto de perfil',
    body: `<div class="av-pick">${opts.map(([k, l, art]) => `<button type="button" class="av-opt${cur === k ? ' on' : ''}" data-av="${k}"><span class="av-art">${art}</span><span>${l}</span></button>`).join('')}</div>
      <div data-lidiwrap${cur === 'mascot' || cur === 'selfie' ? '' : ' hidden'}>${lidis()}</div>
      <p class="hint">A foto é reduzida para 256 px e fica cifrada, como o resto dos seus dados.</p>
      <input type="file" accept="image/*" data-avfile hidden>
      <div class="sheet-actions">${pr.photo ? '<button type="button" class="btn ghost" data-avdel>Remover foto</button>' : ''}<button type="button" class="btn primary" data-avok>Pronto</button></div>`,
    onMount(el, close) {
      const file = el.querySelector('[data-avfile]');
      const wrap = el.querySelector('[data-lidiwrap]');
      const paintOpts = () => {
        const p = P().profileMeta || {};
        const tt = avatarTitle(p);
        el.querySelector('[data-av="selfie"] .av-art').innerHTML = `<img src="${selfieSrc(tt)}" alt="">`;
        el.querySelector('[data-av="mascot"] .av-art').innerHTML = `<span class="av-free-art">${mascotSvg(tt, { size: 56 })}</span>`;
      };
      const bindLidis = () =>
        wrap.querySelectorAll('[data-lidi]').forEach(
          (b) =>
            (b.onclick = async () => {
              await saveProfile({ lidinho: b.dataset.lidi || undefined });
              wrap.querySelectorAll('[data-lidi]').forEach((x) => x.classList.toggle('on', x === b));
              paintOpts();
              onDone?.();
            }),
        );
      bindLidis();
      const pick = async (k) => {
        if (k === 'photo' && (!P().profileMeta?.photo || el.querySelector('[data-av="photo"]').classList.contains('on'))) return file.click();
        await saveProfile({ avatar: k });
        el.querySelectorAll('[data-av]').forEach((b) => b.classList.toggle('on', b.dataset.av === k));
        wrap.hidden = !(k === 'mascot' || k === 'selfie');
        if (!wrap.hidden) {
          wrap.innerHTML = lidis();
          bindLidis();
        }
        onDone?.();
      };
      el.querySelectorAll('[data-av]').forEach((b) => (b.onclick = () => pick(b.dataset.av)));
      file.onchange = async () => {
        try {
          const photo = await photoFromFile(file.files[0]);
          await saveProfile({ avatar: 'photo', photo });
          el.querySelector('[data-av="photo"] .av-art').innerHTML = `<img src="${esc(photo)}" alt="">`;
          el.querySelectorAll('[data-av]').forEach((b) => b.classList.toggle('on', b.dataset.av === 'photo'));
          wrap.hidden = true;
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
