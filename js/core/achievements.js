// Conquistas: metas de longo prazo em sete grupos (tarefas, IPL do mês, água, sequências, hábitos,
// dias seguidos usando o Lida e atividade nos dias de folga). Cada uma paga ouro de acordo com a
// dificuldade, e o ouro é resgatado à mão (na aba Eu > Conquistas).
//
// Registros: ach_<id> { id, at, claimed?, retro? } guarda o desbloqueio (uma vez desbloqueada, fica,
// mesmo que o número caia depois); o ouro vem num evento com id fixo (ev_ach_<id>), então dois
// aparelhos não pagam em dobro. O histórico conta: na primeira vez, o que a pessoa já tinha feito
// desbloqueia de uma vez (retro), sem uma animação para cada.
import { personal, P } from '../state.js';
import { addDays, sum, weekday, isoOfMs } from '../lib/util.js';
import { today } from '../lib/clock.js';
import { isDone, isScheduled, bestStreak, daysClean } from './habits.js';
import { strip } from './tasks.js';
import { tr, fill, num } from './i18n.js';

// Ouro por dificuldade.
export const TIER_GOLD = { 1: 100, 2: 250, 3: 600, 4: 1400, 5: 3000 };
export const TIER_NAME = {
  1: { pt: 'Bronze', en: 'Bronze', es: 'Bronce' },
  2: { pt: 'Prata', en: 'Silver', es: 'Plata' },
  3: { pt: 'Ouro', en: 'Gold', es: 'Oro' },
  4: { pt: 'Platina', en: 'Platinum', es: 'Platino' },
  5: { pt: 'Diamante', en: 'Diamond', es: 'Diamante' },
};

export const CATS = {
  tasks: { icon: 'list', name: { pt: 'Tarefas', en: 'Tasks', es: 'Tareas' } },
  ipl: { icon: 'chart', name: { pt: 'IPL do mês', en: 'Monthly IPL', es: 'IPL del mes' } },
  water: { icon: 'water', name: { pt: 'Água', en: 'Water', es: 'Agua' } },
  streak: { icon: 'flame', name: { pt: 'Sequências', en: 'Streaks', es: 'Rachas' } },
  habit: { icon: 'habit', name: { pt: 'Hábitos', en: 'Habits', es: 'Hábitos' } },
  active: { icon: 'today', name: { pt: 'Dias seguidos', en: 'Days in a row', es: 'Días seguidos' } },
  off: { icon: 'coffee', name: { pt: 'Dias de folga', en: 'Days off', es: 'Días libres' } },
  journey: { icon: 'compass', name: { pt: 'Jornada', en: 'Journey', es: 'Trayectoria' } },
};

