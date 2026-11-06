// Dados de exemplo do modo demo: algumas semanas de uso, para ver o app "vivo" sem cadastrar nada.
import { personal } from '../state.js';
import { today } from '../lib/clock.js';
import { addDays } from '../lib/util.js';

export async function seedDemo() {
  const d = today();
  const P1 = 'demo_trabalho';
  const P2 = 'demo_casa';
  const items = [
    { type: 'project', id: P1, data: { name: 'Trabalho', color: '#7C8CFF', order: 0 } },
    { type: 'project', id: P2, data: { name: 'Casa', color: '#5FE3B5', order: 1 } },
    { type: 'prefs', id: 'prefs', data: { name: 'Alex' } },
    { type: 'task', data: { title: 'Revisar a proposta do cliente', priority: 'P1', due: d, time: '10:00', projectId: P1, notes: 'Conferir prazos e valores antes de enviar.' } },
    { type: 'task', data: { title: 'Responder e-mails pendentes', priority: 'P3', due: d, projectId: P1 } },
    { type: 'task', data: { title: 'Caminhada de 30 minutos', priority: 'P2', due: d, time: '18:30', recurrence: { type: 'daily' } } },
    {
      type: 'task',
      data: {
        title: 'Organizar a despensa',
        priority: 'P4',
        due: d,
        projectId: P2,
        subtasks: [
          { id: 's1', title: 'Separar o que venceu', done: true },
          { id: 's2', title: 'Limpar as prateleiras', done: false },
          { id: 's3', title: 'Anotar o que falta', done: false },
        ],
      },
    },
    { type: 'task', data: { title: 'Pagar a conta de luz', priority: 'P0', due: addDays(d, -1), projectId: P2 } },
    { type: 'task', data: { title: 'Preparar a apresentação de segunda', priority: 'P1', due: addDays(d, 2), projectId: P1 } },
    { type: 'task', data: { title: 'Ligar para o dentista', priority: 'P3', due: addDays(d, 1), time: '09:00' } },
    { type: 'task', data: { title: 'Revisão semanal', priority: 'P2', due: addDays(d, 4), recurrence: { type: 'weekly', weekdays: [new Date(`${addDays(d, 4)}T12:00`).getDay()] } } },
    { type: 'task', data: { title: 'Ideias para as férias', priority: 'P4' } },
    { type: 'task', data: { title: 'Trocar a lâmpada do corredor', priority: 'P4', projectId: P2 } },
    { type: 'task', data: { title: 'Ler um capítulo do livro', priority: 'P3', due: d, done: true, doneAt: Date.now() - 3600000 } },
    { type: 'ev', id: 'ev_demo_start', data: { kind: 'import', xp: 2350, gold: 840, note: 'Saldo inicial do modo demo' } },
  ];
  await personal.saveMany(items);
}
