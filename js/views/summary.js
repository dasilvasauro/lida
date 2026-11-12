// Resumos: do dia anterior (aparece na primeira abertura do dia) e do mês que fechou.
// Também abrem a partir da aba Eu.
import { P } from '../state.js';
import { IPL_PARTS, dayIPL, grade, gradeLine, partsTip } from '../core/ipl.js';
import { monthRecord, yearRecord, doneDay, habitsOnDay } from '../core/tasks.js';
import { today } from '../lib/clock.js';
import { esc, fmtInt, fmtSigned, plural, sum, addDays, fmtDayLong, fmtMonth, fmtMl, ymOf, addMonths, cap, MSHORT, MONTHS, LOC } from '../lib/util.js';
import { sheet, icon } from '../ui/ui.js';
import { line, columns } from '../ui/chart.js';
import { face, MOODS } from './me.js';

const SEEN = 'lida.summarySeen';
const seen = () => {
  try {
    return JSON.parse(localStorage.getItem(SEEN) || '{}');
  } catch {
    return {};
  }
};
const markSeen = (k, v) => {
  try {
    localStorage.setItem(SEEN, JSON.stringify({ ...seen(), [k]: v }));
  } catch {
    /* sem armazenamento */
  }
};

export function partsBars(parts, { compact = false } = {}) {
  const rows = IPL_PARTS.filter((p) => parts?.[p.k] != null);
  if (!rows.length) return '';
  return `<ul class="ipl-parts${compact ? ' compact' : ''}">${rows
    .map((p) => {
      const v = Math.round(parts[p.k] * 100);
      return `<li><span class="ipl-name">${esc(p.name)}<small>peso ${p.w}</small></span><span class="ipl-bar" role="img" aria-label="${esc(p.name)}: ${v}%"><i style="width:${Math.max(2, v)}%"></i></span><b>${v}%</b></li>`;
    })
    .join('')}</ul>`;
}

const fmtFocus = (sec) => (sec >= 3600 ? `${(sec / 3600).toLocaleString(LOC, { maximumFractionDigits: 1 })} h` : `${Math.round(sec / 60)} min`);
const money = (evs, k) => [sum(evs, (e) => Math.max(0, e[k] || 0)), sum(evs, (e) => Math.min(0, e[k] || 0))];
const tile = (label, value, sub = '') => `<div class="tile"><small>${esc(label)}</small><b>${value}</b>${sub ? `<span class="tile-sub">${sub}</span>` : ''}</div>`;

/* ---------- Dia ---------- */
export function showDaySummary(day = addDays(today(), -1)) {
  const S = P();
  const rec = S.scoreByDate.get(day);
  const live = day === today();
  const ipl = rec?.v === 2 && !live ? { score: rec.score, parts: rec.parts } : dayIPL(S, day, { live });
  const done = S.task.filter((t) => t.done && doneDay(t) === day);
  const failed = S.task.filter((t) => t.failed && t.due === day);
  const hab = habitsOnDay(S, day);
  const evs = (S.evByDate.get(day) || []).filter((e) => e.kind !== 'import');
  const [xp, xpLost] = money(evs, 'xp');
  const [gold, goldLost] = money(evs, 'gold');
  const focusSec = sum(evs.filter((e) => e.kind === 'focus'), (e) => e.focusSec || 0);
  const ml = sum(S.waterByDate.get(day) || [], (w) => w.ml || 0);
  const mood = MOODS.find((m) => m.id === S.moodByDate.get(day));
  const g = ipl.score != null ? grade(ipl.score) : null;
  const tip = partsTip(ipl.parts);
  const best = [...done].sort((a, b) => (a.priority || 'P9').localeCompare(b.priority || 'P9')).slice(0, 4);

  sheet({
    title: live ? 'Seu dia até agora' : day === addDays(today(), -1) ? 'Resumo de ontem' : 'Resumo do dia',
    body: `<div class="summary">
      <p class="sum-date">${esc(cap(fmtDayLong(day)))}</p>
      <div class="sum-hero">
        ${g ? `<div class="sum-ring" style="--p:${ipl.score}"><b>${ipl.score}</b><small>IPL</small></div><div><div class="sum-grade">${g}</div><p>${esc(live ? 'Parcial: o dia ainda não acabou.' : gradeLine(g))}</p></div>` : `<div><div class="sum-grade small">Sem nota</div><p>${rec?.off ? 'Dia de folga sem atividade. Descanso também conta.' : 'Nada para avaliar neste dia.'}</p></div>`}
      </div>
      ${partsBars(ipl.parts)}
      ${tip ? `<p class="hint sum-tip">${icon('bulb', 'sm')} ${esc(tip)}</p>` : ''}
      <div class="tiles">
        ${tile('Tarefas concluídas', fmtInt(done.length), failed.length ? `${plural(failed.length, 'venceu', 'venceram')}` : '')}
        ${tile('Hábitos', hab.done + hab.missed ? `${hab.done}/${hab.done + hab.missed}` : '–', hab.done + hab.missed ? `${Math.round((hab.done / (hab.done + hab.missed)) * 100)}% em dia` : '')}
        ${tile('XP', fmtSigned(xp + xpLost), xpLost ? `${fmtInt(xp)} ganhos, ${fmtInt(-xpLost)} perdidos` : '')}
        ${tile('Ouro', fmtSigned(gold + goldLost), goldLost ? `${fmtInt(gold)} ganhos, ${fmtInt(-goldLost)} perdidos` : '')}
        ${tile('Água', ml ? fmtMl(ml) : '–', ml ? `meta ${fmtMl(S.prefs.waterGoal || 2000)}` : '')}
        ${tile('Foco', focusSec ? fmtFocus(focusSec) : '–')}
      </div>
      ${mood ? `<p class="sum-mood"><span class="mood-strip"><span class="mo-${mood.id}">${face(mood.id, 22)}</span></span> Humor: <b>${esc(mood.name)}</b></p>` : ''}
      ${best.length ? `<div class="sum-list"><h3>Concluídas</h3><ul>${best.map((t) => `<li>${icon('check', 'sm')}<span translate="no">${esc(t.title)}</span></li>`).join('')}${done.length > best.length ? `<li class="more">e mais ${done.length - best.length}</li>` : ''}</ul></div>` : ''}
      ${failed.length ? `<div class="sum-list neg"><h3>Venceram</h3><ul>${failed.slice(0, 4).map((t) => `<li>${icon('x', 'sm')}<span translate="no">${esc(t.title)}</span></li>`).join('')}${failed.length > 4 ? `<li class="more">e mais ${failed.length - 4}</li>` : ''}</ul></div>` : ''}
      <div class="sheet-actions"><button type="button" class="btn primary" data-close-sum>${live ? 'Fechar' : 'Bora para hoje'}</button></div>
    </div>`,
    onMount(el, close) {
      el.querySelector('[data-close-sum]').onclick = close;
    },
  });
}