// [id, grupo, ícone, dificuldade, métrica, meta, nome, descrição]  ({n} = meta)
const L = (pt, en, es) => ({ pt, en, es });
const T_CREATE = L('Crie {n} tarefas.', 'Create {n} tasks.', 'Crea {n} tareas.');
const T_DONE = L('Conclua {n} tarefas.', 'Complete {n} tasks.', 'Completa {n} tareas.');
const M_AVG = L('Termine um mês com IPL médio de {n} ou mais.', 'Finish a month with an average IPL of {n} or more.', 'Termina un mes con un IPL medio de {n} o más.');
const W_TOTAL = L('Beba {n} litros, somando tudo.', 'Drink {n} liters in total.', 'Bebe {n} litros en total.');
const W_RUN = L('Bata a meta de água {n} dias seguidos.', 'Reach your water goal {n} days in a row.', 'Alcanza tu meta de agua {n} días seguidos.');
const W_DAYS = L('Bata a meta de água em {n} dias.', 'Reach your water goal on {n} days.', 'Alcanza tu meta de agua en {n} días.');
const H_RUN = L('Chegue a {n} dias seguidos num hábito.', 'Reach a {n}-day streak on a habit.', 'Llega a una racha de {n} días en un hábito.');
const CI_RUN = L('Resgate o prêmio do dia {n} dias seguidos.', 'Claim the daily prize {n} days in a row.', 'Reclama el premio del día {n} días seguidos.');
const Q_RUN = L('Fique {n} dias sem um mau hábito do Desapego.', 'Stay {n} days away from a bad habit in Let Go.', 'Pasa {n} días sin un mal hábito en Desapego.');
const H_DONE = L('Cumpra hábitos {n} vezes.', 'Complete habits {n} times.', 'Cumple hábitos {n} veces.');
const H_PERF = L('Cumpra todos os hábitos do dia em {n} dias.', 'Complete every habit of the day on {n} days.', 'Cumple todos los hábitos del día en {n} días.');
const A_RUN = L('Use o Lida {n} dias seguidos.', 'Use Lida {n} days in a row.', 'Usa Lida {n} días seguidos.');
const A_TOT = L('Use o Lida em {n} dias (não precisam ser seguidos).', 'Use Lida on {n} days (not necessarily in a row).', 'Usa Lida en {n} días (no hace falta que sean seguidos).');
const O_ACT = L('Faça alguma coisa em {n} dias de folga.', 'Get something done on {n} days off.', 'Haz algo en {n} días libres.');
const O_TASK = L('Conclua {n} tarefas em dias de folga.', 'Complete {n} tasks on days off.', 'Completa {n} tareas en días libres.');
const O_HAB = L('Cumpra hábitos {n} vezes em dias de folga.', 'Complete habits {n} times on days off.', 'Cumple hábitos {n} veces en días libres.');
const J_LVL = L('Chegue ao nível {n}.', 'Reach level {n}.', 'Llega al nivel {n}.');
const J_FOCUS = L('Some {n} horas de foco no Pomodoro.', 'Log {n} hours of Pomodoro focus.', 'Suma {n} horas de enfoque en Pomodoro.');
const J_MOOD = L('Registre o seu humor em {n} dias.', 'Log your mood on {n} days.', 'Registra tu ánimo en {n} días.');
const DEFS = [
  // Tarefas criadas e concluídas
  ['t_c1', 'tasks', 'pencil', 1, 'created', 1, L('Primeira anotação', 'First note', 'Primera nota'), L('Crie a sua primeira tarefa.', 'Create your first task.', 'Crea tu primera tarea.')],
  ['t_c10', 'tasks', 'notebook', 1, 'created', 10, L('Lista começando', 'List in the making', 'Lista en marcha'), T_CREATE],
  ['t_c50', 'tasks', 'bulb', 2, 'created', 50, L('Cabeça vazia', 'Clear head', 'Mente despejada'), L('Crie {n} tarefas: tudo fora da cabeça e dentro do Lida.', 'Create {n} tasks: out of your head and into Lida.', 'Crea {n} tareas: todo fuera de tu cabeza y dentro de Lida.')],
  ['t_c100', 'tasks', 'layers', 2, 'created', 100, L('Centena de planos', 'A hundred plans', 'Cien planes'), T_CREATE],
  ['t_c250', 'tasks', 'puzzle', 3, 'created', 250, L('Arquiteto de listas', 'List architect', 'Arquitecto de listas'), T_CREATE],
  ['t_c500', 'tasks', 'inbox', 4, 'created', 500, L('Caixa de entrada infinita', 'Bottomless inbox', 'Bandeja sin fondo'), T_CREATE],
  ['t_c1000', 'tasks', 'infinity', 5, 'created', 1000, L('Mil ideias', 'A thousand ideas', 'Mil ideas'), L('Crie {n} tarefas. Nenhuma ideia se perde mais.', 'Create {n} tasks. No idea gets lost anymore.', 'Crea {n} tareas. Ninguna idea se pierde más.')],
  ['t_d1', 'tasks', 'check', 1, 'done', 1, L('Primeiro risco', 'First tick', 'Primera tachada'), L('Conclua a sua primeira tarefa.', 'Complete your first task.', 'Completa tu primera tarea.')],
  ['t_d10', 'tasks', 'checks', 1, 'done', 10, L('Esquentando', 'Warming up', 'Calentando'), T_DONE],
  ['t_d50', 'tasks', 'stairs', 2, 'done', 50, L('Pegando o ritmo', 'Getting the hang of it', 'Agarrando el ritmo'), T_DONE],
  ['t_d200', 'tasks', 'rocket', 3, 'done', 200, L('Máquina de concluir', 'Finishing machine', 'Máquina de terminar'), T_DONE],
  ['t_d500', 'tasks', 'mountain', 4, 'done', 500, L('Quinhentas a menos', 'Five hundred down', 'Quinientas menos'), T_DONE],
  ['t_d1000', 'tasks', 'trophy', 5, 'done', 1000, L('Lenda das listas', 'List legend', 'Leyenda de las listas'), T_DONE],
  ['t_p0', 'tasks', 'flag', 3, 'doneP0', 25, L('Apagando incêndios', 'Firefighter', 'Apagafuegos'), L('Conclua {n} tarefas P0.', 'Complete {n} P0 tasks.', 'Completa {n} tareas P0.')],
  ['t_p0b', 'tasks', 'swords', 4, 'doneP0', 100, L('Linha de frente', 'Front line', 'Primera línea'), L('Conclua {n} tarefas P0.', 'Complete {n} P0 tasks.', 'Completa {n} tareas P0.')],
  ['t_day10', 'tasks', 'bolt', 3, 'bestDayDone', 10, L('Dia cheio', 'Full day', 'Día completo'), L('Conclua {n} tarefas num mesmo dia.', 'Complete {n} tasks in a single day.', 'Completa {n} tareas en un mismo día.')],
  ['t_day20', 'tasks', 'bolt', 4, 'bestDayDone', 20, L('Rolo compressor', 'Steamroller', 'Apisonadora'), L('Conclua {n} tarefas num mesmo dia.', 'Complete {n} tasks in a single day.', 'Completa {n} tareas en un mismo día.')],
  ['t_sprint', 'tasks', 'sprintFlag', 2, 'sprints', 1, L('Linha de chegada', 'Finish line', 'Línea de meta'), L('Termine um sprint.', 'Finish a sprint.', 'Termina un sprint.')],
  ['t_sprint5', 'tasks', 'sprintFlag', 4, 'sprints', 5, L('Maratonista', 'Marathoner', 'Maratonista'), L('Termine {n} sprints.', 'Finish {n} sprints.', 'Termina {n} sprints.')],
  ['t_chal', 'tasks', 'target', 1, 'challenges', 1, L('Desafio aceito', 'Challenge accepted', 'Desafío aceptado'), L('Conclua um Desafio do dia.', 'Complete a Daily challenge.', 'Completa un Desafío del día.')],
  ['t_chal30', 'tasks', 'target', 3, 'challenges', 30, L('Caçador de desafios', 'Challenge hunter', 'Cazador de desafíos'), L('Conclua {n} Desafios do dia.', 'Complete {n} Daily challenges.', 'Completa {n} Desafíos del día.')],
  ['t_early', 'tasks', 'bird', 2, 'early', 10, L('Madrugador', 'Early bird', 'Madrugador'), L('Conclua {n} tarefas antes das 8h.', 'Complete {n} tasks before 8 a.m.', 'Completa {n} tareas antes de las 8.')],
  ['t_late', 'tasks', 'owl', 2, 'late', 10, L('Coruja', 'Night owl', 'Búho'), L('Conclua {n} tarefas depois das 22h.', 'Complete {n} tasks after 10 p.m.', 'Completa {n} tareas después de las 22.')],
  ['t_subs', 'tasks', 'list', 2, 'subsDone', 50, L('Passo a passo', 'Step by step', 'Paso a paso'), L('Conclua {n} subtarefas.', 'Complete {n} subtasks.', 'Completa {n} subtareas.')],
  ['t_proj', 'tasks', 'folder', 1, 'projects', 3, L('Tudo no lugar', 'Everything in its place', 'Todo en su sitio'), L('Crie {n} projetos.', 'Create {n} projects.', 'Crea {n} proyectos.')],
  ['t_tags', 'tasks', 'tags', 1, 'tags', 5, L('Etiquetador', 'Labeler', 'Etiquetador'), L('Crie {n} etiquetas.', 'Create {n} tags.', 'Crea {n} etiquetas.')],

  // IPL
  ['m_first', 'ipl', 'calCheck', 1, 'months', 1, L('Primeiro boletim', 'First report card', 'Primer boletín'), L('Feche um mês com nota no IPL.', 'Close a month with an IPL score.', 'Cierra un mes con nota en el IPL.')],
  ['m60', 'ipl', 'gauge', 2, 'bestMonth', 60, L('Mês aprovado', 'Passing month', 'Mes aprobado'), M_AVG],
  ['m70', 'ipl', 'chartUp', 2, 'bestMonth', 70, L('Mês consistente', 'Steady month', 'Mes constante'), M_AVG],
  ['m80', 'ipl', 'medal', 3, 'bestMonth', 80, L('Mês de respeito', 'Respectable month', 'Mes de respeto'), M_AVG],
  ['m85', 'ipl', 'star', 3, 'bestMonth', 85, L('Mês brilhante', 'Shining month', 'Mes brillante'), M_AVG],
  ['m90', 'ipl', 'gem', 4, 'bestMonth', 90, L('Mês nota A', 'Straight-A month', 'Mes de sobresaliente'), M_AVG],
  ['m95', 'ipl', 'crown', 5, 'bestMonth', 95, L('Mês impecável', 'Flawless month', 'Mes impecable'), M_AVG],
  ['m_run3', 'ipl', 'stairs', 4, 'monthRun70', 3, L('Trimestre firme', 'Solid quarter', 'Trimestre firme'), L('Termine {n} meses seguidos com IPL médio de 70 ou mais.', 'Finish {n} months in a row with an average IPL of 70 or more.', 'Termina {n} meses seguidos con un IPL medio de 70 o más.')],
  ['m_six80', 'ipl', 'trophy', 5, 'months80', 6, L('Semestre de ouro', 'Golden semester', 'Semestre de oro'), L('Termine {n} meses com IPL médio de 80 ou mais.', 'Finish {n} months with an average IPL of 80 or more.', 'Termina {n} meses con un IPL medio de 80 o más.')],
  ['d100', 'ipl', 'sparkles', 2, 'days100', 1, L('Dia nota 100', 'A perfect 100', 'Un 100 perfecto'), L('Feche um dia com IPL 100.', 'Close a day with an IPL of 100.', 'Cierra un día con IPL 100.')],
  ['d100x10', 'ipl', 'sparkles', 4, 'days100', 10, L('Colecionador de 100', '100 collector', 'Coleccionista de 100'), L('Feche {n} dias com IPL 100.', 'Close {n} days with an IPL of 100.', 'Cierra {n} días con IPL 100.')],
  ['d90x30', 'ipl', 'calStar', 3, 'days90', 30, L('Trinta dias de A', 'Thirty A days', 'Treinta días de A'), L('Feche {n} dias com IPL 90 ou mais.', 'Close {n} days with an IPL of 90 or more.', 'Cierra {n} días con IPL 90 o más.')],

  // Água
  ['w_goal1', 'water', 'glass', 1, 'waterGoalDays', 1, L('Primeiro gole', 'First sip', 'Primer sorbo'), L('Bata a meta de água de um dia.', 'Reach your daily water goal.', 'Alcanza tu meta diaria de agua.')],
  ['w_10l', 'water', 'water', 1, 'waterL', 10, L('Dez litros', 'Ten liters', 'Diez litros'), W_TOTAL],
  ['w_100l', 'water', 'drops', 2, 'waterL', 100, L('Caixa-d’água', 'Water tank', 'Tinaco'), W_TOTAL],
  ['w_500l', 'water', 'wave', 4, 'waterL', 500, L('Piscina pessoal', 'Personal pool', 'Piscina personal'), W_TOTAL],
  ['w_1000l', 'water', 'anchor', 5, 'waterL', 1000, L('Mil litros', 'A thousand liters', 'Mil litros'), W_TOTAL],
  ['w_3l', 'water', 'drops', 2, 'waterBestDay', 3, L('Camelo ao contrário', 'Reverse camel', 'Camello al revés'), L('Beba {n} litros num mesmo dia.', 'Drink {n} liters in a single day.', 'Bebe {n} litros en un mismo día.')],
  ['w_goal30', 'water', 'calCheck', 3, 'waterGoalDays', 30, L('Hidratado', 'Well hydrated', 'Bien hidratado'), W_DAYS],
  ['w_goal100', 'water', 'calStar', 4, 'waterGoalDays', 100, L('Cem dias molhados', 'A hundred wet days', 'Cien días mojados'), W_DAYS],
  ['w_run7', 'water', 'umbrella', 2, 'waterRun', 7, L('Semana molhada', 'Wet week', 'Semana mojada'), W_RUN],
  ['w_run30', 'water', 'wave', 4, 'waterRun', 30, L('Fonte inesgotável', 'Endless spring', 'Manantial inagotable'), W_RUN],
  ['w_run100', 'water', 'gem', 5, 'waterRun', 100, L('Oceano', 'Ocean', 'Océano'), W_RUN],

  // Sequências
  ['s_h7', 'streak', 'flame', 1, 'habitBest', 7, L('Uma semana firme', 'One solid week', 'Una semana firme'), H_RUN],
  ['s_h14', 'streak', 'flame', 2, 'habitBest', 14, L('Duas semanas', 'Two weeks', 'Dos semanas'), H_RUN],
  ['s_h30', 'streak', 'calendar', 3, 'habitBest', 30, L('Um mês sem falhar', 'A month without missing', 'Un mes sin fallar'), H_RUN],
  ['s_h66', 'streak', 'seed', 4, 'habitBest', 66, L('Hábito formado', 'Habit formed', 'Hábito formado'), L('Chegue a {n} dias seguidos num hábito (dizem que é o tempo de um hábito pegar).', 'Reach a {n}-day streak on a habit (they say that is how long it takes to stick).', 'Llega a una racha de {n} días en un hábito (dicen que es lo que tarda en quedarse).')],
  ['s_h100', 'streak', 'mountain', 4, 'habitBest', 100, L('Cem dias', 'One hundred days', 'Cien días'), H_RUN],
  ['s_h200', 'streak', 'rocket', 5, 'habitBest', 200, L('Inabalável', 'Unshakable', 'Inquebrantable'), H_RUN],
  ['s_h365', 'streak', 'sun', 5, 'habitBest', 365, L('Volta ao Sol', 'Around the sun', 'Vuelta al sol'), H_RUN],
  ['s_ci7', 'streak', 'gift', 1, 'checkinRun', 7, L('Prêmio completo', 'Full prize', 'Premio completo'), CI_RUN],
  ['s_ci30', 'streak', 'coins', 3, 'checkinRun', 30, L('Assinante fiel', 'Loyal subscriber', 'Suscriptor fiel'), CI_RUN],
  ['s_ci100', 'streak', 'gem', 5, 'checkinRun', 100, L('Cliente VIP', 'VIP member', 'Cliente VIP'), CI_RUN],
  ['s_q7', 'streak', 'shield', 1, 'quitBest', 7, L('Primeira semana limpa', 'First clean week', 'Primera semana limpia'), Q_RUN],
  ['s_q30', 'streak', 'shield', 3, 'quitBest', 30, L('Desapegado', 'Let go', 'Desapegado'), Q_RUN],
  ['s_q100', 'streak', 'feather', 4, 'quitBest', 100, L('Livre', 'Free', 'Libre'), Q_RUN],
  ['s_q365', 'streak', 'bird', 5, 'quitBest', 365, L('Asas próprias', 'Own wings', 'Alas propias'), Q_RUN],

  // Hábitos
  ['h_new1', 'habit', 'seed', 1, 'habitsCreated', 1, L('Primeiro hábito', 'First habit', 'Primer hábito'), L('Crie o seu primeiro hábito.', 'Create your first habit.', 'Crea tu primer hábito.')],
  ['h_new5', 'habit', 'leaf', 2, 'habitsCreated', 5, L('Rotina montada', 'Routine set', 'Rutina armada'), L('Crie {n} hábitos.', 'Create {n} habits.', 'Crea {n} hábitos.')],
  ['h_new10', 'habit', 'flower', 3, 'habitsCreated', 10, L('Jardim de hábitos', 'Habit garden', 'Jardín de hábitos'), L('Crie {n} hábitos.', 'Create {n} habits.', 'Crea {n} hábitos.')],
  ['h_d10', 'habit', 'check', 1, 'habitDone', 10, L('Repetição', 'Repetition', 'Repetición'), H_DONE],
  ['h_d100', 'habit', 'dumbbell', 2, 'habitDone', 100, L('Cem repetições', 'A hundred reps', 'Cien repeticiones'), H_DONE],
  ['h_d500', 'habit', 'compass', 4, 'habitDone', 500, L('No piloto automático', 'On autopilot', 'En piloto automático'), H_DONE],
  ['h_d1000', 'habit', 'trophy', 5, 'habitDone', 1000, L('Mil vezes', 'A thousand times', 'Mil veces'), H_DONE],
  ['h_d2500', 'habit', 'infinity', 5, 'habitDone', 2500, L('Segunda natureza', 'Second nature', 'Segunda naturaleza'), H_DONE],
  ['h_p1', 'habit', 'sparkles', 1, 'perfectDays', 1, L('Dia perfeito', 'Perfect day', 'Día perfecto'), L('Cumpra todos os hábitos do dia.', 'Complete every habit of the day.', 'Cumple todos los hábitos del día.')],
  ['h_p7', 'habit', 'calCheck', 2, 'perfectDays', 7, L('Sete dias perfeitos', 'Seven perfect days', 'Siete días perfectos'), H_PERF],
  ['h_p30', 'habit', 'star', 3, 'perfectDays', 30, L('Trinta dias perfeitos', 'Thirty perfect days', 'Treinta días perfectos'), H_PERF],
  ['h_p100', 'habit', 'crown', 5, 'perfectDays', 100, L('Perfeccionista', 'Perfectionist', 'Perfeccionista'), H_PERF],

  // Dias seguidos usando o Lida
  ['a_r3', 'active', 'sunrise', 1, 'activeRun', 3, L('Voltei', 'I came back', 'Volví'), A_RUN],
  ['a_r7', 'active', 'calendar', 2, 'activeRun', 7, L('Semana completa', 'Full week', 'Semana completa'), A_RUN],
  ['a_r14', 'active', 'calCheck', 2, 'activeRun', 14, L('Quinzena', 'Fortnight', 'Quincena'), A_RUN],
  ['a_r30', 'active', 'calStar', 3, 'activeRun', 30, L('Mês completo', 'Full month', 'Mes completo'), A_RUN],
  ['a_r60', 'active', 'hourglass', 4, 'activeRun', 60, L('Dois meses de casa', 'Two months in', 'Dos meses dentro'), A_RUN],
  ['a_r100', 'active', 'rocket', 4, 'activeRun', 100, L('Cem dias de casa', 'A hundred days in', 'Cien días dentro'), A_RUN],
  ['a_r180', 'active', 'mountain', 5, 'activeRun', 180, L('Meio ano', 'Half a year', 'Medio año'), A_RUN],
  ['a_r365', 'active', 'sun', 5, 'activeRun', 365, L('Um ano inteiro', 'A whole year', 'Un año entero'), A_RUN],
  ['a_t30', 'active', 'heart', 1, 'activeDays', 30, L('Já é da casa', 'Part of the family', 'Ya es de la casa'), A_TOT],
  ['a_t100', 'active', 'medal', 3, 'activeDays', 100, L('Cliente da casa', 'Regular', 'Cliente de la casa'), A_TOT],
  ['a_t365', 'active', 'gem', 5, 'activeDays', 365, L('Veterano', 'Veteran', 'Veterano'), A_TOT],

  // Dias de folga
  ['o_1', 'off', 'coffee', 1, 'offActive', 1, L('Folga produtiva', 'Productive day off', 'Día libre productivo'), L('Faça alguma coisa num dia de folga.', 'Get something done on a day off.', 'Haz algo en un día libre.')],
  ['o_10', 'off', 'umbrella', 2, 'offActive', 10, L('Sem fim de semana', 'No weekend for me', 'Sin fin de semana'), O_ACT],
  ['o_25', 'off', 'palm', 3, 'offActive', 25, L('Férias ativas', 'Active vacation', 'Vacaciones activas'), O_ACT],
  ['o_50', 'off', 'bed', 4, 'offActive', 50, L('Folga é estado de espírito', 'Days off are a state of mind', 'Libre es un estado mental'), O_ACT],
  ['o_100', 'off', 'gem', 5, 'offActive', 100, L('Descanso? Nunca ouvi falar', 'Rest? Never heard of it', '¿Descanso? Nunca lo oí'), O_ACT],
  ['o_t5', 'off', 'checks', 1, 'offTasks', 5, L('Adiantando um pouco', 'A little head start', 'Adelantando un poco'), O_TASK],
  ['o_t20', 'off', 'stairs', 3, 'offTasks', 20, L('Adiantando a semana', 'Getting ahead', 'Adelantando la semana'), O_TASK],
  ['o_t100', 'off', 'rocket', 4, 'offTasks', 100, L('Segunda-feira sem susto', 'Monday without dread', 'Lunes sin sustos'), O_TASK],
  ['o_h30', 'off', 'leaf', 3, 'offHabits', 30, L('Hábito não tira folga', 'Habits never rest', 'Los hábitos no descansan'), O_HAB],
  ['o_h100', 'off', 'flower', 4, 'offHabits', 100, L('Florescendo no descanso', 'Blooming at rest', 'Floreciendo en el descanso'), O_HAB],

  // Jornada
  ['j_l5', 'journey', 'stairs', 1, 'level', 5, L('Subindo', 'Climbing', 'Subiendo'), J_LVL],
  ['j_l10', 'journey', 'medal', 2, 'level', 10, L('Dois dígitos', 'Double digits', 'Dos dígitos'), J_LVL],
  ['j_l25', 'journey', 'mountain', 4, 'level', 25, L('Metade do caminho', 'Halfway there', 'A mitad de camino'), J_LVL],
  ['j_l50', 'journey', 'crown', 5, 'level', 50, L('No topo', 'At the top', 'En la cima'), J_LVL],
  ['j_f1', 'journey', 'tomato', 1, 'focusH', 1, L('Primeira hora de foco', 'First hour of focus', 'Primera hora de enfoque'), L('Some {n} hora de foco no Pomodoro.', 'Log {n} hour of Pomodoro focus.', 'Suma {n} hora de enfoque en Pomodoro.')],
  ['j_f10', 'journey', 'headphones', 2, 'focusH', 10, L('Concentrado', 'Focused', 'Concentrado'), J_FOCUS],
  ['j_f50', 'journey', 'clock', 4, 'focusH', 50, L('Fluxo profundo', 'Deep flow', 'Flujo profundo'), J_FOCUS],
  ['j_f100', 'journey', 'hourglass', 5, 'focusH', 100, L('Cem horas de foco', 'A hundred hours of focus', 'Cien horas de enfoque'), J_FOCUS],
  ['j_m7', 'journey', 'smile', 1, 'moods', 7, L('Como você está?', 'How are you?', '¿Cómo estás?'), J_MOOD],
  ['j_m100', 'journey', 'heart', 3, 'moods', 100, L('Diário do humor', 'Mood diary', 'Diario del ánimo'), J_MOOD],
  ['j_refl', 'journey', 'book', 1, 'refls', 1, L('Pensando alto', 'Thinking out loud', 'Pensando en voz alta'), L('Escreva uma reflexão.', 'Write a reflection.', 'Escribe una reflexión.')],
  ['j_refl10', 'journey', 'feather', 3, 'refls', 10, L('Filósofo de bolso', 'Pocket philosopher', 'Filósofo de bolsillo'), L('Escreva {n} reflexões.', 'Write {n} reflections.', 'Escribe {n} reflexiones.')],
  ['j_vision', 'journey', 'eye', 1, 'vision', 1, L('Visão de futuro', 'Vision', 'Visión de futuro'), L('Escreva a sua visão.', 'Write down your vision.', 'Escribe tu visión.')],
  ['j_luck', 'journey', 'clover', 2, 'cards', 10, L('Sortudo', 'Lucky one', 'Afortunado'), L('Vire {n} Cartas da Sorte.', 'Flip {n} Lucky Cards.', 'Voltea {n} Cartas de la Suerte.')],
  ['j_gold', 'journey', 'coins', 3, 'goldEarned', 10000, L('Cofrinho', 'Piggy bank', 'Alcancía'), L('Ganhe {n} de ouro, somando tudo.', 'Earn {n} gold in total.', 'Gana {n} de oro en total.')],
  ['j_gold50', 'journey', 'gem', 5, 'goldEarned', 50000, L('Tesouro', 'Treasure', 'Tesoro'), L('Ganhe {n} de ouro, somando tudo.', 'Earn {n} gold in total.', 'Gana {n} de oro en total.')],
];

