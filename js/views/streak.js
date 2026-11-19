// Ofensiva no app: a pílula em Hoje (chama acesa quando a meta do dia vem) e a janela com o Lidinho.
import { P, app } from '../state.js';
import { t } from '../core/i18n.js';
import { dayIPL } from '../core/ipl.js';
import { today } from '../lib/clock.js';
import { streakInfo, streakMood, goalTimeAvg, FREEZE_MAX } from '../core/streak.js';
import { hhmm } from '../core/calendar.js';
import { esc, fmtInt, fmtTime, WD_LETTER, weekday, addDays } from '../lib/util.js';
import { icon, sheet } from '../ui/ui.js';

export const MOOD_TEXT = {
  manha: 'Bom dia! Bora manter a ofensiva.',
  feito: 'Ofensiva garantida hoje!',
  pijama: 'Meta batida. Boa noite!',
  urgente: 'O dia está acabando: falta pouco para manter a ofensiva!',
  quebrada: 'A ofensiva quebrou. Recomece hoje.',
  abandonado: 'Faz dias que você não aparece…',
};
export const moodSrc = (m) => `icons/lidinho/humor/${m}.webp`;

export function streakPill(S = P()) {
  const s = streakInfo(S);
  return `<button type="button" class="streak-pill${s.todayMet ? ' lit' : ''}" data-streak aria-label="Ofensiva de ${fmtInt(s.count)} dias">${icon('flame')}<b>${fmtInt(s.count)}</b></button>`;
}

// Texto da meta de hoje: "Faltam 2 para a meta de hoje" / "Meta de hoje batida".
export function todayLine(s) {
  if (s.todayMet) return 'Meta de hoje batida';
  if (!s.today.planned) return 'Conclua uma tarefa ou um hábito hoje';
  return s.today.need === 1 ? 'Falta 1 para a meta de hoje' : `Faltam ${s.today.need} para a meta de hoje`;
}

export function openStreak() {
  const S = P();
  const s = streakInfo(S);
  const mood = streakMood(s);
  const pct = Math.round(s.today.pct * 100);
  const fz = S.money.items.streakFreeze || 0;
  const avg = goalTimeAvg(S);
  const dot = (w) => {
    const ic = w.state === 'met' ? icon('flame', 'sm') : w.state === 'frozen' ? icon('snow', 'sm') : w.state === 'off' ? icon('coffee', 'sm') : w.state === 'open' ? '' : icon('x', 'sm');
    return `<li class="st-${w.state}"><i>${ic}</i><span>${WD_LETTER[weekday(w.date)]}</span></li>`;
  };
  sheet({
    title: 'Ofensiva',
    body: `<div class="streak-sheet">
      <img class="streak-lidi" src="${moodSrc(mood)}" alt="" width="160" height="160">
      <div class="streak-num${s.todayMet ? ' lit' : ''}">${icon('flame')}<b>${fmtInt(s.count)}</b></div>
      <p class="streak-sub">${s.count === 1 ? 'dia de ofensiva' : 'dias de ofensiva'}</p>
      <p class="streak-msg">${esc(MOOD_TEXT[mood])}</p>
      <div class="streak-today"><div class="streak-bar"><i style="width:${pct}%"></i><b style="left:${s.goal}%"></b></div>
        <small>${esc(todayLine(s))} · ${s.today.done} de ${s.today.planned || 0} (${pct}%) · meta ${s.goal}%</small></div>
      <ol class="streak-week">${s.week.map(dot).join('')}</ol>
      <p class="hint">Um dia conta quando você cumpre ${s.goal}% do que estava programado (tarefas do dia e hábitos). Tarefas adiantadas ou atrasadas concluídas no dia também contam. Dias de folga, a Folga dos hábitos e o Congelamento de Ofensiva não quebram a ofensiva.</p>
      <p class="streak-best">${icon('trophy', 'sm')} Melhor ofensiva: <b>${fmtInt(s.best)}</b>${avg ? ` · ${icon('timer', 'sm')} Meta costuma vir às <b>${esc(fmtTime(hhmm(avg.min)))}</b>` : ''}</p>
      <div class="streak-freeze">
        <span class="sf-ice">${Array.from({ length: FREEZE_MAX }, (_, i) => `<i class="${i < fz ? 'on' : ''}">${icon('snow', 'sm')}</i>`).join('')}</span>
        <span class="grow"><b>Congelamento de Ofensiva</b><small>${fz ? `${fz} de ${FREEZE_MAX} equipados: um dia sem a meta não quebra a ofensiva.` : 'Nenhum equipado. Na Loja, por 9 vouchers: protege a ofensiva num dia perdido.'}</small></span>
        ${fz < FREEZE_MAX ? `<button type="button" class="btn small" data-sfbuy>${icon('card', 'sm')}Loja</button>` : ''}
      </div>
      <div class="sheet-actions"><button type="button" class="btn ghost" data-goal>Mudar a meta</button><button type="button" class="btn primary" data-stclose>Fechar</button></div>
    </div>`,
    onMount(el, close) {
      el.querySelector('[data-stclose]').onclick = close;
      el.querySelector('[data-goal]').onclick = () => (close(), app.nav('ajustes-jogo'));
      el.querySelector('[data-sfbuy]')?.addEventListener('click', async () => {
        close();
        const { shopView } = await import('./shop.js');
        shopView.tab = 'vouchers';
        app.nav('loja');
      });
    },
  });
}

export function bindStreak(el) {
  el.querySelector('[data-streak]')?.addEventListener('click', openStreak);
}

/* ---------- Dados para os widgets (Android e Plasma) ---------- */
// A ofensiva como o widget precisa (ele mesmo troca a cara do Lidinho conforme a hora).
export function streakData(S = P()) {
  const s = streakInfo(S);
  return {
    count: s.count,
    best: s.best,
    todayMet: s.todayMet,
    broken: s.broken,
    lastActive: s.lastActive || today(),
    pct: Math.round(s.today.pct * 100),
    goal: s.goal,
    line: t(todayLine(s)),
    mood: streakMood(s),
    week: s.week.map((w) => ({ l: WD_LETTER[weekday(w.date)], state: w.state })),
  };
}
export function streakTexts() {
  const out = { streakDay: t('dia de ofensiva'), streakDays: t('dias de ofensiva'), streakOpen: t('Abra o Lida para começar.') };
  for (const [k, v] of Object.entries(MOOD_TEXT)) out[`mood_${k}`] = t(v);
  return out;
}
// IPL dos últimos 7 dias: as notas fechadas e a de hoje (parcial).
export function iplWeekData(S = P()) {
  const d0 = today();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(d0, i - 6);
    const isToday = d === d0;
    const rec = S.scoreByDate.get(d);
    const s = isToday ? dayIPL(S, d, { live: true }).score : rec?.score;
    return { d, l: WD_LETTER[weekday(d)], s: s ?? null, today: isToday };
  });
  const past = days.filter((x) => !x.today && x.s != null);
  const avg = past.length ? Math.round(past.reduce((a, x) => a + x.s, 0) / past.length) : null;
  const best = past.reduce((a, x) => (!a || x.s > a.s ? x : a), null);
  return {
    title: t('IPL da semana'),
    avg: avg == null ? '' : t(`Média ${avg}`),
    note: best ? t(`Melhor dia: ${best.s}`) : t('As notas aparecem quando cada dia fecha.'),
    days,
    average: avg,
  };
}
