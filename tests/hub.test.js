// Hub de Produtividade: tudo traduzido, fontes neutras (sem lojas/afiliados) e os "?" apontam para cartões que existem.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { HUB, HUB_CARD, KINDS } = await import('../js/core/hub.js');
const { CHAPTERS } = await import('../js/core/help.js');

const tri = (o, where) => {
  for (const l of ['pt', 'en', 'es']) assert.ok(typeof o?.[l] === 'string' && o[l].trim(), `${where}: falta ${l}`);
};

test('cada seção e cartão tem texto em pt, en e es', () => {
  for (const s of HUB) {
    tri(s.title, s.id);
    tri(s.intro, s.id);
    for (const c of s.cards) {
      assert.ok(KINDS[c.kind], `${c.id}: tipo ${c.kind}`);
      tri(c.title, c.id);
      tri(c.text, c.id);
      for (const t of c.tips || []) tri(t, c.id);
    }
  }
});

test('links só para fontes neutras (https, sem lojas nem afiliados); livros sem link', () => {
  const banned = /amazon|amzn|mercadolivre|submarino|americanas|saraiva|magazineluiza|shopee|aliexpress|bookdepository|kobo\.com|play\.google|apple\.com\/.*book|[?&](tag|ref|aff|affiliate)=/i;
  for (const c of HUB_CARD.values()) {
    for (const s of [c.src, c.src2, c.src3].filter(Boolean)) {
      assert.match(s.url, /^https:\/\//, c.id);
      assert.doesNotMatch(s.url, banned, c.id);
    }
    if (c.kind === 'livro') assert.equal(c.src, undefined, `${c.id}: livro sem link`);
  }
});

test('os "?" do manual apontam para cartões do Hub que existem', () => {
  let n = 0;
  for (const ch of CHAPTERS)
    for (const tp of ch.topics)
      if (tp.hub) {
        n++;
        assert.ok(HUB_CARD.get(tp.hub), `${tp.id} → ${tp.hub}`);
      }
  assert.ok(n >= 20);
});
