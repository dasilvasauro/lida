// Idiomas do Lida: português (padrão), inglês e espanhol.
// O app é escrito em português; a tradução acontece em dois lugares:
//   - tr({ pt, en, es }): textos que já nascem com as três versões (Conquistas, alarmes, Lidinhos...).
//   - dicionários js/i18n/en.js e es.js: "texto em português" → tradução. As chaves podem ter lacunas
//     ({0}, {1}...) que casam com qualquer trecho, e o trecho também é traduzido ("Em {0}" + "3 dias").
//     O tradutor da tela (translateDom) aplica o dicionário em todo texto e atributo (placeholder,
//     title, aria-label, alt) que aparece, menos dentro de [translate="no"] (conteúdo da pessoa).
//     t() faz o mesmo para o que não passa pela tela (notificações, widgets, bandeja do Linux).
// O idioma vem da escolha guardada (lida.lang) ou do sistema. Trocar recarrega o app.
// Para achar texto novo sem tradução: node scripts/i18n-extract.mjs (o teste tests/i18n.test.js falha).
export const LANGS = { pt: 'Português', en: 'English', es: 'Español' };
const KEY = 'lida.lang';

function detect() {
  if (typeof document === 'undefined') return 'pt'; // testes (node) e serviços sem tela
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && LANGS[saved]) return saved;
  } catch {
    /* sem armazenamento */
  }
  try {
    for (const l of navigator.languages || [navigator.language]) {
      const k = String(l || '').slice(0, 2).toLowerCase();
      if (LANGS[k]) return k;
    }
  } catch {
    /* sem navegador (testes) */
  }
  return 'pt';
}
let current = detect();

export const lang = () => current;
export const langChosen = () => {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
};
export function setLang(l) {
  if (!LANGS[l]) return;
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* sem armazenamento */
  }
}
// { pt, en, es } → texto no idioma atual. Aceita uma string (passa pelo dicionário).
export const tr = (o, l = current) => (o == null ? '' : typeof o === 'string' ? t(o) : (o[l] ?? o.pt ?? ''));
// Troca {n}, {x}... pelos valores.
export const fill = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
export const locale = (l = current) => ({ pt: 'pt-BR', en: 'en-US', es: 'es-ES' })[l] || 'pt-BR';
export const num = (n, l = current) => Number(n || 0).toLocaleString(locale(l));

/* ---------- Dicionário ---------- */
let exact = null; // Map: chave normalizada → tradução
let pats = []; // { re, out, size }
let cache = new Map();
const MAX_CACHE = 6000;
const normWs = (s) => s.replace(/\s+/g, ' ').trim();
const SEP = /\s[·—|•]\s/;
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function setDict(obj) {
  exact = new Map();
  pats = [];
  cache = new Map();
  if (!obj) {
    exact = null;
    return;
  }
  for (const [k0, v] of Object.entries(obj)) {
    if (typeof v !== 'string') continue;
    const k = normWs(k0);
    if (!/\{\d+\}/.test(k)) {
      exact.set(k, v);
      continue;
    }
    const lits = k.split(/\{\d+\}/);
    const order = [...k.matchAll(/\{(\d+)\}/g)].map((m) => +m[1]);
    // lacuna pode vir vazia (pedaço condicional: "{0} de ouro{1}")
    const src = lits.map((l) => reEsc(l).replace(/ /g, '\\s+')).join('([\\s\\S]*?)');
    const size = lits.join('').replace(/\s/g, '').length;
    if (size < 2) continue; // "{0} {1}" não diz nada
    pats.push({ re: new RegExp(`^${src}$`), out: v, order, size, seps: SEP.test(k) });
  }
  pats.sort((a, b) => b.size - a.size);
}
export async function loadDict(l = current) {
  if (l === 'pt') return setDict(null);
  try {
    const mod = await import(`../i18n/${l}.js`);
    setDict(mod.default);
  } catch (e) {
    console.warn('Idioma', l, e);
  }
}
export const hasDict = () => !!exact;

// minúscula no começo, menos nomes que o inglês escreve com maiúscula (meses, dias, "I")
const keepCase = (r) => (current === 'en' && /^(January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|I\b)/.test(r) ? r : r[0].toLowerCase() + r.slice(1));
export const lowerFirst = (s) => (s ? keepCase(String(s)) : s);

