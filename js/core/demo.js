// Dados de exemplo do modo demo: algumas semanas de uso, para ver o app "vivo" sem cadastrar nada.
import { personal } from '../state.js';
import { today, nowMs } from '../lib/clock.js';
import { addDays, weekday, addMonths } from '../lib/util.js';
import { lang } from './i18n.js';

// Os dados de exemplo no idioma do app (o que não está aqui fica como está).
const DEMO = {
  Trabalho: ['Work', 'Trabajo'],
  Casa: ['Home', 'Casa'],
  contas: ['bills', 'cuentas'],
  rápido: ['quick', 'rápido'],
  'Revisar a proposta do cliente': ["Review the client's proposal", 'Revisar la propuesta del cliente'],
  'Conferir prazos e **valores** antes de enviar.\n- [x] Planilha de custos\n- [ ] Revisar o contrato\nModelo: https://exemplo.com/proposta': ['Check deadlines and **amounts** before sending.\n- [x] Cost spreadsheet\n- [ ] Review the contract\nTemplate: https://example.com/proposal', 'Revisar plazos y **montos** antes de enviar.\n- [x] Hoja de costos\n- [ ] Revisar el contrato\nModelo: https://ejemplo.com/propuesta'],
  'Responder e-mails pendentes': ['Answer pending emails', 'Responder correos pendientes'],
  'Escrever o relatório do mês': ["Write the month's report", 'Escribir el informe del mes'],
  'Arrumar a mesa antes das 18h': ['Tidy the desk before 6 pm', 'Ordenar el escritorio antes de las 18 h'],
  'Caminhada de 30 minutos': ['30-minute walk', 'Caminata de 30 minutos'],
  'Organizar a despensa': ['Organize the pantry', 'Organizar la despensa'],
  'Separar o que venceu': ["Sort out what's expired", 'Separar lo que caducó'],
  'Limpar as prateleiras': ['Clean the shelves', 'Limpiar los estantes'],
  'Anotar o que falta': ["Write down what's missing", 'Anotar lo que falta'],
  'Lançar o site novo': ['Launch the new website', 'Lanzar el sitio nuevo'],
  'Definir o conteúdo': ['Define the content', 'Definir el contenido'],
  'Aprovar o layout': ['Approve the layout', 'Aprobar el diseño'],
  'Escrever os textos': ['Write the copy', 'Escribir los textos'],
  Publicar: ['Publish', 'Publicar'],
  'Pagar a conta de luz': ['Pay the electricity bill', 'Pagar la factura de la luz'],
  'Preparar a apresentação de segunda': ["Prepare Monday's presentation", 'Preparar la presentación del lunes'],
  'Ligar para o dentista': ['Call the dentist', 'Llamar al dentista'],
  'Revisão semanal': ['Weekly review', 'Revisión semanal'],
  'Ideias para as férias': ['Vacation ideas', 'Ideas para las vacaciones'],
  'Trocar a lâmpada do corredor': ['Change the hallway light bulb', 'Cambiar la bombilla del pasillo'],
  'Ler um capítulo do livro': ['Read a chapter of the book', 'Leer un capítulo del libro'],
  Manhã: ['Morning', 'Mañana'],
  'Copo de água': ['Glass of water', 'Vaso de agua'],
  'Alongar 5 minutos': ['Stretch for 5 minutes', 'Estirarse 5 minutos'],
  'Ver a agenda do dia': ["Check the day's schedule", 'Ver la agenda del día'],
  Ler: ['Read', 'Leer'],
  páginas: ['pages', 'páginas'],
  Meditar: ['Meditate', 'Meditar'],
  Treinar: ['Work out', 'Entrenar'],
  Refrigerante: ['Soda', 'Refrescos'],
  'Marcar o check-up anual': ['Book the annual check-up', 'Pedir el chequeo anual'],
  'Pesquisar curso de fotografia': ['Look up a photography course', 'Buscar un curso de fotografía'],
  'Responder a mensagem da Bia': ["Reply to Bia's message", 'Responder el mensaje de Bia'],
  'Correr 10 km': ['Run 10 km', 'Correr 10 km'],
  'Ler 12 livros no ano': ['Read 12 books this year', 'Leer 12 libros en el año'],
  'Aprender violão': ['Learn guitar', 'Aprender guitarra'],
  Paciência: ['Patience', 'Paciencia'],
  Constância: ['Consistency', 'Constancia'],
  Procrastinar: ['Procrastinating', 'Procrastinar'],
  'O que aprendi este mês': ['What I learned this month', 'Lo que aprendí este mes'],
  'Feito é melhor que perfeito.': ['Done is better than perfect.', 'Hecho es mejor que perfecto.'],
  'Descansar também é produtivo.': ['Resting is productive too.', 'Descansar también es productivo.'],
  'Uma tarefa por vez.': ['One task at a time.', 'Una tarea a la vez.'],
};
function localize(v, i) {
  if (typeof v === 'string') {
    if (DEMO[v]) return DEMO[v][i];
    const old = /^Tarefa antiga (.+)$/.exec(v);
    return old ? `${['Old task', 'Tarea antigua'][i]} ${old[1]}` : v;
  }
  if (Array.isArray(v)) return v.map((x) => localize(x, i));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ['note', 'kind', 'quadrant', 'mood', 'priority', 'grade'].includes(k) ? x : localize(x, i)]));
  return v;
}

