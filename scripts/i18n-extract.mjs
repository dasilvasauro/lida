// Lista os textos em português da interface (literais, partes fixas de templates e atributos de
// acessibilidade), no formato das chaves dos dicionários: "Resgatar {0} de ouro".
// Uso: node scripts/i18n-extract.mjs            → imprime as chaves sem tradução (en ou es)
//      node scripts/i18n-extract.mjs --all      → imprime todas
//      node scripts/i18n-extract.mjs --stale    → chaves dos dicionários que o código não usa mais
// Texto que não é para traduzir (nomes de fonte, teclas, código) fica em scripts/i18n-ignore.json.
// O teste tests/i18n.test.js falha se alguma chave ficar sem tradução: texto novo precisa entrar
// em js/i18n/en.js e js/i18n/es.js.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Fora: dados de exemplo, importação do Lida antigo, textos que já têm tradução própria ({ pt, en, es }).
const SKIP = /(changelog|legacy|demo|simulate|i18n|achievements|alarms|filesync|store|sync|crypto|idb|hlc|clock|net|providers|parse)\.js$|\/i18n\//;
const files = ['js/main.js', 'js/desktop.js', ...['js/views', 'js/core', 'js/ui', 'js/lib'].flatMap((d) => readdirSync(join(ROOT, d)).map((f) => `${d}/${f}`))].filter((f) => f.endsWith('.js') && !SKIP.test(f));

const PT = /[ãõçáéíóúâêôàÁÉÍÓÚÇÂÊÔ]|\b(de|da|do|das|dos|para|com|uma|um|não|sem|você|seu|sua|seus|hoje|ontem|amanhã|tarefa|tarefas|hábito|hábitos|dia|dias|nível|ouro|água|meta|semana|mês|ano|foco|rotina|loja|agora|depois|nada|todos|todas|cada|mais|menos|ainda|já|aqui|isso|este|esta|pelo|pela|nos|nas|ao|aos|à|às|ou|e|em|no|na|se|que|por)\b/i;

// Lê o código e devolve o texto de cada string e template (templates com ${...} viram {0}, {1}...;
// os templates de dentro das lacunas também entram, cada um por si). Pula comentários e regex.
function strings(src) {
  const out = [];
  let i = 0;
  const n = src.length;
  let prev = ''; // último caractere de código (para saber se "/" abre uma regex)
  function readQuoted(q) {
    let buf = '';
    i++;
    while (i < n && src[i] !== q) {
      if (src[i] === '\\') {
        buf += src[i] + src[i + 1];
        i += 2;
        continue;
      }
      if (src[i] === '\n') break;
      buf += src[i++];
    }
    i++;
    return buf;
  }
  function readTemplate() {
    let buf = '';
    let ph = 0;
    i++;
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') {
        buf += src[i] + src[i + 1];
        i += 2;
        continue;
      }
      if (src[i] === '$' && src[i + 1] === '{') {
        i += 2;
        // ${icon(...)} vira outro elemento na tela: conta como marcação, não como lacuna
        const isIcon = /^\s*icon\(/.test(src.slice(i, i + 12));
        code(true);
        buf += isIcon ? '<i>' : `{${ph++}}`;
        continue;
      }
      buf += src[i++];
    }
    i++;
    return buf;
  }
  // Código até o fim (ou até fechar a lacuna ${...}, se inner).
  function code(inner) {
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') {
        while (i < n && src[i] !== '\n') i++;
        continue;
      }
      if (c === '/' && src[i + 1] === '*') {
        const e = src.indexOf('*/', i + 2);
        i = e < 0 ? n : e + 2;
        continue;
      }
      if (c === "'" || c === '"') {
        out.push(readQuoted(c));
        prev = 'a';
        continue;
      }
      if (c === '`') {
        out.push(readTemplate());
        prev = 'a';
        continue;
      }
      if (c === '/' && (!prev || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev) || /\b(return|typeof|case|in|of)\s*$/.test(src.slice(Math.max(0, i - 8), i)))) {
        // regex literal
        i++;
        let cls = false;
        while (i < n && (src[i] !== '/' || cls)) {
          if (src[i] === '\\') i++;
          else if (src[i] === '[') cls = true;
          else if (src[i] === ']') cls = false;
          else if (src[i] === '\n') break;
          i++;
        }
        i++;
        while (/[a-z]/.test(src[i] || '')) i++;
        prev = 'a';
        continue;
      }
      if (inner) {
        if (c === '{') depth++;
        else if (c === '}') {
          if (depth === 0) {
            i++;
            return;
          }
          depth--;
        }
      }
      if (!/\s/.test(c)) prev = c;
      i++;
    }
  }
  code(false);
  return out;
}

