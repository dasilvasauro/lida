import { esc } from '../lib/util.js';

/* ---------- Ícones (traço único, 24px) ---------- */
const P = {
  today: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="m9.5 15 1.8 1.8 3.4-3.6"/>',
  inbox: '<path d="M4 13.5 6.2 6a1.5 1.5 0 0 1 1.4-1h8.8a1.5 1.5 0 0 1 1.4 1L20 13.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z"/><path d="M4 13.5h4.5l1.2 2h4.6l1.2-2H20"/>',
  upcoming: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4M8 14h2M12 14h2M16 14h.01M8 17h2"/>',
  habit: '<path d="M12 21c4.4 0 7.5-3 7.5-7.2 0-3.6-2.4-5.6-3.8-8.3-.6 2-1.8 3.2-3.2 3.7C12.7 6.4 11.4 4.4 9 3c.3 3.2-1.4 5.3-2.8 7.1A7.5 7.5 0 0 0 4.5 14c0 4.1 3.1 7 7.5 7z"/>',
  water: '<path d="M12 3.5S6 10 6 14.2a6 6 0 0 0 12 0C18 10 12 3.5 12 3.5z"/><path d="M9.5 15a2.6 2.6 0 0 0 2.5 2.4"/>',
  shop: '<path d="M5 9h14l-1.2 10a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5v9M14.5 9.5c-.4-.9-1.3-1.4-2.5-1.4-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.5 5 4.1 0 1.1-1 1.9-2.5 1.9-1.3 0-2.2-.6-2.6-1.5"/>',
  spark: '<path d="M12 3.5 13.7 9l5.8 1.6-5.8 1.7L12 18l-1.7-5.7-5.8-1.7L10.3 9z"/><path d="M19 3.5v3M17.5 5h3"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 2.5h5M19 5.5l1.5 1.5"/>',
  flame: '<path d="M12 21c3.9 0 6.5-2.6 6.5-6.3 0-3.2-2.1-5-3.4-7.3-.5 1.7-1.6 2.8-2.8 3.2C11.9 8.2 10.8 6.4 8.7 5.2c.3 2.8-1.2 4.6-2.4 6.2A6.5 6.5 0 0 0 5.5 14.7C5.5 18.4 8.1 21 12 21z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.1-1-1.4-1-2.5 0-.8.7-1.5 1.6-1.5h2.1A4 4 0 0 0 20.5 11 7.8 7.8 0 0 0 12 3.5z"/><circle cx="7.8" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="14.8" cy="7.8" r="1"/>',
  type: '<path d="M5 6.5V5h14v1.5M12 5v14M9.5 19h5"/>',
  volume: '<path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3zM16 10l4 4M20 10l-4 4"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  repeat: '<path d="M17 3.5 20 6.5l-3 3M4 11.5V10a3.5 3.5 0 0 1 3.5-3.5H20M7 20.5 4 17.5l3-3M20 12.5V14a3.5 3.5 0 0 1-3.5 3.5H4"/>',
  hash: '<path d="M9.5 4 8 20M16 4l-1.5 16M4.5 9h16M3.5 15h16"/>',
  folder: '<path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h4l2 2h7A1.5 1.5 0 0 1 20 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
  mood: '<circle cx="12" cy="12" r="8.5"/><path d="M8.8 14.2a4 4 0 0 0 6.4 0M9.3 10h.01M14.7 10h.01"/>',
  cart: '<path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
  box: '<path d="M4 8 12 4l8 4v8l-8 4-8-4z"/><path d="m4 8 8 4 8-4M12 12v8"/>',
  tag: '<path d="M4 12V5a1 1 0 0 1 1-1h7l8 8-8 8z"/><circle cx="8.5" cy="8.5" r="1.3"/>',
  mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3.5"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
  pin: '<path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  up: '<path d="M12 18V6M6.5 11.5 12 6l5.5 5.5"/>',
  dn: '<path d="M12 6v12M6.5 12.5 12 18l5.5-5.5"/>',
  minus: '<path d="M5 12h14"/>',
  sort: '<path d="M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  users: '<circle cx="9" cy="9" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a2.8 2.8 0 0 1 0 5.4M17.5 14.5a5 5 0 0 1 3 4.5"/>',
  bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
  more: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
  back: '<path d="M11 5 4 12l7 7M4 12h16"/>',
  sections: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  az: '<path d="M4 17 7.5 7l3.5 10M5.2 13.5h4.6M14 7h6l-6 10h6"/>',
  keyboard: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  diary: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
  plan: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M8 14h3"/>',
  wallet: '<path d="M4 7a2 2 0 0 1 2-2h11v4"/><path d="M4 7v11a2 2 0 0 0 2 2h13V9H6a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1.2"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
  card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>',
  bank: '<path d="M4 9.5 12 5l8 4.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M4 20h16"/>',
  in: '<path d="M17 7 7 17M7 9v8h8"/>',
  out: '<path d="M7 17 17 7M9 7h8v8"/>',
  swap: '<path d="M7 8h12l-3-3M17 16H5l3 3"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 8.5a4.5 4.5 0 0 1 .5 9.5z"/>',
  download: '<path d="M12 4v11m-4-4 4 4 4-4M5 20h14"/>',
  upload: '<path d="M12 16V5m-4 4 4-4 4 4M5 20h14"/>',
  logout: '<path d="M14 5h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h9"/>',
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 14h2M14 18v2M17 17h3v3h-3z"/>',
  share: '<path d="M12 15V4m-4 4 4-4 4 4"/><path d="M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01"/>',
  flag: '<path d="M6 21V4M6 4h10l-2 3.5 2 3.5H6"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  archive: '<rect x="4" y="5" width="16" height="4" rx="1"/><path d="M5.5 9v10h13V9M10 13h4"/>',
  edit: '<path d="M5 19h4L19 9l-4-4L5 15zM13.5 6.5l4 4"/>',
  chart: '<path d="M4 19h16M6 15l4-4 3 2 5-6"/>',
  flask: '<path d="M10 4h4M10.5 4v5.5L5.5 18a1.5 1.5 0 0 0 1.3 2h10.4a1.5 1.5 0 0 0 1.3-2l-5-8.5V4"/><path d="M8 14h8"/>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2"/>',
  refresh: '<path d="M19 12a7 7 0 1 1-2.05-4.95M19 5v4h-4"/>',
};
export const icon = (n, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

/* ---------- Dica contextual ---------- */
export const tip = (text) =>
  `<button type="button" class="tip" data-tip="${esc(text)}" aria-label="Ajuda: ${esc(text)}">${icon('info')}</button>`;

let tipEl = null;
function hideTip() {
  tipEl?.remove();
  tipEl = null;
}
export function initTips() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.tip');
    if (!b) return hideTip();
    e.preventDefault();
    e.stopPropagation();
    if (tipEl && tipEl._for === b) return hideTip();
    hideTip();
    tipEl = document.createElement('div');
    tipEl.className = 'tip-pop';
    tipEl.textContent = b.dataset.tip;
    tipEl._for = b;
    document.body.appendChild(tipEl);
    const r = b.getBoundingClientRect();
    const w = Math.min(280, window.innerWidth - 24);
    tipEl.style.maxWidth = w + 'px';
    const pw = tipEl.offsetWidth;
    let left = Math.min(Math.max(12, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 12);
    let top = r.bottom + 8;
    if (top + tipEl.offsetHeight > window.innerHeight - 12) top = r.top - tipEl.offsetHeight - 8;
    tipEl.style.left = left + 'px';
    tipEl.style.top = top + 'px';
  }, true);
  window.addEventListener('scroll', hideTip, true);
}

