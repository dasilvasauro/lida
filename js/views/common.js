// Peças usadas por várias telas.
import { app, displayName } from '../state.js';
import { esc } from '../lib/util.js';

// Foto da conta Google; sem foto (ou se ela não carregar), a inicial do nome.
export function avatar(size) {
  const letter = (displayName() || 'V').trim()[0].toUpperCase();
  const initial = `<span class="av-initial" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${esc(letter)}</span>`;
  const photo = app.user?.photoURL;
  if (!photo) return initial;
  return `<img class="av-img" src="${esc(photo)}" alt="" width="${size}" height="${size}" referrerpolicy="no-referrer" onerror="this.outerHTML=this.dataset.fb" data-fb="${esc(initial)}">`;
}
