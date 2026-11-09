// Mascote do Lida: o "Lidinho", um bichinho redondo com o Λ do ícone na testa.
// Traço indie (contorno grosso, cores chapadas, um tico torto de propósito). É o mesmo bichinho em
// todos os títulos de nível; muda a roupa, o acessório, a pose e a expressão.
// Aparece só perto do nível: no cartão de nível e no aviso de subida de nível.
import { LEVEL_TITLES, levelTitle } from '../core/model.js';

const INK = '#1B1F2B';
const BODY = '#8C97FF';
const BELLY = '#B8C0FF';
const GOLD = '#F2C14E';
const RED = '#FF6B7A';
const MINT = '#5FE3B5';
const s = (w = 2) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// Por título: acessório (atrás e na frente do corpo), pose dos braços e olhos.
const LOOKS = {
  Aprendiz: { arms: 'down', eyes: 'open', front: sprout },
  Iniciante: { arms: 'down', eyes: 'open', back: packBack, front: packStraps },
  Praticante: { arms: 'wave', eyes: 'open', front: headband },
  Constante: { arms: 'down', eyes: 'happy', front: scarf },
  Disciplinado: { arms: 'down', eyes: 'focus', front: glasses },
  Persistente: { arms: 'wave', eyes: 'focus', front: sash },
  Veterano: { arms: 'down', eyes: 'open', front: beret },
  Especialista: { arms: 'wave', eyes: 'open', front: gradCap },
  Mestre: { arms: 'down', eyes: 'happy', back: (c = RED) => cape(c), front: clasp },
  'Grão-Mestre': { arms: 'wave', eyes: 'open', back: () => cape('#9B7BFF'), front: wizardHat },
  Lenda: { arms: 'both', eyes: 'happy', back: () => cape(RED), front: crown, extra: sparkles },
};

function sprout() {
  return `<path d="M32 18.5 Q31.5 14.5 32.8 12" fill="none" ${s(1.8)}/>
    <path d="M32.8 12.5 Q36.5 8.6 40.6 10.6 Q37.4 15 32.8 12.5 Z" fill="${MINT}" ${s(1.6)}/>
    <path d="M32.4 13.6 Q28.6 10.4 25.6 12.6 Q28.6 16.4 32.4 13.6 Z" fill="${MINT}" ${s(1.6)}/>`;
}
function packBack() {
  return `<rect x="43" y="27" width="10.5" height="17" rx="3.5" fill="#E9A15B" ${s()}/><path d="M45.5 33 h5.5" ${s(1.5)}/>`;
}
function packStraps() {
  return `<path d="M21.5 23.8 Q18.6 33 21 43" fill="none" stroke="#C9783E" stroke-width="2.6" stroke-linecap="round"/><path d="M42.5 23.8 Q45.4 33 43 43" fill="none" stroke="#C9783E" stroke-width="2.6" stroke-linecap="round"/>`;
}
function headband() {
  return `<path d="M16.4 26.4 Q32 13.6 47.6 26.4" fill="none" stroke="${RED}" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M47 25.2 l5.4 -2.6 M47.2 26.6 l5.2 2.4" fill="none" stroke="${RED}" stroke-width="2.2" stroke-linecap="round"/>`;
}
function scarf() {
  return `<path d="M14.6 44.2 Q32 51.4 49.4 44.2" fill="none" stroke="${GOLD}" stroke-width="4.6" stroke-linecap="round"/>
    <path d="M39.5 47.2 l1.8 8.2 l3.6 -1.2 l-1.6 -8" fill="${GOLD}" ${s(1.5)}/>
    <path d="M18 46.2 l2 -1.4 M23 48 l2 -1.6 M28 49 l2 -1.6" ${s(1)} opacity=".45"/>`;
}
function glasses() {
  return `<circle cx="25.8" cy="35.6" r="4.6" fill="#ffffff" fill-opacity=".22" ${s(1.6)}/>
    <circle cx="38.2" cy="35.6" r="4.6" fill="#ffffff" fill-opacity=".22" ${s(1.6)}/>
    <path d="M30.4 35.2 Q32 34 33.6 35.2" fill="none" ${s(1.5)}/>`;
}
function sash() {
  return `<path d="M15.2 42 L45.5 55" fill="none" stroke="${RED}" stroke-width="5" stroke-linecap="round"/>
    <path d="M29.6 45.2 l1.1 2.3 l2.5 .3 l-1.9 1.7 l.5 2.5 l-2.2 -1.3 l-2.2 1.3 l.5 -2.5 l-1.9 -1.7 l2.5 -.3 Z" fill="${GOLD}" ${s(1.1)}/>`;
}
function beret() {
  return `<path d="M22 21.6 Q23 13.4 35 13.6 Q46.6 14 46.4 20.4 Q35 25.2 22 21.6 Z" fill="#3A3F5C" ${s()}/><circle cx="35.5" cy="12.4" r="1.7" fill="#3A3F5C" ${s(1.4)}/>`;
}
function gradCap() {
  return `<path d="M25 18.2 v3.4 Q32 24.6 39 21.6 v-3.4" fill="#2B3047" ${s(1.8)}/>
    <path d="M19.5 16 L32 10.4 L44.5 16 L32 21.6 Z" fill="#2B3047" ${s(1.8)}/>
    <path d="M32 16 L44 17 V23.5" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round"/><circle cx="44" cy="24.4" r="1.6" fill="${GOLD}" ${s(1)}/>`;
}
function cape(c) {
  return `<path d="M17.6 29 Q9.6 46 13.4 58.6 L50.6 58.6 Q54.4 46 46.4 29 Z" fill="${c}" ${s()}/>`;
}
function clasp() {
  return `<circle cx="17.6" cy="30.4" r="2.2" fill="${GOLD}" ${s(1.3)}/><circle cx="46.4" cy="30.4" r="2.2" fill="${GOLD}" ${s(1.3)}/>`;
}
function wizardHat() {
  return `<path d="M19.4 21.8 L33.6 1.8 L45.2 20.6 Q32 25.4 19.4 21.8 Z" fill="#5B4BCF" ${s(1.9)}/>
    <path d="M33 11 l.9 1.9 l2 .2 l-1.5 1.4 l.4 2 l-1.8 -1 l-1.8 1 l.4 -2 l-1.5 -1.4 l2 -.2 Z" fill="${GOLD}" ${s(.9)}/>`;
}
function crown() {
  return `<path d="M21.6 21 L22.6 11.4 L27.4 16.4 L32 9 L36.6 16.4 L41.4 11.4 L42.4 21 Q32 23.6 21.6 21 Z" fill="${GOLD}" ${s(1.8)}/>
    <circle cx="32" cy="17.6" r="1.5" fill="${RED}"/><circle cx="26.2" cy="18.6" r="1.1" fill="${MINT}"/><circle cx="37.8" cy="18.6" r="1.1" fill="${MINT}"/>`;
}
function sparkles() {
  const st = (x, y, r) => `<path d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z" fill="${GOLD}"/>`;
  return st(8.5, 15, 3.6) + st(56, 12, 2.8) + st(57.5, 41, 2.4) + st(6.5, 44, 2);
}

