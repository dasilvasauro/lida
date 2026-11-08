// Gráficos em SVG desenhados à mão, com as cores do tema.
// Regras (mesmas em todos): barras finas (até 24 px) com ponta arredondada e base reta,
// linha de 2 px, grade em fio fino e discreta, um rótulo só no que importa, texto sempre
// nas cores de texto (nunca na cor da série) e dica ao passar o dedo/mouse ou focar.
import { esc } from '../lib/util.js';

/* ---------- Dica flutuante (uma para todos os gráficos) ---------- */
let tipEl = null;
function showTip(target) {
  const text = target.getAttribute('data-tip');
  if (!text) return;
  tipEl ||= Object.assign(document.createElement('div'), { className: 'chart-tip', role: 'status' });
  if (!tipEl.isConnected) document.body.appendChild(tipEl);
  const [value, label] = text.split('|');
  tipEl.replaceChildren();
  const b = document.createElement('b');
  b.textContent = value;
  tipEl.appendChild(b);
  if (label) {
    const s = document.createElement('span');
    s.textContent = label;
    tipEl.appendChild(s);
  }
  const r = target.getBoundingClientRect();
  tipEl.style.left = `${Math.min(window.innerWidth - 12, Math.max(12, r.left + r.width / 2))}px`;
  tipEl.style.top = `${r.top - 8}px`;
  tipEl.classList.add('on');
  target.classList.add('hot');
}
function hideTip(target) {
  tipEl?.classList.remove('on');
  target?.classList?.remove('hot');
}
export function initChartTips() {
  const on = (e) => {
    const t = e.target.closest?.('[data-tip]');
    if (t) showTip(t);
  };
  const off = (e) => {
    const t = e.target.closest?.('[data-tip]');
    if (t) hideTip(t);
  };
  document.addEventListener('pointerover', on);
  document.addEventListener('pointerout', off);
  document.addEventListener('focusin', on);
  document.addEventListener('focusout', off);
  window.addEventListener('scroll', () => hideTip(document.querySelector('[data-tip].hot')), { passive: true });
}

const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
};
const tick = (n) => (n >= 10000 ? `${Math.round(n / 1000)} mil` : n.toLocaleString('pt-BR'));

/* ---------- Colunas ---------- */
// data: [{ label, value, tip }] — label curto para o eixo (só alguns aparecem).
export function columns(data, { height = 132, unit = '', every = 1, ariaLabel = '' } = {}) {
  const W = 320;
  const H = height;
  const top = 16;
  const bottom = 20;
  const left = 30;
  const plotW = W - left - 4;
  const plotH = H - top - bottom;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const band = plotW / Math.max(1, data.length);
  const bw = Math.min(24, Math.max(4, band - 4));
  const y = (v) => top + plotH - (v / max) * plotH;
  const grid = [0, max / 2, max]
    .map((g) => `<line x1="${left}" x2="${W - 4}" y1="${y(g)}" y2="${y(g)}" class="ch-grid"/><text x="${left - 6}" y="${y(g) + 3.5}" class="ch-tick" text-anchor="end">${tick(g)}</text>`)
    .join('');
  let best = -1;
  data.forEach((d, i) => (best = d.value > (data[best]?.value ?? 0) ? i : best));
  const bars = data
    .map((d, i) => {
      const x = left + i * band + (band - bw) / 2;
      const h = Math.max(0, (d.value / max) * plotH);
      const r = Math.min(4, h, bw / 2);
      const y0 = top + plotH;
      const path = h > 0 ? `M${x},${y0} V${y0 - h + r} Q${x},${y0 - h} ${x + r},${y0 - h} H${x + bw - r} Q${x + bw},${y0 - h} ${x + bw},${y0 - h + r} V${y0} Z` : '';
      const lab = i % every === 0 || i === data.length - 1 ? `<text x="${x + bw / 2}" y="${H - 5}" class="ch-tick" text-anchor="middle">${esc(d.label)}</text>` : '';
      const peak = i === best && d.value > 0 ? `<text x="${x + bw / 2}" y="${y0 - h - 5}" class="ch-val" text-anchor="middle">${tick(d.value)}${unit}</text>` : '';
      // Área de toque maior que a barra.
      return `<g class="ch-col" tabindex="0" data-tip="${esc(d.tip)}"><rect x="${left + i * band}" y="${top}" width="${band}" height="${plotH}" class="ch-hit"/>${path ? `<path d="${path}" class="ch-bar"/>` : `<rect x="${x}" y="${y0 - 1}" width="${bw}" height="1" class="ch-zero"/>`}${peak}</g>${lab}`;
    })
    .join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ariaLabel)}">${grid}${bars}</svg>`;
}

