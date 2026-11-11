// Mascote do Lida: o Lidinho, um bichinho redondo e azul-lavanda. Um desenho por título de nível
// (icons/lidinho/<título>.webp, fundo transparente). Aparece perto do nível: no cartão de nível
// (um toque abre a coleção com os títulos já alcançados e a sombra dos próximos), no avatar e no
// aviso de título novo. Os títulos ainda não alcançados aparecem só como silhueta (filtro no CSS).
import { LEVEL_TITLES, levelTitle } from '../core/model.js';
import { esc } from '../lib/util.js';

// Nome do arquivo de cada título (sem acento).
export const slugOf = (title) =>
  String(title || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
const known = new Set(LEVEL_TITLES.map(([, t]) => t));
export const mascotSrc = (title) => `icons/lidinho/${slugOf(known.has(title) ? title : LEVEL_TITLES[0][1])}.webp`;

// Mantém o nome antigo (era SVG desenhado no código): devolve a imagem do título.
export function mascotSvg(title, { size = 56, cls = '', locked = false } = {}) {
  const label = locked ? 'Lidinho escondido: título ainda não alcançado' : `Lidinho, ${title}`;
  return `<img class="mascot${locked ? ' locked' : ''} ${cls}" src="${mascotSrc(title)}" width="${size}" height="${size}" alt="${esc(label)}" draggable="false" decoding="async">`;
}
export const mascotImg = mascotSvg;

export const mascotFor = (level, opts) => mascotSvg(levelTitle(level), opts);

/* ---------- Coleção (ao tocar no Lidinho) ---------- */
export const MASCOT_TEXT = {
  Neófito:
    'Acabou de brotar. Tem uma lista grande demais, uma fé enorme no "amanhã eu faço tudo" e nenhuma ideia de onde enfiar aquela tarefa que apareceu agora. A missão é uma só: anotar o que aparece e riscar a primeira. Parabéns, você já é mais produtivo que ontem.',
  Iniciado:
    'Descobriu que tarefa sem data vira lenda urbana na Entrada e que nem tudo é P0, por mais urgente que pareça às 23h. Agora você prioriza: primeiro o que importa, depois o que é gostoso de riscar.',
  Diligente:
    'Fase dos fundamentos: blocos de foco, pausa que é pausa de verdade e a regra dos dois minutos (se leva menos que isso, faz agora). Você descobriu que produtividade é treino, não talento. Os músculos do foco agradecem.',
  Perseverante:
    'A sequência quebrou? Acontece com todo mundo, inclusive com quem vende curso. A regra de ouro é não falhar dois dias seguidos. Perseverar não é nunca cair, é levantar antes de a culpa terminar de carregar.',
  Erudito:
    'Você leu sobre GTD, Pomodoro, matriz de Eisenhower e aquele método com nome em japonês. Melhor ainda: testou e ficou só com o que funciona para você. Conhecimento bom é o que vira hábito, não o que vira marcador no navegador.',
  Obstinado:
    'Motivação é visita; disciplina é quem mora na casa. Você faz o combinado mesmo sem vontade, e "depois eu vejo" agora tem prazo de validade. Teimosia, quando aponta para o lado certo, tem outro nome: método.',
  Calejado:
    'Sobreviveu a semanas caóticas, revisões semanais esquecidas e caixas de entrada que pareciam infinitas. Os calos provam: o melhor sistema é o que você usa, não o que você planeja usar desde março.',
  Virtuoso:
    'Capturar, organizar, priorizar, executar: o fluxo virou reflexo. Você diz não ao que não importa sem pedir desculpas e protege o tempo de trabalho profundo como quem protege a última fatia de pizza.',
  Mestre:
    'Produtividade aqui não é fazer mais, é fazer o que importa e ainda sobrar tempo. Menos tarefas, mais impacto. O você do nível 1 não acreditaria, e provavelmente ainda estaria reorganizando a lista.',
  Lifehacker:
    'Atalhos, automações, modelos, rotinas que se montam sozinhas: você otimiza até o jeito de otimizar. Só cuidado para não passar a tarde ajustando o sistema em vez de usar. (Sim, todo lifehacker já fez isso.)',
  Ancestral:
    'Você já viu metodologias nascerem, virarem moda e sumirem. Sabe que nenhum app faz o trabalho por você (nem este) e que descanso também entra no plano. Os mais novos chamam de sabedoria; você chama de "já errei isso antes".',
  Soberano:
    'Cinquenta níveis de tarefas feitas, hábitos mantidos e prazos respeitados. Seu tempo responde a você, não o contrário. Não existe próximo título: o desafio agora é manter o ritmo sem perder a graça. Soberano também tira folga.',
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