function arms(kind) {
  const arm = (cx, cy, rot) => `<ellipse cx="${cx}" cy="${cy}" rx="2.9" ry="4.6" transform="rotate(${rot} ${cx} ${cy})" fill="${BODY}" ${s()}/>`;
  if (kind === 'wave') return arm(13.6, 42, 28) + arm(50.8, 27.6, -38);
  if (kind === 'both') return arm(13.2, 27.6, 38) + arm(50.8, 27.6, -38);
  return arm(13.6, 42, 28) + arm(50.4, 42, -28);
}

function eyes(kind) {
  if (kind === 'happy') return `<path d="M23.6 36.6 Q25.8 33.4 28 36.6 M36 36.6 Q38.2 33.4 40.4 36.6" fill="none" ${s(1.9)}/>`;
  const e = `<ellipse cx="25.8" cy="35.8" rx="2" ry="2.6" fill="${INK}"/><ellipse cx="38.2" cy="35.8" rx="2" ry="2.6" fill="${INK}"/>
    <circle cx="26.5" cy="34.8" r=".75" fill="#fff"/><circle cx="38.9" cy="34.8" r=".75" fill="#fff"/>`;
  if (kind === 'focus') return `${e}<path d="M22.8 31.4 L28 32.4 M41.2 31.4 L36 32.4" fill="none" ${s(1.7)}/>`;
  return e;
}

export function mascotSvg(title, { size = 56, cls = '' } = {}) {
  const L = LOOKS[title] || LOOKS.Aprendiz;
  return `<svg class="mascot ${cls}" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="Lidinho, ${title}">
    ${L.extra ? L.extra() : ''}
    ${L.back ? L.back() : ''}
    <ellipse cx="25" cy="56.4" rx="4.8" ry="2.7" fill="${BODY}" ${s()}/><ellipse cx="39" cy="56.4" rx="4.8" ry="2.7" fill="${BODY}" ${s()}/>
    ${arms(L.arms)}
    <path d="M32 18 C43.2 17.8 51.4 26.2 51 37.2 C50.6 48.4 42.8 56 32 56 C21 56.2 13 48.4 13 37.6 C13 26.2 21.4 18.2 32 18 Z" fill="${BODY}" ${s(2.2)}/>
    <path d="M24 46 Q32 54.4 40 46 Q36.4 50.6 32 50.8 Q27.4 50.6 24 46 Z" fill="${BELLY}" opacity=".7"/>
    <path d="M29.2 29 L32 23.8 L34.8 29" fill="none" stroke="#F7F8FB" stroke-width="2.1" stroke-linejoin="round" stroke-linecap="round"/>
    ${eyes(L.eyes)}
    <ellipse cx="22.2" cy="40.6" rx="2.6" ry="1.5" fill="#FF8FA8" opacity=".6"/><ellipse cx="41.8" cy="40.6" rx="2.6" ry="1.5" fill="#FF8FA8" opacity=".6"/>
    <path d="M29.4 41 Q32 43.6 34.6 41" fill="none" ${s(1.8)}/>
    ${L.front ? L.front() : ''}
  </svg>`;
}

export const mascotFor = (level, opts) => mascotSvg(levelTitle(level), opts);
export const MASCOT_TITLES = LEVEL_TITLES.map(([min, t]) => ({ min, title: t }));
