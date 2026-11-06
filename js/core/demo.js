// Dados de exemplo do modo demo: algumas semanas de uso, para ver o app "vivo" sem cadastrar nada.
import { personal } from '../state.js';
import { today, nowMs } from '../lib/clock.js';
import { addDays, weekday } from '../lib/util.js';

export async function seedDemo() {
  const d = today();
  const P1 = 'demo_trabalho';
  const P2 = 'demo_casa';
  const items = [
    { type: 'project', id: P1, data: { name: 'Trabalho', color: '#7C8CFF', order: 0 } },
    { type: 'project', id: P2, data: { name: 'Casa', color: '#5FE3B5', order: 1 } },
    { type: 'prefs', id: 'prefs', data: { name: 'Alex', modus: 'punctual', lastDay: d, waterGoal: 2000, waterGlass: 250 } },
    { type: 'task', data: { title: 'Revisar a proposta do cliente', priority: 'P1', due: d, time: '10:00', projectId: P1, notes: 'Conferir prazos e valores antes de enviar.', createdDay: addDays(d, -1) } },
    { type: 'task', data: { title: 'Responder e-mails pendentes', priority: 'P3', due: d, projectId: P1, createdDay: d } },
    { type: 'task', data: { title: 'Escrever o relatório do mês', kind: 'timed', duration: 45, priority: 'P2', due: d, projectId: P1, createdDay: d } },
    { type: 'task', data: { title: 'Arrumar a mesa antes das 18h', kind: 'challenge', priority: 'P3', due: d, createdDay: d } },
    { type: 'task', data: { title: 'Caminhada de 30 minutos', priority: 'P2', due: d, time: '18:30', recurrence: { type: 'daily' }, createdDay: d } },
    {
      type: 'task',
      data: {
        title: 'Organizar a despensa',
        priority: 'P4',
        due: d,
        projectId: P2,
        createdDay: d,
        subtasks: [
          { id: 's1', title: 'Separar o que venceu', done: true },
          { id: 's2', title: 'Limpar as prateleiras', done: false },
          { id: 's3', title: 'Anotar o que falta', done: false },
        ],
      },
    },
    {
      type: 'task',
      id: 'demo_sprint',
      data: {
        title: 'Lançar o site novo',
        kind: 'sprint',
        priority: 'P1',
        start: addDays(d, -4),
        due: addDays(d, 6),
        createdDay: addDays(d, -4),
        subtasks: [
          { id: 'a', title: 'Definir o conteúdo', done: true },
          { id: 'b', title: 'Aprovar o layout', done: true },
          { id: 'c', title: 'Escrever os textos', done: false },
          { id: 'd', title: 'Publicar', done: false },
        ],
      },
    },
    { type: 'task', data: { title: 'Pagar a conta de luz', priority: 'P0', due: addDays(d, -1), projectId: P2, createdDay: addDays(d, -3) } },
    { type: 'task', data: { title: 'Preparar a apresentação de segunda', priority: 'P1', due: addDays(d, 2), projectId: P1, createdDay: d } },
    { type: 'task', data: { title: 'Ligar para o dentista', priority: 'P3', due: addDays(d, 1), time: '09:00', createdDay: d } },
    { type: 'task', data: { title: 'Revisão semanal', priority: 'P2', due: addDays(d, 4), recurrence: { type: 'weekly', weekdays: [weekday(addDays(d, 4))] }, createdDay: d } },
    { type: 'task', data: { title: 'Ideias para as férias', priority: 'P4', createdDay: d } },
    { type: 'task', data: { title: 'Trocar a lâmpada do corredor', priority: 'P4', projectId: P2, createdDay: d } },
    { type: 'task', data: { title: 'Ler um capítulo do livro', priority: 'P3', due: d, done: true, doneAt: nowMs() - 3600000, createdDay: d } },
    { type: 'routine', id: 'demo_manha', data: { title: 'Manhã', items: ['Copo de água', 'Alongar 5 minutos', 'Ver a agenda do dia'], weekdays: [0, 1, 2, 3, 4, 5, 6], color: '#F2C14E' } },
    { type: 'habit', id: 'demo_ler', data: { title: 'Ler', goal: 10, unit: 'páginas', icon: '📚', color: '#7C8CFF', createdDay: addDays(d, -20) } },
    { type: 'habit', id: 'demo_meditar', data: { title: 'Meditar', goal: 1, icon: '🧘', color: '#5FE3B5', createdDay: addDays(d, -20) } },
    { type: 'habit', id: 'demo_treino', data: { title: 'Treinar', goal: 1, icon: '💪', color: '#C08CF5', days: [1, 3, 5], createdDay: addDays(d, -20) } },
    { type: 'quit', id: 'demo_refri', data: { title: 'Refrigerante', lastRelapseAt: nowMs() - 9 * 86400000, checkins: [addDays(d, -2), addDays(d, -1)], rewardCycle: 2 } },
    { type: 'brain', data: { text: 'Marcar o check-up anual', quadrant: 'schedule' } },
    { type: 'brain', data: { text: 'Pesquisar curso de fotografia', quadrant: 'incubator' } },
    { type: 'brain', data: { text: 'Responder a mensagem da Bia', quadrant: 'unorganized' } },
    { type: 'ev', id: 'ev_demo_start', data: { kind: 'import', xp: 2350, gold: 840, vouchers: 6, voucherProgress: 2, items: { luckyCard: 1, magicDice: 1, respite: 1, freeze: 1 }, note: 'Saldo inicial do modo demo' } },
  ];
  // Histórico dos hábitos: as últimas semanas, com alguns dias falhados para parecer real.
  for (let i = 1; i <= 20; i++) {
    const day = addDays(d, -i);
    if (i % 6 !== 0) items.push({ type: 'hlog', id: `hl_demo_ler_${day}`, data: { habitId: 'demo_ler', date: day, count: 10 } });
    if (i < 9 || i % 4 === 1) items.push({ type: 'hlog', id: `hl_demo_meditar_${day}`, data: { habitId: 'demo_meditar', date: day, count: 1 } });
    if ([1, 3, 5].includes(weekday(day)) && i % 5 !== 0) items.push({ type: 'hlog', id: `hl_demo_treino_${day}`, data: { habitId: 'demo_treino', date: day, count: 1 } });
  }
  items.push({ type: 'hlog', id: `hl_demo_ler_${d}`, data: { habitId: 'demo_ler', date: d, count: 4 } });
  items.push({ type: 'water', id: 'wa_demo1', data: { date: d, ml: 250, at: nowMs() - 7200000 } }, { type: 'water', id: 'wa_demo2', data: { date: d, ml: 500, at: nowMs() - 3600000 } });
  await personal.saveMany(items);
}
