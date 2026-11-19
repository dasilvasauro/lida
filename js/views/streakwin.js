// Meta da ofensiva batida (com o app aberto): a chama acende, o número sobe de um, a bolinha de hoje
// é marcada na semana e aparece a que horas a meta veio, comparada com a média.
import { P } from '../state.js';
import { esc, fmtInt, fmtTime, WD_LETTER, weekday } from '../lib/util.js';
import { icon } from '../ui/ui.js';
import { play } from '../core/sound.js';
import { haptic } from '../ui/haptics.js';
import { goalTimeAvg } from '../core/streak.js';
import { hhmm } from '../core/calendar.js';
import { moodSrc } from './streak.js';
import { t } from '../core/i18n.js';

const dur = (m) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? (mm ? `${h}h${String(mm).padStart(2, '0')}` : `${h}h`) : `${mm} min`;
};

// s: streakInfo de agora (meta de hoje batida); min: minutos do dia em que a meta veio
export function celebrateStreak(s, min) {
  if (document.querySelector('.sw-wrap')) return;
  const S = P();
  const avg = goalTimeAvg(S);
  const prev = Math.max(0, s.count - 1);
  // comparação com a média dos dias anteriores (sem contar hoje)
  let cmp = '';
  if (avg && avg.n > 1) {
    const before = Math.round((avg.min * avg.n - min) / (avg.n - 1));
    const diff = min - before;
    cmp = Math.abs(diff) < 10 ? t('no seu horário de sempre') : diff < 0 ? t(`${dur(-diff)} mais cedo que a sua média (${fmtTime(hhmm(before))})`) : t(`${dur(diff)} mais tarde que a sua média (${fmtTime(hhmm(before))})`);
  }
  const week = s.week
    .map((w, i) => {
      const last = i === s.week.length - 1;
      const st = last ? 'open' : w.state;
      const ic = st === 'met' ? icon('flame', 'sm') : st === 'frozen' ? icon('snow', 'sm') : st === 'off' ? icon('coffee', 'sm') : st === 'miss' ? icon('x', 'sm') : '';
      return `<li class="st-${st}${last ? ' sw-today' : ''}"><i>${ic}</i><span>${WD_LETTER[weekday(w.date)]}</span></li>`;
    })
    .join('');
  const wrap = document.createElement('div');
  wrap.className = 'sw-wrap';
  wrap.innerHTML = `<div class="sw-card" role="dialog" aria-modal="true" aria-live="polite">
    <img class="sw-lidi" src="${moodSrc('feito')}" alt="" width="132" height="132">
    <div class="sw-flame">${icon('flame')}<span class="sw-roll"><b>${fmtInt(prev)}</b><b>${fmtInt(s.count)}</b></span></div>
    <h2>${esc(s.count === 1 ? t('Ofensiva acesa!') : t(`${fmtInt(s.count)} dias de ofensiva!`))}</h2>
    <ol class="streak-week sw-week">${week}</ol>
    <p class="sw-time">${icon('timer', 'sm')}<span>${esc(t(`Meta batida às ${fmtTime(hhmm(min))}`))}${cmp ? `<small>${esc(cmp)}</small>` : avg && avg.n <= 1 ? `<small>${esc(t('A partir de amanhã, a média de horário aparece aqui.'))}</small>` : ''}</span></p>
    <button type="button" class="btn primary" data-swok>Continuar</button>
  </div>`;
  document.body.appendChild(wrap);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(() => wrap.classList.add('open'));
  play('progress', { fraction: 1 });
  haptic('add');
  setTimeout(
    () => {
      wrap.classList.add('lit');
      const today = wrap.querySelector('.sw-today');
      today.classList.replace('st-open', 'st-met');
      today.querySelector('i').innerHTML = icon('flame', 'sm');
      play('levelup');
      haptic('done');
    },
    reduce ? 50 : 750,
  );
  const close = () => {
    wrap.classList.remove('open');
    setTimeout(() => wrap.remove(), 260);
  };
  wrap.querySelector('[data-swok]').onclick = close;
  const esc_ = (e) => e.key === 'Escape' && (document.removeEventListener('keydown', esc_), close());
  document.addEventListener('keydown', esc_);
  wrap.addEventListener('click', (e) => e.target === wrap && close());
  setTimeout(() => wrap.querySelector('[data-swok]')?.focus(), 900);
}