export async function seedDemo() {
  const d = today();
  const P1 = 'demo_trabalho';
  const P2 = 'demo_casa';
  const items = [
    { type: 'project', id: P1, data: { name: 'Trabalho', color: '#7C8CFF', order: 0 } },
    { type: 'project', id: P2, data: { name: 'Casa', color: '#5FE3B5', order: 1 } },
    { type: 'tag', id: 'demo_tag_contas', data: { name: 'contas', color: '#F2C14E' } },
    { type: 'tag', id: 'demo_tag_rapido', data: { name: 'rápido', color: '#59C3F0' } },
    { type: 'prefs', id: 'prefs', data: { name: 'Alex', modus: 'punctual', lastDay: d, waterGoal: 2000, waterGlass: 250 } },
    { type: 'task', data: { title: 'Revisar a proposta do cliente', priority: 'P1', due: d, time: '10:00', projectId: P1, notes: 'Conferir prazos e **valores** antes de enviar.\n- [x] Planilha de custos\n- [ ] Revisar o contrato\nModelo: https://exemplo.com/proposta', createdDay: addDays(d, -1) } },
    { type: 'task', data: { title: 'Responder e-mails pendentes', priority: 'P3', due: d, projectId: P1, tags: ['demo_tag_rapido'], createdDay: d } },
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
    { type: 'task', data: { title: 'Pagar a conta de luz', priority: 'P0', due: addDays(d, -1), projectId: P2, tags: ['demo_tag_contas'], createdDay: addDays(d, -3) } },
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
  // Humor, IPL, XP e tarefas concluídas nos dias anteriores (alimentam a aba Eu).
  const MO = ['happy', 'radiant', 'normal', 'happy', 'annoyed', 'happy', 'normal', 'radiant', 'happy', 'disappointed'];
  for (let i = 1; i <= 24; i++) {
    const day = addDays(d, -i);
    if (i % 7 !== 3) items.push({ type: 'mood', id: `md_${day}`, data: { date: day, mood: MO[i % MO.length] } });
    const n = 1 + ((i * 7) % 5);
    const sc = 58 + ((i * 13) % 37);
    const parts = { exec: Math.min(1, sc / 90), habits: i % 5 ? 0.9 : 0.5, steady: 1, proj: i % 2 ? 0.7 : 0.4, plan: 0.8, focus: i % 3 === 0 ? 0.5 : null };
    items.push({ type: 'score', id: `sc_${day}`, data: { date: day, score: sc, parts, v: 2, tasksDone: n, habitsDone: 2, habitsTotal: i % 5 ? 2 : 3, penalties: i % 4 === 0 ? 1 : 0 } });
    items.push({ type: 'ev', id: `ev_demo_xp_${day}`, data: { kind: 'done', date: day, xp: 40 + ((i * 53) % 180), gold: 15 + ((i * 17) % 60) } });
    for (let k = 0; k < n; k++) items.push({ type: 'task', data: { title: `Tarefa antiga ${i}.${k + 1}`, priority: 'P3', due: day, done: true, doneAt: new Date(`${day}T${String(9 + k).padStart(2, '0')}:00`).getTime(), createdDay: day } });
    if (i % 3 === 0) items.push({ type: 'ev', id: `ev_focus_demo_${i}`, data: { kind: 'focus', date: day, focusSec: 1500 } });
  }
  // Meses fechados (resumo do mês na aba Eu).
  [
    [1, 76, 'C+', 48, 0.81],
    [2, 84, 'B', 55, 0.88],
  ].forEach(([back, score, grade, tasksDone, hp]) => {
    const ym = addMonths(d.slice(0, 7), -back);
    items.push({ type: 'month', id: `mo_${ym}`, data: { month: ym, score, grade, days: 26, tasksDone, failed: 4, habitsDone: Math.round(78 * hp), habitsTotal: 78, xp: 3900, xpLost: -220, gold: 1450, goldLost: -90, focusSec: 21600, best: { date: `${ym}-14`, score: 97 } } });
  });
  items.push({ type: 'vision', id: 'vision', data: { goals: [{ id: 'g1', title: 'Correr 10 km', state: 3 }, { id: 'g2', title: 'Ler 12 livros no ano', state: 4 }, { id: 'g3', title: 'Aprender violão', state: 1 }], develop: ['Paciência', 'Constância'], abandon: ['Procrastinar'], checkpoints: [addDays(d, 6), addDays(d, 16)] } });
  items.push({ type: 'refl', id: 'demo_refl', data: { title: 'O que aprendi este mês', color: '#C08CF5', cards: ['Feito é melhor que perfeito.', 'Descansar também é produtivo.', 'Uma tarefa por vez.'] } });
  items.push({ type: 'hlog', id: `hl_demo_ler_${d}`, data: { habitId: 'demo_ler', date: d, count: 4 } });
  items.push({ type: 'water', id: 'wa_demo1', data: { date: d, ml: 250, at: nowMs() - 7200000 } }, { type: 'water', id: 'wa_demo2', data: { date: d, ml: 500, at: nowMs() - 3600000 } });
  const i = { en: 0, es: 1 }[lang()];
  await personal.saveMany(i == null ? items : items.map((r) => ({ ...r, data: localize(r.data, i) })));
}