/* ---------- Linha (0–100) ---------- */
export function line(points, { height = 132, min = 0, max = 100, ariaLabel = '', fmt = (v) => String(v) } = {}) {
  const W = 320;
  const H = height;
  const top = 14;
  const bottom = 20;
  const left = 30;
  const right = 30;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const n = Math.max(1, points.length - 1);
  const x = (i) => left + (i / n) * plotW;
  const y = (v) => top + plotH - ((v - min) / (max - min)) * plotH;
  const grid = [min, (min + max) / 2, max].map((g) => `<line x1="${left}" x2="${W - right}" y1="${y(g)}" y2="${y(g)}" class="ch-grid"/><text x="${left - 6}" y="${y(g) + 3.5}" class="ch-tick" text-anchor="end">${g}</text>`).join('');
  if (!points.length) return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ariaLabel)}">${grid}</svg>`;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${d} L${x(points.length - 1).toFixed(1)},${top + plotH} L${x(0)},${top + plotH} Z`;
  const last = points[points.length - 1];
  const dots = points.map((p, i) => `<g class="ch-pt" tabindex="0" data-tip="${esc(p.tip)}"><circle cx="${x(i)}" cy="${y(p.value)}" r="9" class="ch-hit"/><circle cx="${x(i)}" cy="${y(p.value)}" r="${i === points.length - 1 ? 4 : 2.5}" class="ch-dot"/></g>`).join('');
  const labs = [0, points.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => `<text x="${x(i)}" y="${H - 5}" class="ch-tick" text-anchor="${i ? 'end' : 'start'}">${esc(points[i].label)}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ariaLabel)}">${grid}<path d="${area}" class="ch-area"/><path d="${d}" class="ch-line"/>${dots}<text x="${x(points.length - 1) + 8}" y="${y(last.value) + 4}" class="ch-val">${esc(fmt(last.value))}</text>${labs}</svg>`;
}

/* ---------- Calendário de constância ---------- */
// cells: [{ date, v: 0..1 | null (sem hábitos naquele dia), tip }], já em ordem, começando num domingo.
export function heat(cells, { ariaLabel = '' } = {}) {
  const size = 11;
  const gap = 3;
  const weeks = Math.ceil(cells.length / 7);
  const W = weeks * (size + gap);
  const H = 7 * (size + gap);
  const lvl = (v) => (v == null ? 'n' : v <= 0 ? 0 : v < 0.34 ? 1 : v < 0.67 ? 2 : v < 1 ? 3 : 4);
  const rects = cells
    .map((c, i) => {
      const w = Math.floor(i / 7);
      const d = i % 7;
      return `<rect x="${w * (size + gap)}" y="${d * (size + gap)}" width="${size}" height="${size}" rx="3" class="hm hm-${lvl(c.v)}" tabindex="-1" data-tip="${esc(c.tip)}"/>`;
    })
    .join('');
  return `<div class="heat-wrap"><svg class="heat" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(ariaLabel)}">${rects}</svg></div>
    <div class="heat-key" aria-hidden="true"><span>Menos</span>${[0, 1, 2, 3, 4].map((k) => `<i class="hm-${k}"></i>`).join('')}<span>Mais</span></div>`;
}