export const ACHIEVEMENTS = DEFS.map(([id, cat, icon, tier, metric, goal, name, desc]) => ({ id, cat, icon, tier, metric, goal, name, desc, gold: TIER_GOLD[tier] }));
export const achById = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
export const achName = (a) => tr(a.name);
export const achDesc = (a) => fill(tr(a.desc), { n: num(a.goal) });

/* ---------- Números ---------- */
const run = (dates) => {
  // maior sequência de dias seguidos num conjunto de datas AAAA-MM-DD
  const s = [...new Set(dates)].sort();
  let best = 0;
  let cur = 0;
  let prev = null;
  for (const d of s) {
    cur = prev && addDays(prev, 1) === d ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = d;
  }
  return best;
};
const doneDay = (t) => (t.doneAt ? isoOfMs(t.doneAt) : null);

export function achStats(S = P()) {
  const tasks = S.task.filter((t) => t.kind !== 'routine');
  const done = tasks.filter((t) => t.done);
  const perDay = new Map();
  for (const t of done) {
    const d = doneDay(t);
    if (d) perDay.set(d, (perDay.get(d) || 0) + 1);
  }
  // IPL do mês
  const months = S.month.filter((m) => m.month && m.score != null).sort((a, b) => a.month.localeCompare(b.month));
  let monthRun70 = 0;
  let cur = 0;
  let prev = null;
  for (const m of months) {
    const [y, mo] = m.month.split('-').map(Number);
    const next = prev ? `${prev[1] === 12 ? prev[0] + 1 : prev[0]}-${String(prev[1] === 12 ? 1 : prev[1] + 1).padStart(2, '0')}` : null;
    cur = m.score >= 70 ? (next === m.month ? cur + 1 : 1) : 0;
    monthRun70 = Math.max(monthRun70, cur);
    prev = [y, mo];
  }
  // Água
  const goal = S.prefs.waterGoal || 2000;
  const mlByDay = new Map();
  for (const w of S.water) if (w.date) mlByDay.set(w.date, (mlByDay.get(w.date) || 0) + (w.ml || 0));
  const goalDays = [...mlByDay].filter(([, ml]) => ml >= goal).map(([d]) => d);
  // Hábitos
  const habitDoneDays = [];
  const offHabitDays = [];
  const off = S.prefs.daysOff || [];
  const isOffDay = (d) => off.includes(weekday(d)) || dayOffDays.has(d);
  const dayOffDays = new Set(S.hlog.filter((l) => l.mod === 'dayOff').map((l) => l.date));
  for (const l of S.hlog) {
    const h = S.byId.get(l.habitId);
    if (!h || l.mod) continue;
    if ((l.count || 0) >= (h.goal || 1)) {
      habitDoneDays.push(l.date);
      if (isOffDay(l.date)) offHabitDays.push(l.date);
    }
  }
  const logDays = [...new Set(S.hlog.filter((l) => !l.mod && (l.count || 0) > 0).map((l) => l.date))];
  let perfect = 0;
  for (const d of logDays) {
    const sched = S.habit.filter((h) => (!h.createdDay || h.createdDay <= d) && isScheduled(h, d) && (!h.archived || (S.hlogMap.get(`${h.id}|${d}`)?.count || 0) > 0));
    if (sched.length && sched.every((h) => isDone(S, h, d))) perfect++;
  }
  // Dias com atividade
  const active = new Set();
  for (const t of tasks) {
    if (t.createdDay) active.add(t.createdDay);
    const d = doneDay(t);
    if (d && t.done) active.add(d);
  }
  for (const d of logDays) active.add(d);
  for (const d of mlByDay.keys()) active.add(d);
  for (const e of S.ev) if (e.date && ['checkin', 'focus', 'quit', 'done', 'water'].includes(e.kind)) active.add(e.date);
  for (const m of S.mood) if (m.date) active.add(m.date);
  const t0 = today();
  for (const d of [...active]) if (d > t0) active.delete(d);
  const doneDaysSet = new Set([...perDay.keys()]);
  const logSet = new Set(logDays);
  const offActive = [...active].filter((d) => isOffDay(d) && (doneDaysSet.has(d) || logSet.has(d) || mlByDay.has(d))).length;
  const quitBest = Math.max(0, ...S.quit.map((q) => daysClean(q)));
  const scores = S.score.filter((x) => x.score != null);
  const hourOf = (t) => (t.doneAt ? new Date(t.doneAt).getHours() : -1);
  return {
    sprints: done.filter((t) => t.kind === 'sprint').length,
    challenges: done.filter((t) => t.kind === 'challenge').length,
    early: done.filter((t) => hourOf(t) >= 0 && hourOf(t) < 8).length,
    late: done.filter((t) => hourOf(t) >= 22).length,
    subsDone: sum(S.task, (t) => (t.subtasks || []).filter((x) => x.done).length),
    projects: S.project.length,
    tags: S.tag.length,
    days100: scores.filter((x) => x.score >= 100).length,
    days90: scores.filter((x) => x.score >= 90).length,
    waterBestDay: Math.floor(Math.max(0, ...mlByDay.values()) / 1000),
    level: S.money.level,
    focusH: Math.floor(sum(S.ev.filter((e) => e.kind === 'focus'), (e) => e.focusSec || 0) / 3600),
    moods: S.mood.length,
    refls: S.refl.length,
    vision: S.vision ? 1 : 0,
    cards: sum(S.ev, (e) => Math.max(0, -(e.items?.luckyCard || 0))),
    goldEarned: sum(S.ev.filter((e) => (e.gold || 0) > 0 && e.kind !== 'import'), (e) => e.gold),
    created: tasks.length,
    done: done.length,
    doneP0: done.filter((t) => t.priority === 'P0').length,
    bestDayDone: Math.max(0, ...perDay.values()),
    months: months.length,
    bestMonth: Math.max(0, ...months.map((m) => m.score)),
    monthRun70,
    months80: months.filter((m) => m.score >= 80).length,
    waterL: Math.floor(sum([...mlByDay.values()]) / 1000),
    waterGoalDays: goalDays.length,
    waterRun: run(goalDays),
    habitBest: Math.max(0, ...S.habit.map((h) => bestStreak(S, h))),
    checkinRun: run(S.ev.filter((e) => e.kind === 'checkin' && e.date).map((e) => e.date)),
    quitBest,
    habitsCreated: S.habit.length,
    habitDone: habitDoneDays.length,
    perfectDays: perfect,
    activeRun: run([...active]),
    activeDays: active.size,
    offActive,
    offTasks: done.filter((t) => isOffDay(doneDay(t) || '')).length,
    offHabits: offHabitDays.length,
  };
}

