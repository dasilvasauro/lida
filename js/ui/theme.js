// Temas e fontes.
//
// Cada tema é uma paleta completa por FUNÇÃO, não um conjunto de cores soltas:
//   bg, surface, surface2, surface3   fundo e três níveis de superfície (cartões, campos, realces)
//   line                              divisórias e bordas
//   text, muted, dim                  texto principal, secundário e terciário
//   accent, onAccent                  ação principal (botões, seleção, links) e o texto sobre ela
//   g1 → g2                           o único gradiente do app, reservado ao que mede progresso
//                                     (XP, sprints, metas de hábito e água)
//   pos, neg, warn                    concluído/ganho, falha/perda, atenção
//   p0..p4                            cores das prioridades (P0 crítica … P4 sem prioridade)
//   nav (opcional)                    barra lateral do computador com cor própria (ex.: Tumbleweed):
//                                     { bg, text, muted, dim, line, hover }
// Todas as combinações de texto foram escolhidas para contraste legível (≥ 4.5:1 para text e muted).

const T = {
  grafite: {
    name: 'Grafite', scheme: 'dark',
    bg: '#0f1217', surface: '#151920', surface2: '#1c212a', surface3: '#242a35', line: '#262c36',
    text: '#e8ebf0', muted: '#9aa2b0', dim: '#5d6573',
    accent: '#8b98ff', onAccent: '#0f1217', g1: '#7c8cff', g2: '#5fe3b5',
    pos: '#5fe3b5', neg: '#f2716b', warn: '#f2c14e',
    p0: '#ff5c7a', p1: '#ff9f43', p2: '#5aa9ff', p3: '#8b93a1', p4: '#5d6573',
  },
  claro: {
    name: 'Claro', scheme: 'light',
    bg: '#f5f6f8', surface: '#ffffff', surface2: '#eef0f4', surface3: '#e3e6ec', line: '#e1e4ea',
    text: '#12151b', muted: '#545c6a', dim: '#8b93a1',
    accent: '#4f5fe8', onAccent: '#ffffff', g1: '#5b6cf0', g2: '#12a57f',
    pos: '#0e8f6a', neg: '#d64545', warn: '#a87a06',
    p0: '#d92d4c', p1: '#d4690f', p2: '#2f7fe0', p3: '#6b7382', p4: '#a4abb7',
  },
  amoled: {
    name: 'AMOLED', scheme: 'dark', unlock: { level: 1 },
    bg: '#000000', surface: '#0b0b0d', surface2: '#141417', surface3: '#1e1e22', line: '#1f1f24',
    text: '#f2f2f4', muted: '#a0a0aa', dim: '#5c5c66',
    accent: '#a3adff', onAccent: '#000000', g1: '#8b98ff', g2: '#62e8bb',
    pos: '#62e8bb', neg: '#ff7b74', warn: '#f5c84f',
    p0: '#ff5c7a', p1: '#ffa24a', p2: '#62aeff', p3: '#8e8e98', p4: '#5c5c66',
  },
  // AMOLED com azul bem vivo: preto puro e destaque azul elétrico.
  eletrico: {
    name: 'AMOLED Azul', scheme: 'dark', unlock: { level: 1 },
    bg: '#000000', surface: '#06080c', surface2: '#0d1118', surface3: '#151b26', line: '#172030',
    text: '#f2f6ff', muted: '#9aa7c0', dim: '#56627a',
    accent: '#1f8bff', onAccent: '#000000', g1: '#0066ff', g2: '#00d2ff',
    pos: '#00e0a4', neg: '#ff4d6a', warn: '#ffc233',
    p0: '#ff4d6a', p1: '#ff9a3c', p2: '#2ea8ff', p3: '#8a94a8', p4: '#56627a',
  },
  suave: {
    name: 'Suave', scheme: 'dark', unlock: { level: 10 },
    bg: '#18181b', surface: '#202024', surface2: '#27272b', surface3: '#313136', line: '#323238',
    text: '#ececef', muted: '#a6a6b0', dim: '#6c6c76',
    accent: '#c4b5fd', onAccent: '#18181b', g1: '#a78bfa', g2: '#f0abfc',
    pos: '#86efac', neg: '#fca5a5', warn: '#fcd34d',
    p0: '#fb7185', p1: '#fdba74', p2: '#93c5fd', p3: '#a1a1aa', p4: '#6c6c76',
  },
  manteiga: {
    name: 'Manteiga', scheme: 'light', unlock: { level: 20 },
    bg: '#fbf6e9', surface: '#fffdf6', surface2: '#f4ecd6', surface3: '#ebdfbf', line: '#e7dcbd',
    text: '#2b2414', muted: '#6b5d3c', dim: '#a39673',
    accent: '#b45309', onAccent: '#fffdf6', g1: '#d97706', g2: '#65a30d',
    pos: '#4d7c0f', neg: '#c2410c', warn: '#a16207',
    p0: '#be123c', p1: '#c2410c', p2: '#1d6fb8', p3: '#7c6f4f', p4: '#b3a682',
  },
  marinho: {
    name: 'Marinho', scheme: 'dark', unlock: { level: 35 },
    bg: '#0a192f', surface: '#0f223d', surface2: '#142c4c', surface3: '#1b385d', line: '#1d3657',
    text: '#e6f1ff', muted: '#9fb3d1', dim: '#5f7699',
    accent: '#64ffda', onAccent: '#0a192f', g1: '#57cbff', g2: '#64ffda',
    pos: '#64ffda', neg: '#ff7a8a', warn: '#ffd166',
    p0: '#ff6b8b', p1: '#ffb15c', p2: '#57cbff', p3: '#8fa3c2', p4: '#5f7699',
  },
  darcula: {
    name: 'Darcula', scheme: 'dark', unlock: { level: 50 },
    bg: '#282a36', surface: '#2f3242', surface2: '#363a4d', surface3: '#414660', line: '#44475a',
    text: '#f8f8f2', muted: '#b6b9cf', dim: '#7a7fa0',
    accent: '#bd93f9', onAccent: '#282a36', g1: '#bd93f9', g2: '#50fa7b',
    pos: '#50fa7b', neg: '#ff5555', warn: '#f1fa8c',
    p0: '#ff5555', p1: '#ffb86c', p2: '#8be9fd', p3: '#b6b9cf', p4: '#6272a4',
  },
  aqua: {
    name: 'Aqua', scheme: 'light', unlock: { shop: true },
    bg: '#f5f5f7', surface: '#ffffff', surface2: '#ececf0', surface3: '#e0e0e6', line: '#dcdce2',
    text: '#1d1d1f', muted: '#5f5f66', dim: '#9a9aa2',
    accent: '#0071e3', onAccent: '#ffffff', g1: '#0071e3', g2: '#30c48d',
    pos: '#248a3d', neg: '#d70015', warn: '#b25000',
    p0: '#d70015', p1: '#c93400', p2: '#0071e3', p3: '#6e6e73', p4: '#aeaeb2',
  },
  matrix: {
    name: 'Matrix', scheme: 'dark', unlock: { shop: true },
    bg: '#020403', surface: '#06100a', surface2: '#0b1a10', surface3: '#112617', line: '#12301b',
    text: '#c8ffd8', muted: '#7ccf95', dim: '#3f7a52',
    accent: '#00ff41', onAccent: '#020403', g1: '#00b32d', g2: '#9dff6b',
    pos: '#00ff41', neg: '#ff4d4d', warn: '#e6ff4d',
    p0: '#ff4d4d', p1: '#ffb84d', p2: '#4dffa6', p3: '#7ccf95', p4: '#3f7a52',
  },
  rosa: {
    name: 'Rosa', scheme: 'light', unlock: { shop: true },
    bg: '#fdf2f8', surface: '#fffafd', surface2: '#fbe4f0', surface3: '#f6d0e3', line: '#f3d3e4',
    text: '#3b0a24', muted: '#7d3a5d', dim: '#b07895',
    accent: '#db2777', onAccent: '#ffffff', g1: '#ec4899', g2: '#8b5cf6',
    pos: '#0f8a5f', neg: '#c81e4f', warn: '#a35a00',
    p0: '#be123c', p1: '#c2410c', p2: '#7c3aed', p3: '#8a5a72', p4: '#c19ab0',
  },
  tomate: {
    name: 'Tomate', scheme: 'light', unlock: { shop: true },
    bg: '#fafafa', surface: '#ffffff', surface2: '#f3f3f3', surface3: '#e8e8e8', line: '#e6e6e6',
    text: '#202020', muted: '#555555', dim: '#999999',
    accent: '#c9372c', onAccent: '#ffffff', g1: '#dc4c3e', g2: '#f59e0b',
    pos: '#058527', neg: '#d1453b', warn: '#b06f00',
    p0: '#d1453b', p1: '#c06a00', p2: '#246fe0', p3: '#666666', p4: '#b0b0b0',
  },
  cinza: {
    name: 'Cinza', scheme: 'light', unlock: { shop: true },
    bg: '#f4f4f5', surface: '#ffffff', surface2: '#ebebed', surface3: '#dedee2', line: '#dcdce0',
    text: '#18181b', muted: '#52525b', dim: '#a1a1aa',
    accent: '#3f3f46', onAccent: '#ffffff', g1: '#52525b', g2: '#0d9488',
    pos: '#0f766e', neg: '#be123c', warn: '#a16207',
    p0: '#be123c', p1: '#c2410c', p2: '#1d4ed8', p3: '#71717a', p4: '#a1a1aa',
  },
  laranja: {
    name: 'Laranja', scheme: 'light', unlock: { shop: true },
    bg: '#fff7ed', surface: '#fffcf8', surface2: '#ffedd5', surface3: '#fed7aa', line: '#fbdcbc',
    text: '#2a160a', muted: '#6e4424', dim: '#b0805a',
    accent: '#c2410c', onAccent: '#ffffff', g1: '#f97316', g2: '#eab308',
    pos: '#15803d', neg: '#dc2626', warn: '#a16207',
    p0: '#dc2626', p1: '#c2410c', p2: '#2563eb', p3: '#8a6449', p4: '#c4a184',
  },
  edna: {
    name: 'Edna', scheme: 'dark', unlock: { shop: true },
    bg: '#232c36', surface: '#2a3441', surface2: '#313c4a', surface3: '#3a4757', line: '#36414e',
    text: '#e6ebf1', muted: '#a3afbd', dim: '#6c7a8a',
    accent: '#3daee9', onAccent: '#0f1720', g1: '#1fbfa5', g2: '#6a5fd8',
    pos: '#3ccf8e', neg: '#ef5577', warn: '#f2c14e',
    p0: '#ef5577', p1: '#f39c4a', p2: '#3daee9', p3: '#97a3b2', p4: '#6c7a8a',
    nav: { bg: '#25303b', text: '#e6ebf1', muted: '#a3afbd', dim: '#6c7a8a', line: '#2f3a46', hover: '#2f3b48' },
  },
  monocromo: {
    name: 'Monocromo', scheme: 'light', unlock: { shop: true }, gray: true,
    bg: '#f2f2f2', surface: '#ffffff', surface2: '#e9e9e9', surface3: '#dadada', line: '#d6d6d6',
    text: '#0a0a0a', muted: '#4a4a4a', dim: '#8a8a8a',
    accent: '#111111', onAccent: '#ffffff', g1: '#111111', g2: '#9a9a9a',
    pos: '#1f1f1f', neg: '#6e6e6e', warn: '#555555',
    p0: '#000000', p1: '#3a3a3a', p2: '#5e5e5e', p3: '#8a8a8a', p4: '#b5b5b5',
  },
  bumblebee: {
    name: 'Bumblebee', scheme: 'dark', unlock: { shop: true },
    bg: '#0b0b0b', surface: '#141414', surface2: '#1c1c1c', surface3: '#262626', line: '#2a2a2a',
    text: '#f5f5f0', muted: '#b8b4a2', dim: '#706c5e',
    accent: '#ffd400', onAccent: '#0b0b0b', g1: '#ffb300', g2: '#ffe94d',
    pos: '#ffd400', neg: '#ff5c4d', warn: '#ff9f1a',
    p0: '#ff5c4d', p1: '#ff9f1a', p2: '#ffd400', p3: '#b8b4a2', p4: '#706c5e',
  },
  tumbleweed: {
    name: 'Tumbleweed', scheme: 'light', unlock: { shop: true },
    bg: '#f7f7f5', surface: '#ffffff', surface2: '#efefec', surface3: '#e2e2de', line: '#e3e3df',
    text: '#1a1a1a', muted: '#5a5a55', dim: '#9a9a94',
    accent: '#00a82d', onAccent: '#ffffff', g1: '#00a82d', g2: '#2dbe60',
    pos: '#00862a', neg: '#d93f3f', warn: '#a87200',
    p0: '#d93f3f', p1: '#d4740f', p2: '#2f7fe0', p3: '#6e6e68', p4: '#b0b0aa',
    nav: { bg: '#1a1a1a', text: '#f2f2f0', muted: '#b9b9b3', dim: '#7c7c76', line: '#262626', hover: '#2a2a2a' },
  },
};