function lookup(s, depth) {
  const hit = exact.get(s);
  if (hit != null) return hit;
  if (depth > 3) return null;
  for (const p of pats) {
    const m = p.re.exec(s);
    if (!m) continue;
    const groups = p.order.map((_, i) => m[i + 1]);
    // lacuna engolindo um separador que a chave não tem ("{0} tarefas" em "A · B tarefas"): não é esta
    if (groups.some((g) => SEP.test(g)) && !p.seps) continue;
    return p.out.replace(/\{(\d+)\}/g, (x, n) => {
      const i = p.order.indexOf(+n);
      return i < 0 ? x : groups[i] ? translate(groups[i], depth + 1) : '';
    });
  }
  return null;
}
function translate(s, depth = 0) {
  const k = normWs(s);
  if (!k || !/[A-Za-zÀ-ú]/.test(k)) return s;
  let r = lookup(k, depth);
  if (r != null) return r;
  // ponto final, dois-pontos, reticências fora da chave
  const tail = /^(.*?)([.:!?…]+)$/.exec(k);
  if (tail && (r = lookup(tail[1], depth)) != null) return r + tail[2];
  // pedaços separados por " · ", " — ", " | ", " / ", ": "
  const parts = k.split(/(\s+[·—|/•]\s+|:\s+)/);
  if (parts.length > 1) {
    let changed = false;
    const out = parts.map((p, i) => {
      if (i % 2) return p;
      const x = translate(p, depth + 1);
      if (x !== p) changed = true;
      return x;
    });
    if (changed) return out.join('');
  }
  // dentro de uma lacuna: listas ("Iniciado, Diligente e Perseverante", "11 vouchers + Congelamento")
  if (depth > 0) {
    const items = k.split(/(,\s+|\s+\+\s+|\s+e\s+)/);
    if (items.length > 1) {
      const and = { en: ' and ', es: ' y ' }[current] || ' e ';
      let changed = false;
      const out = items.map((p, i) => {
        if (i % 2) return /^\s+e\s+$/.test(p) ? and : p;
        const x = translate(p, depth + 1);
        if (x !== p) changed = true;
        return x;
      });
      if (changed) return out.join('');
    }
  }
  // maiúscula no começo (cap() de uma chave em minúscula)
  const lower = k[0].toLowerCase() + k.slice(1);
  if (lower !== k && (r = lookup(lower, depth)) != null) return r[0].toUpperCase() + r.slice(1);
  // e o contrário (toLowerCase() de uma chave com maiúscula: "prioridade crítica")
  const upper = k[0].toUpperCase() + k.slice(1);
  if (upper !== k && exact.has(upper)) return keepCase(exact.get(upper));
  return s;
}
// Texto em português → idioma atual (sem dicionário ou sem tradução, devolve igual).
export function t(s) {
  if (!exact || s == null) return s ?? '';
  s = String(s);
  if (s.includes('\n')) return s.split('\n').map(t).join('\n');
  const c = cache.get(s);
  if (c !== undefined) return c;
  const lead = /^\s*/.exec(s)[0];
  const trail = /\s*$/.exec(s)[0];
  const out = lead + translate(s).replace(/^\s+|\s+$/g, '') + trail;
  const res = normWs(out) === normWs(s) ? s : out;
  if (cache.size > MAX_CACHE) cache.clear();
  cache.set(s, res);
  return res;
}

/* ---------- Tradutor da tela ---------- */
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT']);
const done = new WeakMap(); // nó de texto → último texto escrito por nós
const skipped = (el) => !el || SKIP.has(el.nodeName) || !!el.closest?.('[translate="no"],[contenteditable="true"],[contenteditable=""]');

function doText(n) {
  const v = n.data;
  if (done.get(n) === v || !/[A-Za-zÀ-ú]/.test(v)) return;
  if (skipped(n.parentElement)) return;
  const out = t(v);
  done.set(n, out);
  if (out !== v) n.data = out;
}
function doAttrs(el) {
  if (el.closest?.('[translate="no"]')) return; // placeholder de textarea também traduz
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const out = t(v);
    if (out !== v) el.setAttribute(a, out);
  }
}
export function translateDom(root = document.documentElement) {
  if (!exact || !root) return;
  if (root.nodeType === 3) return doText(root);
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.nodeType === 1) {
    doAttrs(root);
    if (skipped(root)) return;
  }
  const w = document.createTreeWalker(root, 5 /* elementos e textos */, {
    acceptNode: (n) => {
      if (n.nodeType !== 1) return 1;
      if (n.getAttribute('translate') === 'no' || n.isContentEditable) return 2;
      if (SKIP.has(n.nodeName)) return doAttrs(n), 2; // textarea: só o placeholder
      return 1;
    },
  });
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) doText(n);
    else doAttrs(n);
  }
}
let observer = null;
export function startDomTranslation() {
  if (!exact || observer || typeof MutationObserver === 'undefined') return;
  document.documentElement.lang = locale();
  translateDom();
  observer = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'childList') for (const n of m.addedNodes) translateDom(n);
      else if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