/* ---------- Painel (bottom sheet no celular, diálogo no computador) ---------- */
const stack = [];
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) stack[stack.length - 1]();
});

export function sheet({ title, body, onMount, onClose, wide = false }) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop"></div>
    <section class="sheet${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Fechar">${icon('x')}</button></header>
      <div class="sheet-body">${body}</div>
    </section>`;
  document.body.appendChild(wrap);
  document.body.classList.add('has-sheet');
  const prev = document.activeElement;
  requestAnimationFrame(() => wrap.classList.add('open'));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    stack.splice(stack.indexOf(close), 1);
    wrap.classList.remove('open');
    onClose?.();
    setTimeout(() => {
      wrap.remove();
      if (!stack.length) document.body.classList.remove('has-sheet');
    }, 220);
    prev?.focus?.({ preventScroll: true });
  };
  stack.push(close);
  wrap.querySelector('.sheet-backdrop').onclick = close;
  wrap.querySelector('[data-close]').onclick = close;
  const el = wrap.querySelector('.sheet');
  onMount?.(el, close);
  setTimeout(() => el.querySelector('[autofocus]')?.focus(), 80);
  return close;
}

export function confirmDialog(message, { ok = 'Confirmar', danger = false, title = 'Confirmar' } = {}) {
  return new Promise((resolve) => {
    let result = false;
    sheet({
      title,
      body: `<p class="sheet-text">${esc(message)}</p>
        <div class="sheet-actions"><button type="button" class="btn ghost" data-no>Cancelar</button>
        <button type="button" class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(ok)}</button></div>`,
      onMount(el, close) {
        el.querySelector('[data-no]').onclick = close;
        el.querySelector('[data-yes]').onclick = () => {
          result = true;
          close();
        };
      },
      onClose: () => resolve(result),
    });
  });
}

export function promptDialog(title, { label = '', value = '', ok = 'Salvar', type = 'text' } = {}) {
  return new Promise((resolve) => {
    let result = null;
    sheet({
      title,
      body: `<form class="form" data-f>
        <label class="field"><span>${esc(label)}</span><input name="v" type="${type}" value="${esc(value)}" autofocus required></label>
        <div class="sheet-actions"><button type="button" class="btn ghost" data-no>Cancelar</button><button class="btn primary">${esc(ok)}</button></div></form>`,
      onMount(el, close) {
        el.querySelector('[data-no]').onclick = close;
        el.querySelector('[data-f]').onsubmit = (e) => {
          e.preventDefault();
          result = e.target.v.value.trim();
          close();
        };
      },
      onClose: () => resolve(result),
    });
  });
}

/* ---------- Avisos ---------- */
export function toast(msg, { action, onAction, ms = 3200 } = {}) {
  let host = document.getElementById('toasts');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toasts';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  const kill = () => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 200);
  };
  if (action)
    t.querySelector('button').onclick = () => {
      onAction?.();
      kill();
    };
  setTimeout(kill, action ? ms * 2 : ms);
}

export function readForm(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.type === 'radio') {
      if (el.checked) o[el.name] = el.value;
    } else if (el.type === 'number') o[el.name] = el.value === '' ? null : Number(el.value);
    else o[el.name] = el.value;
  }
  return o;
}

export const opt = (value, label, sel) => `<option value="${esc(value)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;