export const THEMES = T;
export const THEME_ORDER = ['sistema', 'grafite', 'claro', 'amoled', 'eletrico', 'suave', 'manteiga', 'marinho', 'darcula', 'cinza', 'aqua', 'rosa', 'laranja', 'tomate', 'matrix', 'edna', 'monocromo', 'bumblebee', 'tumbleweed'];
export const themeName = (id) => (id === 'sistema' ? 'Automático' : T[id]?.name || id);
export const isFreeTheme = (id) => id === 'sistema' || id === 'grafite' || id === 'claro';

// Fontes embutidas no app (funcionam offline). A "fonte do sistema" saiu: no Android a WebView
// não enxerga a fonte escolhida pelo usuário, então a opção não entregava o que prometia.
export const FONTS = {
  manrope: { name: 'Manrope', stack: "'Manrope', system-ui, sans-serif", note: 'Padrão do Lida' },
  inter: { name: 'Inter', stack: "'Inter', system-ui, sans-serif", note: 'Neutra, ótima em telas pequenas' },
  nunito: { name: 'Nunito', stack: "'Nunito', system-ui, sans-serif", note: 'Arredondada e amigável' },
  lexend: { name: 'Lexend', stack: "'Lexend', system-ui, sans-serif", note: 'Feita para leitura fluida' },
  atkinson: { name: 'Atkinson Hyperlegible', stack: "'Atkinson Hyperlegible', system-ui, sans-serif", note: 'Máxima legibilidade' },
  lora: { name: 'Lora', stack: "'Lora', Georgia, serif", note: 'Com serifa, tom editorial' },
  // Retrô de terminal. Tem desenho pequeno: o tamanho base sobe para ficar legível.
  vt323: { name: 'VT323', stack: "'VT323', ui-monospace, monospace", note: 'Retrô, de terminal antigo' },
};
export const FONT_ORDER = ['manrope', 'inter', 'nunito', 'lexend', 'atkinson', 'lora', 'vt323'];

