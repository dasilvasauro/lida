// Hub de Produtividade (aba Eu > Hub): seções com conceitos, métodos, estudos, práticas e livros.
// #hub mostra o índice (com busca em tudo); #hub-<seção> mostra uma seção inteira. Os "?" do app
// levam direto para o cartão certo (app.hubCard).
import { app } from '../state.js';
import { esc, norm } from '../lib/util.js';
import { icon } from '../ui/ui.js';
import { tr } from '../core/i18n.js';
import { HUB, HUB_BY_ID, HUB_CARD, KINDS } from '../core/hub.js';
import { openExternal } from '../core/net.js';

const NOTE = '<div class="hub-note">' + '<b>Sem patrocínio.</b> Nenhuma indicação aqui é paga e não há links de afiliado. Livros aparecem só com autor, ano e título; os links levam aos estudos originais e a órgãos oficiais.' + '</div>';

function card(c) {
  const k = KINDS[c.kind];
  const srcs = [c.src, c.src2, c.src3].filter(Boolean);
  const free = [...(c.free || []), ...srcs.filter((x) => x.open)];
  const paid = srcs.filter((x) => !x.open);
  const link = (x) => `<a href="${esc(x.url)}" data-ext rel="noopener noreferrer" target="_blank" translate="no">${esc(x.label)}</a>`;
  return `<article class="hub-card k-${c.kind}" id="hub-c-${c.id}" data-hcard="${c.id}">
    <small class="hub-kind">${icon(k.icon, 'sm')}${esc(tr(k.name))}</small>
    <h3>${esc(tr(c.title))}</h3>
    <p>${esc(tr(c.text))}</p>
    ${c.tips?.length ? `<ul class="hub-tips">${c.tips.map((x) => `<li>${esc(tr(x))}</li>`).join('')}</ul>` : ''}
    ${free.length ? `<div class="hub-src free"><b>${icon('unlock', 'sm')}Ler de graça</b>${free.map(link).join('')}</div>` : ''}
    ${paid.length ? `<div class="hub-src"><b>${icon('open', 'sm')}Artigo original</b>${paid.map(link).join('')}<small>${free.length ? 'Pode pedir assinatura; o resumo é aberto.' : 'Pode pedir assinatura; o resumo é aberto. Não achamos uma versão gratuita confiável.'}</small></div>` : ''}
  </article>`;
}

export const hubView = {
  title: 'Hub de Produtividade',
  sec: '',
  sub: () => '',
  render(el) {
    const s = HUB_BY_ID.get(hubView.sec);
    if (s) {
      const i = HUB.indexOf(s);
      const prev = HUB[i - 1];
      const next = HUB[i + 1];
      el.innerHTML = `<div class="hub">
        <a class="hub-back link" href="#hub">${icon('back', 'sm')}Hub de Produtividade</a>
        <header class="hub-sec-head"><span class="hub-ic">${icon(s.icon)}</span><div><h2>${esc(tr(s.title))}</h2><p>${esc(tr(s.intro))}</p></div></header>
        ${s.id === 'livros' || s.id === 'porque' ? NOTE : ''}
        <div class="hub-cards">${s.cards.map(card).join('')}</div>
        <nav class="hub-pager">${prev ? `<a class="btn ghost" href="#hub-${prev.id}">${icon('left', 'sm')}${esc(tr(prev.title))}</a>` : '<span></span>'}${next ? `<a class="btn ghost" href="#hub-${next.id}">${esc(tr(next.title))}${icon('right', 'sm')}</a>` : ''}</nav>
      </div>`;
    } else {
      el.innerHTML = `<div class="hub">
        <p class="hub-lead">Por que constância funciona, como definir objetivos, métodos de organização, foco, hábitos e o corpo (água, sono, movimento), com os estudos por trás e livros para ir além.</p>
        ${NOTE}
        <label class="field hub-search"><span class="sr-only">Buscar no Hub</span><input type="search" placeholder="Buscar no Hub (ex.: Pomodoro, água, metas)" data-hsearch></label>
        <div class="hub-grid" data-hgrid>${HUB.map(
          (x) => `<a class="hub-tile" href="#hub-${x.id}"><span class="hub-ic">${icon(x.icon)}</span><span class="grow"><b>${esc(tr(x.title))}</b><small>${esc(tr(x.intro))}</small></span><span class="hub-count">${x.cards.length}</span></a>`,
        ).join('')}</div>
        <div class="hub-cards" data-hres hidden></div>
        <p class="hint hub-none" data-hnone hidden>Nada encontrado no Hub.</p>
      </div>`;
      const q = el.querySelector('[data-hsearch]');
      q.oninput = () => {
        const v = norm(q.value.trim());
        const grid = el.querySelector('[data-hgrid]');
        const res = el.querySelector('[data-hres]');
        if (!v) {
          grid.hidden = false;
          res.hidden = true;
          el.querySelector('[data-hnone]').hidden = true;
          return;
        }
        const hits = [...HUB_CARD.values()].filter((c) => norm([tr(c.title), tr(c.text), ...(c.tips || []).map(tr), c.src?.label || ''].join(' ')).includes(v));
        grid.hidden = true;
        res.hidden = !hits.length;
        res.innerHTML = hits.map(card).join('');
        el.querySelector('[data-hnone]').hidden = !!hits.length;
        bindLinks(res);
      };
    }
    bindLinks(el);
    // veio de um "?": rola até o cartão e dá um destaque
    if (app.hubCard) {
      const c = el.querySelector(`#hub-c-${CSS.escape(app.hubCard)}`);
      app.hubCard = null;
      if (c) {
        setTimeout(() => c.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
        c.classList.add('hl');
        setTimeout(() => c.classList.remove('hl'), 2400);
      }
    }
  },
};

function bindLinks(root) {
  // no app (Android/Linux), links externos abrem no navegador do sistema
  root.querySelectorAll('[data-ext]').forEach(
    (a) =>
      (a.onclick = (e) => {
        e.preventDefault();
        openExternal(a.href);
      }),
  );
}

// Abre o Hub num cartão (usado pelos "?" e pelo manual)
export function openHubCard(id) {
  const c = HUB_CARD.get(id);
  if (!c) return;
  app.hubCard = id;
  app.nav(`hub-${c.section}`);
}

// Entrada na aba Eu
export function hubEntry() {
  return `<section class="block hub-entry"><a class="hub-entry-card" href="#hub">
    <span class="hub-ic">${icon('book')}</span>
    <span class="grow"><b>Hub de Produtividade</b><small>Métodos, estudos, práticas e livros sobre constância, objetivos, foco, hábitos e corpo. Sem patrocínio.</small></span>${icon('right', 'sm')}
  </a></section>`;
}
