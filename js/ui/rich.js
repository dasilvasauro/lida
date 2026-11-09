// Descrição com formatação leve (um Markdown pequeno e seguro):
//   **negrito**, *itálico*, ~~riscado~~, `código`, [texto](https://link), links soltos,
//   listas com "- " e listas de verificação com "- [ ] " / "- [x] ".
// O texto é escapado antes de qualquer marcação, então nada do usuário vira HTML.
import { esc } from '../lib/util.js';
import { copyText } from './ui.js';

function inline(s) {
  let h = esc(s);
  const codes = [];
  h = h.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);
  h = h.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, u) => `${pre}<a href="${u}" target="_blank" rel="noopener noreferrer">${u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>`);
  h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  h = h.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
  h = h.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  h = h.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
  return h;
}

export function renderRich(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const out = [];
  let list = null;
  const close = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  lines.forEach((line, i) => {
    const check = line.match(/^\s*[-*] \[( |x|X)\] (.*)$/);
    const item = !check && line.match(/^\s*[-*•] (.*)$/);
    const num = !check && !item && line.match(/^\s*\d+[.)] (.*)$/);
    if (check) {
      if (list !== 'ul class="checks"') {
        close();
        out.push('<ul class="checks">');
        list = 'ul class="checks"';
      }
      out.push(`<li><button type="button" class="rich-check${check[1] !== ' ' ? ' on' : ''}" data-line="${i}" aria-pressed="${check[1] !== ' '}"></button><span>${inline(check[2])}</span></li>`);
    } else if (item || num) {
      const tag = item ? 'ul' : 'ol';
      if (list !== tag) {
        close();
        out.push(`<${tag}>`);
        list = tag;
      }
      out.push(`<li>${inline((item || num)[1])}</li>`);
    } else {
      close();
      if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
  });
  close();
  return out.join('').replace(/<\/ul class="checks">/g, '</ul>');
}

// Prévia em texto simples para a lista (sem marcação): links viram o texto, listas ganham • e ☐/☑.
export function plainPreview(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) =>
      l
        .replace(/^\s*[-*] \[( )\] /, '☐ ')
        .replace(/^\s*[-*] \[(x|X)\] /, '☑ ')
        .replace(/^\s*[-*•] /, '• ')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
        .replace(/(\*\*|~~|`)/g, '')
        .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1$2')
        .trim(),
    )
    .filter(Boolean)
    .join('\n');
}

// Marca/desmarca a linha "- [ ]" de número `i` e devolve o texto novo.
export function toggleCheckLine(text, i) {
  const lines = String(text || '').split('\n');
  lines[i] = lines[i].replace(/\[( |x|X)\]/, (_, c) => (c === ' ' ? '[x]' : '[ ]'));
  return lines.join('\n');
}

// Barra de formatação para um <textarea>.
export function richToolbar() {
  return `<div class="rich-bar" role="toolbar" aria-label="Formatação">
    <button type="button" data-fmt="b" aria-label="Negrito"><b>N</b></button>
    <button type="button" data-fmt="i" aria-label="Itálico"><i>I</i></button>
    <button type="button" data-fmt="s" aria-label="Riscado"><s>S</s></button>
    <button type="button" data-fmt="code" aria-label="Código"><code>{ }</code></button>
    <button type="button" data-fmt="link" aria-label="Link">Link</button>
    <button type="button" data-fmt="list" aria-label="Lista">• Lista</button>
    <button type="button" data-fmt="check" aria-label="Lista de verificação">☐ Itens</button>
    <button type="button" data-fmt="copy" class="rb-copy" aria-label="Copiar a descrição">Copiar</button>
  </div>`;
}
export function bindToolbar(root, ta, onChange) {
  root.querySelectorAll('[data-fmt]').forEach(
    (b) =>
      (b.onclick = () => {
        const f = b.dataset.fmt;
        if (f === 'copy') {
          if (!ta.value.trim()) return;
          copyText(ta.value).then((ok) => {
            b.textContent = ok ? 'Copiada' : 'Não deu';
            b.classList.toggle('done', ok);
            setTimeout(() => { b.textContent = 'Copiar'; b.classList.remove('done'); }, 1600);
          });
          return;
        }
        const { selectionStart: a, selectionEnd: z, value: v } = ta;
        const sel = v.slice(a, z);
        let ins;
        let caret;
        if (f === 'b' || f === 'i' || f === 's' || f === 'code') {
          const m = { b: '**', i: '*', s: '~~', code: '`' }[f];
          ins = `${m}${sel || 'texto'}${m}`;
          caret = [a + m.length, a + m.length + (sel || 'texto').length];
        } else if (f === 'link') {
          ins = `[${sel || 'texto'}](https://)`;
          caret = [a + ins.length - 1, a + ins.length - 1];
        } else {
          const p = f === 'list' ? '- ' : '- [ ] ';
          const start = v.lastIndexOf('\n', a - 1) + 1;
          ta.setRangeText(p, start, start, 'end');
          onChange?.();
          return ta.focus();
        }
        ta.setRangeText(ins, a, z, 'end');
        ta.setSelectionRange(caret[0], caret[1]);
        ta.focus();
        onChange?.();
      }),
  );
}