// Tamanho da interface: tudo no CSS é medido em rem a partir deste valor (texto, espaços, botões),
// então a escolha muda o tamanho do app inteiro, não só da letra.
export const SIZES = { c: { name: 'Compacto', px: 13 }, p: { name: 'Pequeno', px: 14 }, m: { name: 'Médio', px: 15 }, g: { name: 'Grande', px: 16.5 } };
// No celular o padrão é um pouco menor (as telas são estreitas e o Android já aumenta a densidade).
const defaultSize = () => (document.documentElement.classList.contains('is-native') || matchMedia('(pointer: coarse) and (max-width: 699px)').matches ? 'p' : 'm');

const VAR = { bg: '--bg', surface: '--surface', surface2: '--surface-2', surface3: '--surface-3', line: '--line', text: '--text', muted: '--muted', dim: '--dim', accent: '--accent', onAccent: '--on-accent', g1: '--g1', g2: '--g2', pos: '--pos', neg: '--neg', warn: '--warn', p0: '--p0', p1: '--p1', p2: '--p2', p3: '--p3', p4: '--p4' };

const ls = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* sem armazenamento */
    }
  },
};

export const resolveTheme = (id) => {
  if (id === 'sistema' || !T[id]) return matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'grafite';
  return id;
};

const NAV_KEYS = ['bg', 'text', 'muted', 'dim', 'line', 'hover'];

