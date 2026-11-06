// Pop-up de subida de nível: limpo, um cartão que entra com mola, alguns confetes e um botão.
import { esc } from '../lib/util.js';
import { levelTitle } from '../core/model.js';
import { play } from '../core/sound.js';
import { haptic } from './haptics.js';

const CONF = ['var(--g1)', 'var(--g2)', 'var(--accent)', 'var(--warn)'];

export function levelUp(level) {
  const prevTitle = levelTitle(level - 1);
  const title = levelTitle(level);
  const wrap = document.createElement('div');
  wrap.className = 'reward-wrap';
  const bits = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const d = 110 + Math.random() * 70;
    return `<i style="background:${CONF[i % CONF.length]};--x:${Math.round(Math.cos(a) * d)}px;--y:${Math.round(Math.sin(a) * d)}px;--r:${Math.round(Math.random() * 540)}deg;animation-delay:${80 + Math.random() * 120}ms"></i>`;
  }).join('');
  wrap.innerHTML = `<div class="reward" role="dialog" aria-modal="true" aria-labelledby="lvl-t">
    <div class="confetti" aria-hidden="true">${bits}</div>
    <div class="lvl-badge">${level}</div>
    <h2 id="lvl-t">Você chegou ao nível ${level}</h2>
    <p>${title !== prevTitle ? `Novo título: <b>${esc(title)}</b>` : `Continue assim, ${esc(title)}.`}</p>
    <button type="button" class="btn primary wide" data-ok>Continuar</button>
  </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  play('levelup');
  haptic('done');
  const close = () => {
    wrap.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => wrap.remove(), 220);
  };
  const onKey = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('click', (e) => e.target === wrap && close());
  const ok = wrap.querySelector('[data-ok]');
  ok.onclick = close;
  setTimeout(() => ok.focus(), 60);
}