/* ---------- Mês ---------- */
export function showMonthSummary(ym) {
  const S = P();
  const rec = S.month.find((m) => m.month === ym && m.days != null) || monthRecord(S, ym);
  if (!rec) return;
  const days = S.score.filter((s) => s.date?.startsWith(ym) && s.score != null).sort((a, b) => a.date.localeCompare(b.date));
  const prev = S.month.find((m) => m.month === addMonths(ym, -1));
  const diff = rec.score != null && prev?.score != null ? rec.score - prev.score : null;
  // Média das partes no mês (só dias com o IPL novo).
  const parts = {};
  for (const p of IPL_PARTS) {
    const vals = days.map((d) => d.parts?.[p.k]).filter((v) => v != null);
    parts[p.k] = vals.length ? sum(vals) / vals.length : null;
  }
  const name = fmtMonth(ym);
  sheet({
    title: `Seu ${MONTHS[Number(ym.slice(5, 7)) - 1]}`,
    wide: true,
    body: `<div class="summary">
      <p class="sum-date">${esc(cap(name))} · ${plural(rec.days || 0, 'dia avaliado', 'dias avaliados')}</p>
      <div class="sum-hero">
        ${rec.score != null ? `<div class="sum-ring" style="--p:${rec.score}"><b>${rec.score}</b><small>IPL</small></div><div><div class="sum-grade">${rec.grade || grade(rec.score)}</div><p>${esc(gradeLine(rec.grade || grade(rec.score)))}</p>${diff != null ? `<p class="hint">${diff === 0 ? 'Igual ao mês anterior.' : `${diff > 0 ? '+' : '−'}${Math.abs(diff)} em relação ao mês anterior.`}</p>` : ''}</div>` : '<div><div class="sum-grade small">Sem nota</div><p>Nenhum dia avaliado neste mês.</p></div>'}
      </div>
      ${days.length > 1 ? `<figure class="card chart-card"><figcaption><b>IPL por dia</b>${rec.best ? `<span>melhor dia: ${Number(rec.best.date.slice(8))}, com ${rec.best.score}</span>` : ''}</figcaption>${line(days.map((p) => ({ value: p.score, label: `${Number(p.date.slice(8))}/${p.date.slice(5, 7)}`, tip: `IPL ${p.score}|${Number(p.date.slice(8))}/${p.date.slice(5, 7)}` })), { ariaLabel: `IPL diário de ${name}` })}</figure>` : ''}
      ${partsBars(parts)}
      <div class="tiles">
        ${tile('Tarefas concluídas', fmtInt(rec.tasksDone || 0), rec.failed ? plural(rec.failed, 'venceu', 'venceram') : '')}
        ${tile('Hábitos em dia', rec.habitsTotal ? `${Math.round(((rec.habitsDone || 0) / rec.habitsTotal) * 100)}%` : '–', rec.habitsTotal ? `${fmtInt(rec.habitsDone)} de ${fmtInt(rec.habitsTotal)}` : '')}
        ${tile('XP ganho', fmtInt(rec.xp || 0), rec.xpLost ? `${fmtInt(-rec.xpLost)} perdidos` : '')}
        ${tile('Ouro ganho', fmtInt(rec.gold || 0), rec.goldLost ? `${fmtInt(-rec.goldLost)} perdidos` : '')}
        ${tile('Foco', rec.focusSec ? fmtFocus(rec.focusSec) : '–')}
      </div>
      <div class="sheet-actions"><button type="button" class="btn primary" data-close-sum>Começar ${ymOf(today()) === addMonths(ym, 1) ? 'o novo mês' : ''}</button></div>
    </div>`,
    onMount(el, close) {
      el.querySelector('[data-close-sum]').onclick = close;
    },
  });
}