/* ---------- Estado ---------- */
// [{ ...conquista, value, unlocked, claimed, at }]
export function achList(S = P(), stats = achStats(S)) {
  return ACHIEVEMENTS.map((a) => {
    const r = S.byId.get(`ach_${a.id}`);
    const value = stats[a.metric] || 0;
    return { ...a, value: Math.min(value, a.goal), unlocked: !!r, claimed: !!(r?.claimed || S.byId.get(`ev_ach_${a.id}`)), at: r?.at || 0 };
  });
}
export const toClaim = (S = P()) => ACHIEVEMENTS.filter((a) => S.byId.get(`ach_${a.id}`) && !S.byId.get(`ach_${a.id}`).claimed && !S.byId.get(`ev_ach_${a.id}`));

// Desbloqueia o que já foi alcançado. Devolve as conquistas novas e se foi a primeira vez (histórico).
export async function checkAchievements(S = P()) {
  const stats = achStats(S);
  const first = !ACHIEVEMENTS.some((a) => S.byId.get(`ach_${a.id}`)) && !S.byId.get('ach__seen');
  const fresh = ACHIEVEMENTS.filter((a) => !S.byId.get(`ach_${a.id}`) && (stats[a.metric] || 0) >= a.goal);
  const at = Date.now();
  const batch = fresh.map((a) => ({ type: 'ach', id: `ach_${a.id}`, data: { aid: a.id, at, ...(first ? { retro: true } : {}) } }));
  if (first) batch.push({ type: 'ach', id: 'ach__seen', data: { aid: '_seen', at } });
  if (batch.length) await personal.saveMany(batch);
  return { fresh, first, stats };
}

