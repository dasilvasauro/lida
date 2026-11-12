// Lista os textos em português da interface (literais, partes fixas de templates e atributos de
// acessibilidade), no formato das chaves dos dicionários: "Resgatar {0} de ouro".
// Uso: node scripts/i18n-extract.mjs            → imprime as chaves sem tradução (en ou es)
//      node scripts/i18n-extract.mjs --all      → imprime todas
// O teste tests/i18n.test.js falha se alguma chave ficar sem tradução: texto novo precisa entrar
// em js/i18n/en.js e js/i18n/es.js.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Fora: dados de exemplo, importação do Lida antigo, textos que já têm tradução própria ({ pt, en, es }).
const SKIP = /(changelog|legacy|demo|simulate|i18n|achievements|alarms|filesync|store|sync|crypto|idb|hlc|clock|net|providers)\.js$|\/i18n\//;
const files = ['js/main.js', 'js/desktop.js', ...['js/views', 'js/core', 'js/ui', 'js/lib'].flatMap((d) => readdirSync(join(ROOT, d)).map((f) => `${d}/${f}`))].filter((f) => f.endsWith('.js') && !SKIP.test(f));

const PT = /[ãõçáéíóúâêôàÁÉÍÓÚÇÂÊÔ]|\b(de|da|do|das|dos|para|com|uma|um|não|sem|você|seu|sua|seus|hoje|ontem|amanhã|tarefa|tarefas|hábito|hábitos|dia|dias|nível|ouro|água|meta|semana|mês|ano|foco|rotina|loja|agora|depois|nada|todos|todas|cada|mais|menos|ainda|já|aqui|isso|este|esta|pelo|pela|nos|nas|ao|aos|à|às|ou|e|em|no|na|se|que|por)\b/i;

// Separa ${...} (com chaves aninhadas) do texto de um template.
function splitTemplate(raw) {
  const parts = [];
  let buf = '';
  let ph = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '$' && raw[i + 1] === '{') {
      let depth = 1;
      let j = i + 2;
      let inStr = null;
      for (; j < raw.length && depth; j++) {
        const c = raw[j];
        if (inStr) {
          if (c === '\\') j++;
          else if (c === inStr) inStr = null;
          else if (inStr === '`' && c === '$' && raw[j + 1] === '{') {
            // template aninhado: pula até fechar
            let d2 = 1;
            j += 2;
            for (; j < raw.length && d2; j++) {
              if (raw[j] === '{') d2++;
              else if (raw[j] === '}') d2--;
            }
            j--;
          }
          continue;
        }
        if (c === "'" || c === '"' || c === '`') inStr = c;
        else if (c === '{') depth++;
        else if (c === '}') depth--;
      }
      buf += `{${ph++}}`;
      i = j - 1;
      continue;
    }
    buf += raw[i];
  }
  parts.push(buf);
  return parts[0];
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
  if (/^(?:[a-z-]+\s?)+$/.test(letters) && !PT.test(letters) && !/[ãõçáéíóú]/.test(letters)) return false; // classes css
  if (/\b(class|data-|aria-|style|var\(|rgba?\(|translate|function|return|const )\b/.test(letters)) return false;
  return PT.test(letters) || /^[A-ZÁÉÍÓÚ][a-zà-ú]/.test(letters.trim());
}

export function extract() {
  const keys = new Map();
  const add = (s, f) => {
    // ícone colado no começo (${icon('x')}Texto): na tela, o ícone é outro elemento
    s = clean(s).replace(/^\{\d+\}(?=[A-Za-zÀ-ú"“])/, '');
    s = renumber(s);
    if (!s || !looksText(s)) return;
    if (!keys.has(s)) keys.set(s, f);
  };
  for (const f of files) {
    const src = readFileSync(join(ROOT, f), 'utf8')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // textos que já vêm com tradução: L('pt', 'en', 'es')
      .replace(/\bL\(\s*'(?:[^'\\]|\\.)*'\s*,\s*'(?:[^'\\]|\\.)*'\s*,\s*'(?:[^'\\]|\\.)*'\s*\)/g, 'null');
    const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
    let m;
    while ((m = re.exec(src))) {
      let raw = m[1] ?? m[2] ?? m[3];
      if (m[3] != null) raw = splitTemplate(raw);
      raw = raw.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"');
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
    missing = missing.filter((k) => !(k in en) || !(k in es));
  }
  for (const k of missing) console.log(JSON.stringify(k));
  console.error(`${missing.length} de ${keys.size} chaves`);
}