/* ---------- Ano ---------- */
// Destaques que não ficam no registro (vêm dos dados do ano): projeto que mais andou, hábito mais
// firme, humor mais comum, água bebida.
function yearHighlights(S, y) {
  const inY = (d) => d && d.startsWith(`${y}-`);
  const out = [];
  const byProj = new Map();
  for (const t of S.task) if (t.done && t.projectId && inY(doneDay(t))) byProj.set(t.projectId, (byProj.get(t.projectId) || 0) + 1);
  const [pid, pn] = [...byProj].sort((a, b) => b[1] - a[1])[0] || [];
  const proj = pid && S.byId.get(pid);
  if (proj) out.push(['folder', 'Projeto que mais andou', esc(proj.name), plural(pn, 'tarefa concluída', 'tarefas concluídas')]);
  let bestH = null;
  for (const h of S.habit) {
    const n = (S.hlogByHabit.get(h.id) || []).filter((l) => inY(l.date) && ((l.count || 0) >= (h.goal || 1) || l.mod)).length;
    if (n && (!bestH || n > bestH.n)) bestH = { h, n };
  }
  if (bestH) out.push(['repeat', 'Hábito mais firme', esc(`${bestH.h.icon ? `${bestH.h.icon} ` : ''}${bestH.h.title || bestH.h.name || 'Hábito'}`), plural(bestH.n, 'dia cumprido', 'dias cumpridos')]);
  const mc = new Map();
  for (const m of S.mood) if (inY(m.date)) mc.set(m.mood, (mc.get(m.mood) || 0) + 1);
  const [mid, mn] = [...mc].sort((a, b) => b[1] - a[1])[0] || [];
  const mood = MOODS.find((m) => m.id === mid);
  if (mood) out.push(['mood', 'Humor mais comum', esc(mood.name), plural(mn, 'dia', 'dias')]);
  const ml = sum(S.water.filter((w) => inY(w.date)), (w) => w.ml || 0);
  if (ml) out.push(['water', 'Água no ano', fmtMl(ml), `${Math.round(ml / 250).toLocaleString(LOC)} copos`]);
  return out;
}

