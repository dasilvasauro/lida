// Mascote do Lida: o Lidinho, um bichinho redondo com o Λ do ícone na testa.
// Traço indie: contorno grosso, cores chapadas, um tico torto de propósito. É o mesmo bichinho em
// todos os títulos de nível; mudam a roupa, o acessório, a pose, o ângulo (rosto virado de lado,
// de três quartos) e a expressão. Aparece perto do nível: no cartão de nível (um toque abre a
// coleção com os títulos já alcançados e a sombra dos próximos) e no aviso de título novo.
import { LEVEL_TITLES, levelTitle } from '../core/model.js';
import { esc } from '../lib/util.js';

const INK = '#1B1F2B';
const BODY = '#8C97FF';
const BELLY = '#B3BBFF';
const GOLD = '#F2C14E';
const RED = '#FF6B7A';
const MINT = '#5FE3B5';
const BROWN = '#C9783E';
const TAN = '#E9A15B';
const ln = (w = 2) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const R = 19; // raio do corpo

/* ---------- Peças ---------- */
// Braço/perna em cápsula com contorno: duas linhas, a de tinta por baixo.
function limb(pts, color = BODY, w = 5.6) {
  const d = `M${pts.map((p) => p.join(' ')).join(' L')}`;
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 3.6}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const foot = ([x, y, r = 0]) => `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="3.1" transform="rotate(${r} ${x} ${y})" fill="${BODY}" ${ln()}/>`;
const body = (cx, cy) =>
  `<path d="M${cx} ${cy - R} C${cx + 11.4} ${cy - R - 0.2} ${cx + R + 0.4} ${cy - 10.6} ${cx + R} ${cy + 0.4} C${cx + R - 0.4} ${cy + 11.6} ${cx + 11} ${cy + R} ${cx} ${cy + R} C${cx - 11.2} ${cy + R + 0.2} ${cx - R} ${cy + 11.4} ${cx - R} ${cy + 0.6} C${cx - R} ${cy - 11} ${cx - 10.6} ${cy - R - 0.2} ${cx} ${cy - R} Z" fill="${BODY}" ${ln(2.3)}/>`;
