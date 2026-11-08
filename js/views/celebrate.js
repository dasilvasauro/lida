// Retorno de uma conquista: aviso com a recompensa, moedas, subida de nível e presentes do nível.
import { fmtInt, plural } from '../lib/util.js';
import { toast } from '../ui/ui.js';
import { play } from '../core/sound.js';
import { levelUp } from '../ui/reward.js';

// res: resultado de game.commit (levelUp, cards, vouchers). reward: { xp, gold, parts }.
export function celebrate(label, reward, res = {}, { undo } = {}) {
  const r = reward || {};
  const bits = [];
  if (r.xp) bits.push(`${r.xp > 0 ? '+' : ''}${fmtInt(r.xp)} XP`);
  if (r.gold) bits.push(`${r.gold > 0 ? '+' : ''}${fmtInt(r.gold)} de ouro`);
  const extra = r.parts?.length ? ` (${r.parts.join(', ')})` : '';
  toast(bits.length ? `${label} · ${bits.join(', ')}${extra}` : label, undo ? { action: 'Desfazer', onAction: undo } : {});
  if (res.levelUp) setTimeout(() => levelUp(res.levelUp, res), 450);
  else if (r.xp > 0 || r.gold > 0) setTimeout(() => play('coin'), 260);
}

export const giftText = (res) => [res.cards ? plural(res.cards, 'Carta da Sorte', 'Cartas da Sorte') : '', res.vouchers ? plural(res.vouchers, 'voucher', 'vouchers') : ''].filter(Boolean).join(' e ');