export function showYearSummary(y) {
  const S = P();
  const rec = S.year.find((x) => x.year === y) || yearRecord(S, y);
  if (!rec) return;
  const prev = S.year.find((x) => x.year === y - 1);
  const diff = rec.score != null && prev?.score != null ? rec.score - prev.score : null;
  const mName = (ym) => MONTHS[Number(ym.slice(5, 7)) - 1];
  const scored = rec.months.filter((m) => m.score != null);
  const hl = yearHighlights(S, y);
  sheet({
    title: `Seu ${y}`,
    wide: true,
    body: `<div class="summary year-sum">
      <p class="sum-date">O ano em resumo · ${plural(rec.days || 0, 'dia avaliado', 'dias avaliados')} em ${plural(scored.length, 'mês', 'meses')}</p>
      <div class="sum-hero">
        ${rec.score != null ? `<div class="sum-ring" style="--p:${rec.score}"><b>${rec.score}</b><small>IPL do ano</small></div><div><div class="sum-grade">${rec.grade || grade(rec.score)}</div><p>${esc(gradeLine(rec.grade || grade(rec.score)))}</p><p class="hint">Média das notas dos meses: cada mês pesa igual.${diff != null ? ` ${diff === 0 ? 'Igual a' : `${diff > 0 ? '+' : '−'}${Math.abs(diff)} em relação a`} ${y - 1}.` : ''}</p></div>` : '<div><div class="sum-grade small">Sem nota</div><p>Nenhum mês avaliado neste ano.</p></div>'}
      </div>
      ${scored.length > 1 ? `<figure class="card chart-card"><figcaption><b>IPL por mês</b>${rec.bestMonth ? `<span>melhor: ${esc(mName(rec.bestMonth.month))}, com ${rec.bestMonth.score}</span>` : ''}</figcaption>${columns(Array.from({ length: 12 }, (_, i) => { const m = rec.months.find((x) => Number(x.month.slice(5, 7)) === i + 1); return { label: MSHORT[i], value: m?.score || 0, tip: m?.score != null ? `IPL ${m.score} · ${m.grade}|${cap(MONTHS[i])}` : `Sem nota|${cap(MONTHS[i])}` }; }), { every: 2, ariaLabel: `IPL de cada mês de ${y}` })}</figure>` : ''}
      ${scored.length ? `<div class="past year-months">${scored.map((m) => `<button type="button" data-sum-month="${m.month}"><small>${MSHORT[Number(m.month.slice(5, 7)) - 1]}</small><b>${esc(m.grade)}</b></button>`).join('')}</div>` : ''}
      <div class="tiles">
        ${tile('Tarefas concluídas', fmtInt(rec.tasksDone || 0), rec.failed ? plural(rec.failed, 'venceu', 'venceram') : '')}
        ${tile('Hábitos em dia', rec.habitsTotal ? `${Math.round(((rec.habitsDone || 0) / rec.habitsTotal) * 100)}%` : '–', rec.habitsTotal ? `${fmtInt(rec.habitsDone)} de ${fmtInt(rec.habitsTotal)}` : '')}
        ${tile('XP ganho', fmtInt(rec.xp || 0), rec.xpLost ? `${fmtInt(-rec.xpLost)} perdidos` : '')}
        ${tile('Ouro ganho', fmtInt(rec.gold || 0), rec.goldLost ? `${fmtInt(-rec.goldLost)} perdidos` : '')}
        ${tile('Foco', rec.focusSec ? fmtFocus(rec.focusSec) : '–')}
        ${tile('Melhor dia', rec.bestDay ? String(rec.bestDay.score) : '–', rec.bestDay ? esc(fmtDayLong(rec.bestDay.date)) : '')}
      </div>
      ${hl.length ? `<div class="year-hl">${hl.map(([ic, l, v, s]) => `<div class="yh">${icon(ic)}<div><small>${esc(l)}</small><b>${v}</b><span>${esc(s)}</span></div></div>`).join('')}</div>` : ''}
      ${rec.worstMonth ? `<p class="hint">O mês mais difícil foi ${esc(mName(rec.worstMonth.month))} (${rec.worstMonth.score}). Faz parte: o que conta é a média.</p>` : ''}
      <div class="sheet-actions"><button type="button" class="btn primary" data-close-sum>${Number(today().slice(0, 4)) === y + 1 ? `Bora para ${y + 1}` : 'Fechar'}</button></div>
    </div>`,
    onMount(el, close) {
      el.querySelector('[data-close-sum]').onclick = close;
      el.querySelectorAll('[data-sum-month]').forEach((b) => (b.onclick = () => (close(), setTimeout(() => showMonthSummary(b.dataset.sumMonth), 260))));
    },
  });
}

// Chamado depois da virada do dia: mostra o resumo do mês (se fechou) e o de ontem, uma vez cada.
export function maybeShowSummaries(r) {
  const S = P();
  const d = today();
  const y = addDays(d, -1);
  const s = seen();
  const queue = [];
  const ym = addMonths(ymOf(d), -1);
  if (s.month !== ym && (r?.months?.includes(ym) || S.month.some((m) => m.month === ym && m.days != null))) {
    queue.push(() => showMonthSummary(ym));
    markSeen('month', ym);
  }
  const yr = Number(d.slice(0, 4)) - 1;
  if (s.year !== yr && (r?.years?.includes(yr) || S.year.some((x) => x.year === yr))) {
    queue.push(() => showYearSummary(yr));
    markSeen('year', yr);
  }
  const rec = S.scoreByDate.get(y);
  if (s.day !== y && rec && (rec.score != null || rec.tasksDone || (r?.failed?.length ?? 0))) {
    queue.push(() => showDaySummary(y));
    markSeen('day', y);
  }
  if (!s.day && !s.month && !queue.length) markSeen('day', y);
  // Um de cada vez: o seguinte abre quando o anterior fecha.
  const next = () => {
    const f = queue.shift();
    if (!f) return;
    f();
    const wrap = document.querySelector('.sheet-wrap:last-of-type');
    if (!wrap || !queue.length) return;
    new MutationObserver((_, mo) => {
      if (!wrap.isConnected) {
        mo.disconnect();
        setTimeout(next, 250);
      }
    }).observe(document.body, { childList: true });
  };
  if (queue.length) setTimeout(next, 700);
  return queue.length > 0;
}