export function seg(name, options, value) {
  return `<div class="seg" role="radiogroup">${options
    .map(([v, l]) => `<label><input type="radio" name="${name}" value="${esc(v)}"${v === value ? ' checked' : ''}><span>${esc(l)}</span></label>`)
    .join('')}</div>`;
}

export const field = (label, control, help) =>
  `<label class="field"><span>${esc(label)}${help ? tip(help) : ''}</span>${control}</label>`;

export const COLORS = ['#7C8CFF', '#5FE3B5', '#F2C14E', '#F2716B', '#59C3F0', '#C08CF5', '#F59AC0', '#9BD16A', '#F0995A', '#8FA3B8'];
export function colorPicker(name, value) {
  return `<div class="colors">${COLORS.map(
    (c) => `<label style="--c:${c}"><input type="radio" name="${name}" value="${c}"${c === value ? ' checked' : ''}><span></span></label>`,
  ).join('')}</div>`;
}

// Anima um número do zero (ou de `from`) até o valor.
export function countUp(el, to, fmt, ms = 700, from = 0) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Anel de progresso (SVG). value 0–1. Usa o gradiente de progresso do tema.
let ringSeq = 0;
export function ring(value, { size = 44, stroke = 5, label = '' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  const gid = `rg${++ringSeq}`;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(label || Math.round(v * 100) + '%')}">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--g1)"/><stop offset="1" stop-color="var(--g2)"/></linearGradient></defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${stroke}"/>
    <circle class="ring-v" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${gid})" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

// Barra de progresso com o gradiente do tema.
export const bar = (value, { cls = '', label = '' } = {}) =>
  `<div class="bar ${cls}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.max(0, Math.min(1, value || 0)) * 100)}"${label ? ` aria-label="${esc(label)}"` : ''}><i style="width:${Math.max(0, Math.min(1, value || 0)) * 100}%"></i></div>`;

// Estado vazio com ícone, título, texto e ação opcional.
export const empty = ({ ic = 'spark', title, text = '', action = '' }) =>
  `<div class="empty">${icon(ic)}<b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;