// Animação só uma vez, num aparelho só: a conquista que ninguém viu ainda (sem shownAt) é mostrada no
// aparelho que a pessoa está usando agora (tela visível), que marca shownAt/shownOn. Quando o registro
// chega aos outros aparelhos já marcado, eles não animam. As do histórico (retro) nunca animam.
const REVEAL_WINDOW = 3 * 86400000;
export const unseen = (S = P()) =>
  ACHIEVEMENTS.filter((a) => {
    const r = S.byId.get(`ach_${a.id}`);
    return r && !r.retro && !r.shownAt && Date.now() - (r.at || 0) < REVEAL_WINDOW;
  });
export async function markShown(ids, device) {
  const at = Date.now();
  const batch = ids.map((id) => personal.get(`ach_${id}`)).filter(Boolean).map((r) => ({ type: 'ach', id: r.id, data: { ...strip(r), shownAt: at, shownOn: device || null } }));
  if (batch.length) await personal.saveMany(batch);
}

// Resgata o ouro (uma vez: o evento tem id fixo).
export async function claimAchievement(id) {
  const a = achById.get(id);
  const r = personal.get(`ach_${id}`);
  if (!a || !r || r.claimed || personal.get(`ev_ach_${id}`)) return null;
  const { commit } = await import('./game.js');
  const res = await commit([
    { type: 'ev', id: `ev_ach_${id}`, data: { kind: 'ach', ref: id, date: today(), gold: a.gold } },
    { type: 'ach', id: `ach_${id}`, data: { ...strip(r), claimed: Date.now() } },
  ]);
  return { ...res, gold: a.gold };
}