const clean = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
function renumber(s) {
  const map = new Map();
  return s.replace(/\{(\d+)\}/g, (m, n) => {
    if (!map.has(n)) map.set(n, map.size);
    return `{${map.get(n)}}`;
  });
}
function looksText(s) {
  if (s.length < 2) return false;
  const letters = s.replace(/\{\d+\}/g, '');
  if (!/[A-Za-zÀ-ú]{2}/.test(letters)) return false;
  if (/[;=<>]|=>|\(\)|^\.|^#|^--|^[a-z]+:\/\/|\.(js|css|png|webp|ogg|wav|json|html)\b|^[a-z0-9_-]+$/.test(letters) && !/\s/.test(letters)) return false;
  if (/^[a-z][a-zA-Z0-9]*$/.test(letters)) return false; // identificadores
  if (/^[A-Z][a-z]+[A-Z]\w*$/.test(letters)) return false; // NomesDePlugin
  if (/^[}\]):,]|['`]\}|\$\{/.test(s)) return false; // restos de código
  if (/^(Escape|Enter|Lida|App|Keyboard|SplashScreen|Haptics|Pomodoro|XP|IPL|OK|AMOLED)$/.test(letters.trim())) return false;
  if (/^[a-z-]+(?:\s[a-z-]+)*\s?$/.test(letters) && !PT.test(letters) && !/[ãõçáéíóú]/.test(letters)) return false; // classes css
  if (/\b(class|data-|aria-|style|var\(|rgba?\(|translate|function|return|const )\b/.test(letters)) return false;
  return PT.test(letters) || /^[A-ZÁÉÍÓÚ][a-zà-ú]/.test(letters.trim());
}

export function extract() {
  const keys = new Map();
  const add = (s, f) => {
    // ícone colado no começo (${icon('x')}Texto): na tela, o ícone é outro elemento
    s = clean(s).replace(/^\{\d+\}(?=[A-Za-zÀ-ú"“])/, '');
    s = renumber(s);
    // pedaço que continua uma frase (": sem projetos, ..."): a chave guarda a pontuação
    if (!s || !looksText(s.replace(/^[:;,.]\s+/, ''))) return;
    if (!keys.has(s)) keys.set(s, f);
  };
  for (const f of files) {
    const raw0 = readFileSync(join(ROOT, f), 'utf8');
    // plural(n, 'tarefa', 'tarefas'): as palavras são traduzidas na hora (lib/util.js)
    for (const m of raw0.matchAll(/\bplural\([^,]+,\s*'([^']+)',\s*'([^']+)'\)/g)) for (const w of [m[1], m[2]]) if (!keys.has(w)) keys.set(w, f);
    const src = raw0
      .replace(/\/\/ i18n:skip-start[\s\S]*?\/\/ i18n:skip-end/g, '')
      // textos que já vêm com tradução: L('pt', 'en', 'es')
      .replace(/\bL\(\s*'(?:[^'\\]|\\.)*'\s*,\s*'(?:[^'\\]|\\.)*'\s*,\s*'(?:[^'\\]|\\.)*'\s*\)/g, 'null');
    for (let raw of strings(src)) {
      raw = raw.replace(/\\n/g, '\n').replace(/\\(['"`$\\])/g, '$1');
      // atributos com texto
      for (const a of raw.matchAll(/\b(?:aria-label|placeholder|title|alt)="([^"]*)"/g)) add(a[1], f);
      // texto entre as marcações
      for (const seg of raw.replace(/<[^>]*>/g, '\u0001').split('\u0001')) for (const line of seg.split('\n')) add(line, f);
    }
  }
  return keys;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const keys = extract();
  const all = process.argv.includes('--all');
  let missing = [...keys.keys()];
  if (!all) {
    const en = (await import('../js/i18n/en.js')).default;
    const es = (await import('../js/i18n/es.js')).default;
    const ignore = new Set(JSON.parse(readFileSync(join(ROOT, 'scripts/i18n-ignore.json'), 'utf8')));
    missing = missing.filter((k) => !ignore.has(k) && (!(k in en) || !(k in es)));
  }
  if (process.argv.includes('--stale')) {
    // chaves dos dicionários que o código não usa mais (as "linhas soltas" ficam: são montadas em partes)
    const en = (await import('../js/i18n/en.js')).default;
    const src = readFileSync(join(ROOT, 'js/i18n/en.js'), 'utf8');
    const loose = src.slice(src.indexOf('// linhas soltas'));
    missing = Object.keys(en).filter((k) => !keys.has(k) && !loose.includes(JSON.stringify(k)));
  }
  for (const k of missing) console.log(JSON.stringify(k));
  console.error(`${missing.length} de ${keys.size} chaves`);
}