// Aplica tema, fonte e tamanho. Guarda as variáveis resolvidas para o index.html pintar a
// primeira tela já com as cores certas (sem "piscar" no tema padrão).
export function applyAppearance({ theme = 'sistema', font = 'manrope', size = 'm' } = {}) {
  const id = resolveTheme(theme);
  const t = T[id];
  const root = document.documentElement;
  const vars = {};
  for (const [k, v] of Object.entries(VAR)) vars[v] = t[k];
  if (!FONTS[font]) font = 'manrope'; // inclui quem tinha escolhido a antiga "fonte do sistema"
  vars['--font'] = FONTS[font].stack;
  vars['--fs'] = `${(SIZES[size] || SIZES[defaultSize()]).px}px`;
  // Barra lateral com cor própria (só alguns temas). Sem ela, o CSS usa as cores de superfície.
  for (const k of NAV_KEYS) {
    if (t.nav?.[k]) vars[`--nav-${k}`] = t.nav[k];
    else root.style.removeProperty(`--nav-${k}`);
  }
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.style.colorScheme = t.scheme;
  root.dataset.scheme = t.scheme;
  root.dataset.theme = id;
  root.classList.toggle('is-gray', !!t.gray);
  root.dataset.font = font;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.bg);
  ls.set('lida.appearance', JSON.stringify({ theme, font, size }));
  ls.set('lida.paint', JSON.stringify({ vars, scheme: t.scheme }));
  return { id, scheme: t.scheme, bg: t.bg };
}

export function storedAppearance() {
  try {
    return { theme: 'sistema', font: 'manrope', size: defaultSize(), ...JSON.parse(ls.get('lida.appearance') || '{}') };
  } catch {
    return { theme: 'sistema', font: 'manrope', size: defaultSize() };
  }
}

// Amostra do tema para os seletores (bolinhas com fundo, superfície e destaque).
export const swatch = (id) => {
  const t = T[resolveTheme(id)];
  return `<span class="swatch" style="--sw-bg:${t.bg};--sw-s:${t.nav?.bg || t.surface2};--sw-a:${t.accent};--sw-g1:${t.g1};--sw-g2:${t.g2}" aria-hidden="true"><i></i><i></i><i></i></span>`;
};
