// Dial de minutos como o de um timer de cozinha: uma faixa de números na superfície de um cilindro.
// O número do centro é grande; os das bordas encolhem e somem como se girassem para trás.
// Arrastar (com inércia), roda do mouse e setas do teclado; para em minutos inteiros, com vibração a
// cada minuto (mais forte nos múltiplos de 5). Também mostra o tempo correndo (set(), sem arrastar).
import { haptic } from './haptics.js';
import { play } from '../core/sound.js';

const DEG = 10; // graus entre um minuto e o próximo na superfície

export function dial(el, { min = 1, max = 90, value = 25, label = 5, onChange, onCommit, ariaLabel = 'Minutos' } = {}) {
  el.classList.add('dial');
  el.setAttribute('role', 'slider');
  el.tabIndex = 0;
  el.setAttribute('aria-label', ariaLabel);
  el.setAttribute('aria-valuemin', min);
  el.setAttribute('aria-valuemax', max);
  el.innerHTML = '<div class="dial-face"></div><i class="dial-mark" aria-hidden="true"></i>';
  const face = el.firstChild;
  const items = [];
  for (let v = min; v <= max; v++) {
    const major = v % label === 0 || v === min;
    const it = document.createElement('span');
    it.className = `dial-it${major ? ' major' : ''}`;
    it.innerHTML = `<i></i><b>${v}</b>`;
    face.appendChild(it);
    items.push({ v, it });
  }
  let pos = value; // posição contínua (em minutos)
  let target = value;
  let vel = 0;
  let raf = 0;
  let dragging = false;
  let locked = false;
  let byUser = false; // o movimento atual veio da pessoa (vibra, toca e avisa) ou do relógio
  let lastInt = Math.round(value);
  const clamp = (x) => Math.max(min, Math.min(max, x));

  function radius() {
    return Math.max(80, el.clientWidth / 2);
  }
  function draw() {
    const R = radius();
    for (const { v, it } of items) {
      const th = ((v - pos) * DEG * Math.PI) / 180;
      if (Math.abs(th) >= Math.PI / 2) {
        it.style.visibility = 'hidden';
        continue;
      }
      const c = Math.cos(th);
      it.style.visibility = '';
      it.style.transform = `translateX(${(R * Math.sin(th)).toFixed(1)}px) scale(${(0.55 + 0.45 * c).toFixed(3)}, ${(0.7 + 0.3 * c).toFixed(3)}) scaleX(${c.toFixed(3)})`;
      it.style.opacity = (c ** 2.2).toFixed(3);
      it.classList.toggle('on', Math.round(pos) === v);
    }
    el.setAttribute('aria-valuenow', Math.round(pos));
  }
  function crossed() {
    const n = Math.round(pos);
    if (n === lastInt) return;
    const strong = n % label === 0;
    lastInt = n;
    if (!byUser) return;
    haptic(strong ? 'tap' : 'tick');
    play(strong ? 'dialMajor' : 'dial');
    onChange?.(n);
  }
  function loop() {
    raf = 0;
    if (dragging) return;
    if (Math.abs(vel) > 0.02) {
      // inércia: desacelera até quase parar e então encaixa no minuto mais perto
      pos = clamp(pos + vel);
      vel *= 0.9;
      if (pos === min || pos === max) vel = 0;
      target = Math.round(pos);
    } else {
      vel = 0;
      pos += (target - pos) * 0.28;
      if (Math.abs(target - pos) < 0.004) {
        pos = target;
        crossed();
        draw();
        if (byUser && !locked) onCommit?.(Math.round(pos));
        byUser = false;
        return;
      }
    }
    crossed();
    draw();
    raf = requestAnimationFrame(loop);
  }
  const kick = () => raf || (raf = requestAnimationFrame(loop));

  // Arrastar: um minuto a cada "passo" na superfície (perto do centro, ~ R * ângulo)
  let lastX = 0;
  let lastT = 0;
  const unit = () => (radius() * DEG * Math.PI) / 180;
  el.addEventListener('pointerdown', (e) => {
    if (locked) return;
    e.stopPropagation(); // a janela por baixo não começa a ser arrastada
    dragging = true;
    byUser = true;
    vel = 0;
    lastX = e.clientX;
    lastT = performance.now();
    el.setPointerCapture?.(e.pointerId);
    el.classList.add('grab');
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const now = performance.now();
    const d = -dx / unit();
    pos = clamp(pos + d);
    vel = (d / Math.max(8, now - lastT)) * 16; // minutos por quadro (~16 ms)
    lastX = e.clientX;
    lastT = now;
    crossed();
    draw();
  });
  const up = () => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('grab');
    if (performance.now() - lastT > 90) vel = 0; // parou antes de soltar: sem inércia
    target = Math.round(pos);
    kick();
  };
  el.addEventListener('touchstart', (e) => !locked && e.stopPropagation(), { passive: true });
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener(
    'wheel',
    (e) => {
      if (locked) return;
      e.preventDefault();
      byUser = true;
      target = clamp(Math.round(target + Math.sign(e.deltaY || e.deltaX)));
      kick();
    },
    { passive: false },
  );
  el.addEventListener('keydown', (e) => {
    if (locked) return;
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
    if (step == null) return;
    e.preventDefault();
    byUser = true;
    target = clamp(Math.round(target) + step);
    kick();
  });
  new ResizeObserver(draw).observe(el);
  draw();

  return {
    // Mostra um valor (ex.: o tempo correndo) sem avisar mudança.
    set(v, { animate = true } = {}) {
      if (dragging || byUser) return; // a pessoa está girando
      target = clamp(v);
      lastInt = Math.round(target);
      if (!animate || dragging) {
        if (!dragging) pos = target;
        draw();
        return;
      }
      kick();
    },
    lock(on) {
      locked = !!on;
      el.classList.toggle('locked', locked);
      el.setAttribute('aria-disabled', String(locked));
    },
    get value() {
      return Math.round(pos);
    },
  };
}
