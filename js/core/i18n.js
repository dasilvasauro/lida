// Idiomas do Lida: português (padrão), inglês e espanhol.
// Os textos com tradução são objetos { pt, en, es }; tr() escolhe o do idioma atual (sem a tradução,
// fica o português). O idioma vem da escolha guardada (lida.lang) ou do sistema.
// Por enquanto (alfa 16) só as Conquistas estão traduzidas; o resto do app chega na versão seguinte.
export const LANGS = { pt: 'Português', en: 'English', es: 'Español' };
const KEY = 'lida.lang';

function detect() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && LANGS[saved]) return saved;
  } catch {
    /* sem armazenamento */
  }
  return 'pt';
}
let current = detect();

export const lang = () => current;
export function setLang(l) {
  if (!LANGS[l]) return;
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* sem armazenamento */
  }
}
// { pt, en, es } → texto no idioma atual. Aceita uma string (devolve igual).
export const tr = (o, l = current) => (o == null ? '' : typeof o === 'string' ? o : (o[l] ?? o.pt ?? ''));
// Troca {n}, {x}... pelos valores.
export const fill = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
export const locale = (l = current) => ({ pt: 'pt-BR', en: 'en-US', es: 'es-ES' })[l] || 'pt-BR';
export const num = (n, l = current) => Number(n || 0).toLocaleString(locale(l));
