// Metrônomo: as preferências guardadas sempre voltam válidas (1 a 8 tempos, 30 a 200 bpm, som conhecido).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };

const { tickPrefs, setTickPrefs, MAX_BEATS, TICK_ORDER } = await import('../js/core/metronome.js');

test('padrão: um tique por segundo, desligado', () => {
  const p = tickPrefs();
  assert.deepEqual([p.on, p.bpm, p.beats, p.sound], [false, 60, 1, 'relogio']);
  assert.equal(p.pattern.length, MAX_BEATS);
  assert.equal(p.pattern[0], 'accent');
});

test('valores fora do limite são corrigidos', () => {
  store.set('lida.tick', JSON.stringify({ beats: 12, bpm: 999, sound: 'trovão', pattern: ['mute', 'x'] }));
  const p = tickPrefs();
  assert.deepEqual([p.beats, p.bpm, p.sound], [8, 200, 'relogio']);
  assert.deepEqual(p.pattern.slice(0, 3), ['mute', 'normal', 'normal']);
  setTickPrefs({ beats: 0, bpm: 10 });
  assert.deepEqual([tickPrefs().beats, tickPrefs().bpm], [1, 30]);
  assert.ok(TICK_ORDER.length >= 6);
});