const belly = (cx, cy, look) => `<path d="M${cx - 9 + look * 0.6} ${cy + 9.6} Q${cx + look * 0.6} ${cy + 18.4} ${cx + 9 + look * 0.6} ${cy + 9.6} Q${cx + look * 0.6} ${cy + 14.2} ${cx - 9 + look * 0.6} ${cy + 9.6} Z" fill="${BELLY}" opacity=".75"/>`;
const lambda = (x, y) => `<path d="M${x - 2.9} ${y + 2.6} L${x} ${y - 2.6} L${x + 2.9} ${y + 2.6}" fill="none" stroke="#F7F8FB" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;

// Rosto. look: deslocamento do rosto (virado para o lado). gaze: para onde as pupilas olham.
function face(cx, cy, { look = 0, eyes = 'open', mouth = 'smile', gaze = [0, 0], up = 0 } = {}) {
  const fx = cx + look;
  const fy = cy - 1 - up;
  const gap = 6.2 - Math.abs(look) * 0.12; // de lado, os olhos ficam mais juntos
  const L = fx - gap;
  const Rr = fx + gap;
  let e = '';
  if (eyes === 'happy') e = `<path d="M${L - 2.3} ${fy + 1} Q${L} ${fy - 2.4} ${L + 2.3} ${fy + 1} M${Rr - 2.3} ${fy + 1} Q${Rr} ${fy - 2.4} ${Rr + 2.3} ${fy + 1}" fill="none" ${ln(2)}/>`;
  else if (eyes === 'down') e = `<path d="M${L - 2.2} ${fy} Q${L} ${fy + 2} ${L + 2.2} ${fy} M${Rr - 2.2} ${fy} Q${Rr} ${fy + 2} ${Rr + 2.2} ${fy}" fill="none" ${ln(2)}/>`;
  else {
    const [gx, gy] = gaze;
    e = `<ellipse cx="${L + gx}" cy="${fy + gy}" rx="2.1" ry="2.7" fill="${INK}"/><ellipse cx="${Rr + gx}" cy="${fy + gy}" rx="2.1" ry="2.7" fill="${INK}"/>
      <circle cx="${L + gx + 0.7}" cy="${fy + gy - 1}" r=".8" fill="#fff"/><circle cx="${Rr + gx + 0.7}" cy="${fy + gy - 1}" r=".8" fill="#fff"/>`;
    if (eyes === 'focus') e += `<path d="M${L - 3} ${fy - 4.4} L${L + 2.2} ${fy - 3.2} M${Rr + 3} ${fy - 4.4} L${Rr - 2.2} ${fy - 3.2}" fill="none" ${ln(1.8)}/>`;
    if (eyes === 'proud') e += `<path d="M${L - 2.6} ${fy - 4.6} Q${L} ${fy - 5.8} ${L + 2.6} ${fy - 4.8} M${Rr - 2.6} ${fy - 4.8} Q${Rr} ${fy - 5.8} ${Rr + 2.6} ${fy - 4.6}" fill="none" ${ln(1.6)}/>`;
  }
  const my = fy + 5.6;
  const m = {
    smile: `<path d="M${fx - 2.6} ${my} Q${fx} ${my + 2.6} ${fx + 2.6} ${my}" fill="none" ${ln(1.9)}/>`,
    grin: `<path d="M${fx - 3.4} ${my - 0.4} Q${fx} ${my + 0.6} ${fx + 3.4} ${my - 0.4} Q${fx} ${my + 5.4} ${fx - 3.4} ${my - 0.4} Z" fill="#7A2E3B" ${ln(1.7)}/>`,
    o: `<ellipse cx="${fx}" cy="${my + 0.6}" rx="1.5" ry="1.9" fill="#7A2E3B" ${ln(1.5)}/>`,
    flat: `<path d="M${fx - 2.4} ${my + 0.6} L${fx + 2.4} ${my + 0.2}" fill="none" ${ln(1.9)}/>`,
    smirk: `<path d="M${fx - 2.6} ${my + 0.4} Q${fx + 0.6} ${my + 2} ${fx + 3} ${my - 0.8}" fill="none" ${ln(1.9)}/>`,
  }[mouth];
  const cheeks = `<ellipse cx="${L - 3.2}" cy="${fy + 4.4}" rx="2.6" ry="1.5" fill="#FF8FA8" opacity=".6"/><ellipse cx="${Rr + 3.2}" cy="${fy + 4.4}" rx="2.6" ry="1.5" fill="#FF8FA8" opacity=".6"/>`;
  return cheeks + e + m;
}

const star = (x, y, r, fill = GOLD, w = 1.1) => {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    p.push(`${(x + Math.cos(a) * rr).toFixed(2)} ${(y + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `<path d="M${p.join(' L')} Z" fill="${fill}" ${ln(w)}/>`;
};
const twinkle = (x, y, r, c = GOLD) => `<path d="M${x} ${y - r} Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y} Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r} Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y} Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r} Z" fill="${c}"/>`;

/* ---------- Poses ---------- */
// Cada pose devolve as camadas: sombra, atrás, corpo inteiro e na frente. Coordenadas num quadro 80×80,
// chão em y≈71. `tilt` inclina o bichinho todo em torno dos pés.
const POSES = {
  // Recém-chegado, olhando para o broto que nasceu na cabeça.
  Aprendiz: () => {
    const cx = 40, cy = 47;
    return {
      cx, cy, tilt: -4,
      far: limb([[24, 52], [19, 59]]),
      feet: [[33, 68, 6], [47, 68, -6]],
      face: face(cx, cy, { look: 2, gaze: [0.6, -1.4], mouth: 'o', up: -1 }),
      top: `<path d="M41 28.6 Q40.2 23 42.2 19.4" fill="none" ${ln(1.9)}/>
        <path d="M42.2 20 Q47 14.6 52.6 17 Q48.4 23 42.2 20 Z" fill="${MINT}" ${ln(1.7)}/>
        <path d="M41.6 21.6 Q36.6 17.4 32.6 20.4 Q36.6 25.2 41.6 21.6 Z" fill="${MINT}" ${ln(1.7)}/>`,
      near: limb([[56, 46], [61, 38], [57, 33]]),
      fx: twinkle(58, 14, 2.4, MINT) + twinkle(25, 22, 1.8, MINT),
    };
  },
  // De três quartos, caminhando com a mochila nas costas (a mochila aparece de lado).
  Iniciante: () => {
    const cx = 41, cy = 47;
    return {
      cx, cy, tilt: 5,
      back: `<path d="M27 32 Q15 31 14.4 42 L14.6 56 Q15 63 22.6 63 L28 63 Z" fill="${TAN}" ${ln(2.1)}/>
        <path d="M14.6 44 Q20 41.6 26 44" fill="none" ${ln(1.6)}/><rect x="16.4" y="49" width="7.4" height="7" rx="2" fill="#F3BD80" ${ln(1.5)}/>
        <path d="M20.6 31.6 Q20 27.4 24.4 27.6" fill="none" ${ln(1.8)}/>`,
      feet: [[30, 68.4, 18], [53, 68, -16]],
      face: face(cx, cy, { look: 4.5, mouth: 'smile' }),
      near: `<path d="M27.6 33 Q33.6 44 28.4 60" fill="none" stroke="${BROWN}" stroke-width="3.2" stroke-linecap="round"/>` + limb([[56.6, 56], [63, 62]]),
      fx: `<path d="M5 44 h5 M3.6 50 h6 M5.6 56 h4" ${ln(1.6)} opacity=".5"/>`,
    };
  },
  // Correndo, inclinado para a frente, com faixa na testa e uma gota de suor.
  Praticante: () => {
    const cx = 40, cy = 44;
    return {
      cx, cy, tilt: 12, shadow: 0.8,
      far: limb([[25, 47], [17, 53]]),
      feet: [[27, 63, 34], [54, 66, -26]],
      face: face(cx, cy, { look: 5, eyes: 'focus', mouth: 'grin' }),
      top: `<path d="M22.4 35.4 Q40 22 58 35.4" fill="none" stroke="${RED}" stroke-width="4" stroke-linecap="round"/>
        <path d="M23.4 35 Q16 33.6 11 36.4 M23.6 36.6 Q17 39 12.6 43" fill="none" stroke="${RED}" stroke-width="2.6" stroke-linecap="round"/>`,
      near: limb([[56, 45], [63, 40], [64, 34]]),
      fx: `<path d="M63 22 Q61 26.4 63 27.6 Q65.4 26.4 63 22 Z" fill="#9FD8FF" ${ln(1.3)}/><path d="M6 50 h6 M8 57 h5" ${ln(1.6)} opacity=".5"/>`,
    };
  },
  // Tranquilo, acenando, com o cachecol balançando ao vento.
  Constante: () => {
    const cx = 39, cy = 47;
    return {
      cx, cy, tilt: -3,
      far: limb([[23, 52], [19, 59]]),
      feet: [[32, 68, 4], [46, 67.4, -14]],
      face: face(cx, cy, { look: -3, eyes: 'happy', mouth: 'smile' }),
      near: `<path d="M21 55 Q39 63 57 55" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>
        <path d="M49 58 Q60 57 66 50 Q67.6 55.6 72 54 Q66 63 52 62 Z" fill="${GOLD}" ${ln(1.6)}/>
        <path d="M25 57 l2 -1.6 M31 59 l2 -1.6 M37 60 l2 -1.6 M43 60 l2 -1.6" ${ln(1.1)} opacity=".4"/>` + limb([[55, 44], [62, 35], [60, 29]]),
      fx: `<path d="M64 22 q3 -1 4 2 q-3 1.4 -4 -2 Z" fill="${MINT}" ${ln(1.2)}/><path d="M66 30 q4 -1 6 1" fill="none" ${ln(1.3)} opacity=".45"/>`,
    };
  },
  // De lado, lendo um livro com os óculos na ponta do nariz.
  Disciplinado: () => {
    const cx = 41, cy = 47;
    const fx = cx - 5;
    return {
      cx, cy, tilt: -2,
      feet: [[34, 68, 0], [48, 68, 0]],
      face: face(cx, cy, { look: -5, eyes: 'down', mouth: 'smile' }) +
        `<circle cx="${fx - 6}" cy="45.6" r="4.6" fill="#fff" fill-opacity=".2" ${ln(1.6)}/><circle cx="${fx + 6}" cy="45.6" r="4.6" fill="#fff" fill-opacity=".2" ${ln(1.6)}/><path d="M${fx - 1.4} 45.2 Q${fx} 44.2 ${fx + 1.4} 45.2 M${fx + 10.6} 45 L${cx + 17} 42.6" fill="none" ${ln(1.5)}/>`,
      near: limb([[24, 52], [28, 58]]) + limb([[57, 52], [52, 58]]) +
        `<path d="M25 56 L40 59.4 L40 69 L25 65.6 Z" fill="#fff" ${ln(1.8)}/><path d="M55 56 L40 59.4 L40 69 L55 65.6 Z" fill="#F4F1E8" ${ln(1.8)}/>
        <path d="M28 59.6 l9 2 M28 62.4 l9 2 M43 61.6 l9 -2 M43 64.4 l7 -1.6" ${ln(1)} opacity=".45"/><path d="M25.6 65.8 L40 69.6 L54.4 65.8" fill="none" stroke="${RED}" stroke-width="1.6"/>`,
    };
  },
  // Determinado, mostrando o "muque", com a faixa de honra.
  Persistente: () => {
    const cx = 39, cy = 47;
    return {
      cx, cy, tilt: 0,
      far: limb([[23, 51], [17, 55], [21, 60]]),
      feet: [[31, 68, 8], [48, 68, -8]],
      face: face(cx, cy, { look: 1, eyes: 'focus', mouth: 'flat' }),
      near: `<path d="M21.4 52.6 L54 64.6" fill="none" stroke="${RED}" stroke-width="5.4" stroke-linecap="round"/>${star(37, 58.6, 3.6)}` +
        limb([[55, 47], [64, 45], [64.6, 35]], BODY, 6.2) + `<circle cx="64.8" cy="33.2" r="4" fill="${BODY}" ${ln(2)}/>`,
      fx: `<path d="M70 27 l3 -2.4 M71.6 33 h3.6 M69 22 l1.4 -3.4" ${ln(1.6)}/>`,
    };
  },
  // Explorador experiente: boina, cajado de caminhada e olhar para o horizonte.
  Veterano: () => {
    const cx = 42, cy = 47;
    return {
      cx, cy, tilt: -4,
      far: limb([[58, 52], [62, 58]]),
      feet: [[35, 68, 6], [50, 68, -4]],
      face: face(cx, cy, { look: -6, mouth: 'smile', gaze: [-0.8, 0] }) + `<path d="M${cx - 10} 51.6 q2 1.8 4 0 q2 1.8 4 0" fill="none" stroke="#6B5B4A" stroke-width="1.8" stroke-linecap="round"/>`,
      top: `<path d="M27 33.4 Q28 23.6 43 24 Q57.6 24.6 57 32 Q43 37.6 27 33.4 Z" fill="#3A3F5C" ${ln(2)}/><path d="M43.6 23.6 l1 -3.4" ${ln(2)}/>`,
      near: `<path d="M17.6 32 L15 71" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M17.6 32 L15 71" stroke="#A86E3C" stroke-width="2.6" stroke-linecap="round"/><circle cx="17.8" cy="31" r="2.6" fill="#A86E3C" ${ln(1.6)}/>` + limb([[25, 49], [18, 45]]),
    };
  },
  // Formatura! Pulando com o diploma erguido e o capelo meio torto.
  Especialista: () => {
    const cx = 40, cy = 41;
    return {
      cx, cy, tilt: 6, shadow: 0.62,
      far: limb([[24, 42], [16, 34]]),
      feet: [[33, 61, 24], [47, 61.4, -20]],
      face: face(cx, cy, { look: 2, eyes: 'happy', mouth: 'grin' }),
      top: `<path d="M31 26 v4 Q40 33.6 49 30 v-4" fill="#2B3047" ${ln(1.9)}/><path d="M24 23.6 L40 16.4 L56 23.6 L40 30.8 Z" fill="#2B3047" ${ln(1.9)}/>
        <path d="M40 23.6 L54.6 24.6 V32" fill="none" stroke="${GOLD}" stroke-width="1.8" stroke-linecap="round"/><circle cx="54.6" cy="33" r="1.8" fill="${GOLD}" ${ln(1.1)}/>`,
      near: limb([[56, 40], [62, 30]]) + `<rect x="55" y="21.4" width="17" height="6" rx="3" fill="#F6F1E4" ${ln(1.7)}/><path d="M63.4 21.4 v6" stroke="${RED}" stroke-width="2"/><path d="M63.4 27.4 l-1.6 4 M63.4 27.4 l1.8 3.8" stroke="${RED}" stroke-width="1.6" stroke-linecap="round"/>`,
      fx: twinkle(12, 22, 2.6) + twinkle(70, 44, 2) + twinkle(20, 12, 1.6, MINT),
    };
  },
  // Herói: mãos na cintura, queixo erguido e a capa esvoaçando para o lado.
  Mestre: () => {
    const cx = 40, cy = 46;
    return {
      cx, cy, tilt: 0,
      back: `<path d="M26 33 Q12 45 6 64 Q12 62 15 66 Q19 61 24 66 Q29 62 33 67 L52 67 Q56 50 54 33 Z" fill="${RED}" ${ln(2)}/><path d="M26 33 Q15 46 11 60" fill="none" ${ln(1.2)} opacity=".35"/>`,
      feet: [[30, 68, 10], [51, 68, -10]],
      face: face(cx, cy, { look: 3, eyes: 'proud', mouth: 'smirk', up: 1.6 }),
      near: limb([[24.4, 54], [16.4, 57.4], [23.4, 62]]) + limb([[55.6, 54], [63.6, 57.4], [56.6, 62]]),
      fx: twinkle(66, 20, 2.2),
    };
  },
  // Lançando um feitiço: chapéu de mago, cajado com estrela e faíscas saindo da mão.
  'Grão-Mestre': () => {
    const cx = 41, cy = 47;
    return {
      cx, cy, tilt: -3,
      back: `<path d="M27 34 Q14 49 13 67 L58 67 Q60 50 55 34 Z" fill="#9B7BFF" ${ln(2)}/>`,
      feet: [[34, 68, 4], [48, 68, -4]],
      face: face(cx, cy, { look: -3, eyes: 'focus', mouth: 'o' }),
      top: `<path d="M24.4 33 Q31 21 34 13 Q38 4.4 50 7.6 Q42 9.6 44.6 17 Q48 25 56.4 32 Q40 37 24.4 33 Z" fill="#5B4BCF" ${ln(2)}/>${star(39, 24, 3)}<path d="M27.4 31 Q40 34.4 54 30" fill="none" stroke="${GOLD}" stroke-width="2"/>`,
      near: `<path d="M64 26 L60 71" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M64 26 L60 71" stroke="#7B5A3A" stroke-width="2.6" stroke-linecap="round"/>${star(64.4, 21.6, 5.2)}` +
        limb([[56, 49], [62, 43]]) + limb([[25, 47], [15, 42]]),
      fx: twinkle(8, 37, 2.8) + twinkle(11, 46, 1.8, MINT) + twinkle(5, 29, 1.6, '#C9B8FF') + `<circle cx="72" cy="15" r="1.4" fill="${GOLD}"/><circle cx="57" cy="15" r="1" fill="${GOLD}"/>`,
    };
  },
  // Lenda: salto de alegria, coroa, capa e confete.
  Lenda: () => {
    const cx = 40, cy = 40;
    return {
      cx, cy, tilt: 0, shadow: 0.55,
      back: `<path d="M26 28 Q10 40 7 58 Q14 55 17 60 Q22 54 27 59 L53 59 Q58 54 63 60 Q66 55 73 58 Q70 40 54 28 Z" fill="${RED}" ${ln(2)}/>`,
      far: '',
      feet: [[33, 60, 20], [47, 60, -20]],
      face: face(cx, cy, { eyes: 'happy', mouth: 'grin' }),
      top: `<path d="M28.4 25 L29.4 13.4 L34.6 19 L40 10.4 L45.4 19 L50.6 13.4 L51.6 25 Q40 28.4 28.4 25 Z" fill="${GOLD}" ${ln(1.9)}/>
        <circle cx="40" cy="20.6" r="1.7" fill="${RED}"/><circle cx="33.6" cy="21.8" r="1.2" fill="${MINT}"/><circle cx="46.4" cy="21.8" r="1.2" fill="${MINT}"/>`,
      near: limb([[24, 37], [15, 25]]) + limb([[56, 37], [65, 25]]),
      fx: twinkle(8, 14, 3.2) + twinkle(72, 12, 2.6) + twinkle(74, 44, 2.2) + twinkle(6, 46, 2) +
        `<rect x="18" y="6" width="3" height="5" rx="1" fill="${MINT}" transform="rotate(20 19 8)"/><rect x="60" y="4" width="3" height="5" rx="1" fill="${RED}" transform="rotate(-25 61 6)"/><rect x="70" y="28" width="3" height="5" rx="1" fill="#9FD8FF" transform="rotate(35 71 30)"/><rect x="5" y="30" width="3" height="5" rx="1" fill="${GOLD}" transform="rotate(-15 6 32)"/>`,
    };
  },
};

export function mascotSvg(title, { size = 56, cls = '', locked = false } = {}) {
  const pose = (POSES[title] || POSES.Aprendiz)();
  const { cx, cy, tilt = 0, shadow = 1 } = pose;
  const sh = `<ellipse cx="40" cy="72" rx="${(17 * shadow).toFixed(1)}" ry="${(2.6 * shadow).toFixed(1)}" fill="${INK}" opacity="${locked ? 0.5 : 0.16}"/>`;
  const fig = `<g transform="rotate(${tilt} 40 70)">
      ${pose.back || ''}${pose.far || ''}
      ${pose.feet.map(foot).join('')}
      ${body(cx, cy)}${belly(cx, cy, lookOf(title))}
      ${lambda(cx + lookOf(title), cy - 11.6)}
      ${pose.face}
      ${pose.top || ''}
      ${pose.near || ''}
    </g>`;
  const label = locked ? 'Lidinho escondido: título ainda não alcançado' : `Lidinho, ${title}`;
  return `<svg class="mascot${locked ? ' locked' : ''} ${cls}" viewBox="0 0 80 80" width="${size}" height="${size}" role="img" aria-label="${esc(label)}">
    ${locked ? '' : pose.fx || ''}${sh}${fig}</svg>`;
}
// O Λ acompanha o rosto quando ele está virado.
const LOOK = { Aprendiz: 2, Iniciante: 4.5, Praticante: 5, Constante: -3, Disciplinado: -5, Persistente: 1, Veterano: -6, Especialista: 2, Mestre: 3, 'Grão-Mestre': -3, Lenda: 0 };
const lookOf = (t) => (LOOK[t] || 0) * 0.85;

export const mascotFor = (level, opts) => mascotSvg(levelTitle(level), opts);

/* ---------- Coleção (ao tocar no Lidinho) ---------- */
export const MASCOT_TEXT = {
  Aprendiz: 'Tudo começa com um broto. O Lidinho acabou de chegar e está curioso com tudo: cada tarefa concluída é uma descoberta.',
  Iniciante: 'Mochila nas costas e pé na estrada. Os primeiros hábitos já estão a caminho de virar rotina.',
  Praticante: 'Faixa na testa e fôlego em dia. Praticar um pouco todo dia é o que transforma esforço em costume.',
  Constante: 'Nem pressa, nem pausa. O vento muda, o cachecol balança, e o Lidinho segue no ritmo dele.',
  Disciplinado: 'Óculos no rosto e foco no que importa. Disciplina é fazer o combinado mesmo nos dias sem vontade.',
  Persistente: 'Caiu? Levanta. A faixa de honra é para quem não desiste nos dias difíceis.',
  Veterano: 'Boina, cajado e muitas histórias. Já viu dias bons, dias ruins e muitos recomeços.',
  Especialista: 'Capelo e diploma na mão! O Lidinho domina a arte de transformar plano em feito.',
  Mestre: 'Capa ao vento e mãos na cintura. Agora o Lidinho inspira quem está começando.',
  'Grão-Mestre': 'Cajado erguido e estrela na ponta. A essa altura, produtividade parece mágica (mas é treino).',
  Lenda: 'Coroa, capa e confete. Poucos chegam até aqui: o Lidinho virou lenda, e você também.',
};

export function mascotCollection(level) {
  const cur = levelTitle(level);
  return `<div class="mascot-col">${LEVEL_TITLES.map(([min, t]) => {
    const have = level >= min;
    const now = t === cur;
    return `<article class="mc-item${have ? '' : ' locked'}${now ? ' now' : ''}"${now ? ' data-now' : ''}>
      <div class="mc-art">${mascotSvg(t, { size: 84, locked: !have })}</div>
      <div class="mc-txt">${have ? `<h3>${esc(t)}${now ? '<span class="mc-tag">Você está aqui</span>' : ''}</h3><small>A partir do nível ${min}</small><p>${esc(MASCOT_TEXT[t])}</p>` : `<h3 class="mc-hidden" aria-label="Título escondido">? ? ?</h3><small>Libera no nível ${min}</small>`}</div>
    </article>`;
  }).join('')}</div>`;
}
