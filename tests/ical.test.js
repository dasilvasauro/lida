// Agendas .ics: eventos simples, dia inteiro, fusos, repetição, exceções e alterações.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.TZ = 'America/Sao_Paulo';
const { parseICS, expandEvents } = await import('../js/core/ical.js');

const cal = (body) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR\r\n`;
const W = [Date.UTC(2026, 10, 1), Date.UTC(2027, 0, 31)];
const iso = (ms) => new Date(ms).toISOString();

test('evento com horário UTC, dobra de linha e escapes', () => {
  const evs = parseICS(cal('BEGIN:VEVENT\r\nUID:a\r\nSUMMARY:Reunião\\, time\r\nLOCATION:Sala 1\r\nDESCRIPTION:linha 1\\nli\r\n nha 2\r\nDTSTART:20261118T130000Z\r\nDTEND:20261118T140000Z\r\nBEGIN:VALARM\r\nTRIGGER:-PT10M\r\nEND:VALARM\r\nEND:VEVENT'));
  const o = expandEvents(evs, ...W);
  assert.equal(o.length, 1);
  assert.equal(o[0].title, 'Reunião, time');
  assert.equal(o[0].desc, 'linha 1\nlinha 2');
  assert.equal(iso(o[0].start), '2026-11-18T13:00:00.000Z');
  assert.equal(o[0].end - o[0].start, 3600000);
});

test('dia inteiro: DTEND é exclusivo', () => {
  const o = expandEvents(parseICS(cal('BEGIN:VEVENT\r\nUID:b\r\nSUMMARY:Feriado\r\nDTSTART;VALUE=DATE:20261120\r\nDTEND;VALUE=DATE:20261122\r\nEND:VEVENT')), ...W);
  assert.equal(o[0].allDay, true);
  assert.equal(o[0].date, '2026-11-20');
  assert.equal(o[0].endDate, '2026-11-21');
});

test('TZID converte com o fuso certo (inclusive horário de verão de Nova York)', () => {
  const o = expandEvents(parseICS(cal('BEGIN:VEVENT\r\nUID:c\r\nSUMMARY:Call\r\nDTSTART;TZID=America/New_York:20261102T090000\r\nDURATION:PT30M\r\nRRULE:FREQ=DAILY;COUNT=2\r\nEND:VEVENT')), ...W);
  assert.equal(o.length, 2);
  assert.equal(iso(o[0].start), '2026-11-02T14:00:00.000Z'); // EST (-5)
  assert.equal(o[0].end - o[0].start, 30 * 60000);
});

test('semanal com BYDAY, EXDATE e uma ocorrência alterada (RECURRENCE-ID)', () => {
  const ics = cal(
    [
      'BEGIN:VEVENT', 'UID:d', 'SUMMARY:Aula', 'DTSTART;TZID=America/Sao_Paulo:20261102T190000', 'DTEND;TZID=America/Sao_Paulo:20261102T200000',
      'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261118T235959Z', 'EXDATE;TZID=America/Sao_Paulo:20261104T190000', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:d', 'SUMMARY:Aula (remarcada)', 'RECURRENCE-ID;TZID=America/Sao_Paulo:20261111T190000', 'DTSTART;TZID=America/Sao_Paulo:20261112T190000', 'DTEND;TZID=America/Sao_Paulo:20261112T200000', 'END:VEVENT',
    ].join('\r\n'),
  );
  const o = expandEvents(parseICS(ics), ...W);
  const days = o.map((x) => new Date(x.start).toLocaleDateString('sv-SE'));
  // seg 2, (qua 4 apagada), seg 9, (qua 11 → qui 12), seg 16, qua 18
  assert.deepEqual(days, ['2026-11-02', '2026-11-09', '2026-11-12', '2026-11-16', '2026-11-18']);
  assert.equal(o[2].title, 'Aula (remarcada)');
});

test('mensal na última sexta e anual no aniversário; cancelado some', () => {
  const ics = cal(
    [
      'BEGIN:VEVENT', 'UID:e', 'SUMMARY:Fechamento', 'DTSTART:20261127T150000Z', 'RRULE:FREQ=MONTHLY;BYDAY=-1FR;COUNT=3', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:f', 'SUMMARY:Aniversário', 'DTSTART;VALUE=DATE:20001225', 'RRULE:FREQ=YEARLY', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:g', 'SUMMARY:Não vai', 'STATUS:CANCELLED', 'DTSTART:20261119T150000Z', 'END:VEVENT',
    ].join('\r\n'),
  );
  const o = expandEvents(parseICS(ics), ...W);
  const fech = o.filter((x) => x.uid === 'e').map((x) => iso(x.start).slice(0, 10));
  assert.deepEqual(fech, ['2026-11-27', '2026-12-25', '2027-01-29']);
  assert.deepEqual(o.filter((x) => x.uid === 'f').map((x) => x.date), ['2026-12-25']);
  assert.equal(o.some((x) => x.uid === 'g'), false);
});
