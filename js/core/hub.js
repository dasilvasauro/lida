// Hub de Produtividade (aba Eu): conceitos, métodos, estudos, práticas e livros sobre constância,
// objetivos, foco e corpo (hidratação, sono, movimento). Textos em pt/en/es (L).
//
// Regras do conteúdo:
//   - nada é patrocinado; livros aparecem só com autor, ano e título (sem link de loja ou afiliado);
//   - links só para fontes neutras: o estudo original (DOI ou PubMed) e órgãos oficiais (OMS, EFSA,
//     Academias Nacionais dos EUA). Como muitos artigos pedem assinatura, cada estudo também tem, quando
//     existe, uma versão de acesso livre (free): PubMed Central, repositório da universidade, página do
//     autor, ou um texto confiável sobre ele (BPS, SPSP, HBS, Harvard, notícia da universidade);
//   - números citados como o estudo diz, com o tamanho e o limite de cada um.
// kind: conceito | metodo | estudo | pratica | livro
// i18n:skip-start
const L = (pt, en, es) => ({ pt, en, es });

export const KINDS = {
  conceito: { icon: 'bulb', name: L('Conceito', 'Concept', 'Concepto') },
  metodo: { icon: 'list', name: L('Método', 'Method', 'Método') },
  estudo: { icon: 'chart', name: L('Estudo', 'Study', 'Estudio') },
  pratica: { icon: 'check', name: L('Prática', 'Practice', 'Práctica') },
  livro: { icon: 'book', name: L('Livro', 'Book', 'Libro') },
};

const doi = (d) => `https://doi.org/${d}`;
const pubmed = (id) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`;

export const HUB = [
  {
    id: 'porque',
    icon: 'flame',
    title: L('Por que a constância funciona', 'Why consistency works', 'Por qué funciona la constancia'),
    intro: L(
      'Pequenas ações repetidas viram automáticas, e ver o próprio progresso dá vontade de continuar. É a base da ofensiva, dos hábitos e do IPL do Lida.',
      'Small actions repeated become automatic, and seeing your own progress makes you want to keep going. It is the basis of Lida\'s streak, habits and IPL.',
      'Pequeñas acciones repetidas se vuelven automáticas, y ver el propio progreso da ganas de seguir. Es la base de la racha, los hábitos y el IPL de Lida.',
    ),
    cards: [
      {
        id: 'lally',
        kind: 'estudo',
        title: L('Quanto tempo leva para um hábito ficar automático', 'How long a habit takes to become automatic', 'Cuánto tarda un hábito en volverse automático'),
        text: L(
          '96 voluntários repetiram uma ação diária (beber água no almoço, correr antes do jantar...) por 12 semanas. Em média, a ação chegou perto do automático em 66 dias, mas variou de 18 a 254 dias conforme a pessoa e o hábito. Pular um dia isolado não atrapalhou a formação do hábito.',
          '96 volunteers repeated a daily action (drinking water at lunch, running before dinner...) for 12 weeks. On average the action got close to automatic in 66 days, but it ranged from 18 to 254 days depending on the person and the habit. Missing a single day did not hurt habit formation.',
          '96 voluntarios repitieron una acción diaria (beber agua en el almuerzo, correr antes de cenar...) durante 12 semanas. En promedio, la acción se acercó a lo automático en 66 días, pero varió de 18 a 254 días según la persona y el hábito. Saltarse un día aislado no perjudicó la formación del hábito.',
        ),
        tips: [
          L('Conte em meses, não em 21 dias: a famosa "regra dos 21 dias" não tem base.', 'Think in months, not 21 days: the famous "21-day rule" has no basis.', 'Piensa en meses, no en 21 días: la famosa "regla de los 21 días" no tiene base.'),
          L('Falhou um dia? Volte no seguinte. É para isso que existe o Congelamento.', 'Missed a day? Come back the next. That is what the Freeze is for.', '¿Fallaste un día? Vuelve al siguiente. Para eso existe la Congelación.'),
        ],
        src: { label: 'Lally et al. (2010), European Journal of Social Psychology', url: doi('10.1002/ejsp.674') },
        free: [{ label: 'BPS Research Digest — How long does it take to form a habit?', url: 'https://bps.org.uk/research-digest/how-form-habit' }],
      },
      {
        id: 'wood',
        kind: 'estudo',
        title: L('Hábito é contexto + repetição', 'Habit is context + repetition', 'Hábito es contexto + repetición'),
        text: L(
          'A revisão de Wood e Neal mostra que hábitos são associações entre um contexto (lugar, hora, ação anterior) e uma resposta, aprendidas pela repetição. Quando o hábito está formado, o contexto puxa a ação quase sem decisão consciente.',
          'Wood and Neal\'s review shows that habits are associations between a context (place, time, previous action) and a response, learned through repetition. Once formed, the context triggers the action with almost no conscious decision.',
          'La revisión de Wood y Neal muestra que los hábitos son asociaciones entre un contexto (lugar, hora, acción anterior) y una respuesta, aprendidas con la repetición. Una vez formado, el contexto dispara la acción casi sin decisión consciente.',
        ),
        tips: [L('Sempre no mesmo momento do dia: rotinas do Lida com horário ajudam nisso.', 'Always at the same moment of the day: Lida routines with a time help with that.', 'Siempre en el mismo momento del día: las rutinas de Lida con horario ayudan con eso.')],
        src: { label: 'Wood & Neal (2007), Psychological Review', url: doi('10.1037/0033-295X.114.4.843') },
        free: [{ label: 'Wood & Neal (2007) — PDF, USC', url: 'https://dornsife.usc.edu/wendy-wood/wp-content/uploads/sites/183/2023/10/wood.neal_.2007psychrev_a_new_look_at_habits_and_the_interface_between_habits_and_goals.pdf' }],
      },
      {
        id: 'harkin',
        kind: 'estudo',
        title: L('Acompanhar o progresso aumenta a chance de chegar lá', 'Monitoring progress raises the chance of getting there', 'Seguir el progreso aumenta la probabilidad de lograrlo'),
        text: L(
          'Uma meta-análise de 138 estudos (quase 20 mil pessoas) concluiu que acompanhar o progresso melhora o alcance das metas, e o efeito é maior quando o progresso é registrado (anotado) ou fica visível.',
          'A meta-analysis of 138 studies (almost 20,000 people) found that monitoring progress improves goal attainment, and the effect is larger when progress is recorded (written down) or made visible.',
          'Un metaanálisis de 138 estudios (casi 20 mil personas) concluyó que seguir el progreso mejora el logro de metas, y el efecto es mayor cuando el progreso se registra (se anota) o queda visible.',
        ),
        tips: [L('A ofensiva, os anéis e o IPL são justamente formas de deixar o progresso visível.', 'The streak, the rings and the IPL are exactly ways to make progress visible.', 'La racha, los anillos y el IPL son justamente formas de dejar el progreso visible.')],
        src: { label: 'Harkin et al. (2016), Psychological Bulletin', url: doi('10.1037/bul0000025') },
        free: [{ label: 'Harkin et al. (2016) — White Rose Research Online', url: 'https://eprints.whiterose.ac.uk/91437/' }],
      },
      {
        id: 'smallwins',
        kind: 'conceito',
        title: L('O princípio do progresso (pequenas vitórias)', 'The progress principle (small wins)', 'El principio del progreso (pequeñas victorias)'),
        text: L(
          'Teresa Amabile e Steven Kramer analisaram quase 12 mil registros de diário de profissionais. O fator que mais melhorava a motivação e o humor num dia de trabalho era a sensação de ter avançado em algo que importa, mesmo que pouco.',
          'Teresa Amabile and Steven Kramer analyzed almost 12,000 diary entries from professionals. The factor that most improved motivation and mood on a workday was the sense of having made progress on something meaningful, even a little.',
          'Teresa Amabile y Steven Kramer analizaron casi 12 mil registros de diario de profesionales. El factor que más mejoraba la motivación y el ánimo en un día de trabajo era la sensación de haber avanzado en algo importante, aunque fuera poco.',
        ),
        tips: [L('Divida tarefas grandes em subtarefas: cada uma marcada é uma pequena vitória.', 'Split big tasks into subtasks: each one checked is a small win.', 'Divide las tareas grandes en subtareas: cada una marcada es una pequeña victoria.')],
        src: { label: 'Amabile & Kramer (2011), Harvard Business Review', url: 'https://hbr.org/2011/05/the-power-of-small-wins' },
        free: [{ label: 'HBS Working Knowledge — How Small Wins Unleash Creativity', url: 'https://www.library.hbs.edu/working-knowledge/how-small-wins-unleash-creativity' }],
      },
      {
        id: 'freshstart',
        kind: 'estudo',
        title: L('Efeito do novo começo', 'The fresh start effect', 'El efecto del nuevo comienzo'),
        text: L(
          'Começos de semana, de mês, aniversários e feriados aumentam as buscas por "dieta", as idas à academia e os compromissos com metas. Marcos no calendário separam o "eu antigo" do "novo" e dão impulso para recomeçar.',
          'The start of a week or month, birthdays and holidays increase searches for "diet", gym visits and goal commitments. Calendar landmarks separate the "old me" from the "new me" and give a push to start over.',
          'El inicio de semana o de mes, los cumpleaños y los feriados aumentan las búsquedas de "dieta", las idas al gimnasio y los compromisos con metas. Los hitos del calendario separan el "yo de antes" del "nuevo" y dan impulso para empezar de nuevo.',
        ),
        tips: [L('Ofensiva quebrou? Use a segunda-feira ou o dia 1 como recomeço, sem culpa.', 'Streak broke? Use Monday or the 1st as a restart, without guilt.', '¿Se rompió la racha? Usa el lunes o el día 1 como reinicio, sin culpa.')],
        src: { label: 'Dai, Milkman & Riis (2014), Management Science', url: doi('10.1287/mnsc.2014.1901') },
        free: [{ label: 'Dai, Milkman & Riis (2014) — PDF, Wharton', url: 'https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf' }],
      },
      {
        id: 'chain',
        kind: 'pratica',
        title: L('Não quebre a corrente (e nunca falhe duas vezes)', 'Don\'t break the chain (and never miss twice)', 'No rompas la cadena (y nunca falles dos veces)'),
        text: L(
          'Marcar um X no calendário a cada dia cumprido cria uma corrente que dá vontade de manter: é a ideia por trás da ofensiva. O complemento importante é não transformar um dia perdido em dois: o estudo de Lally mostra que um deslize isolado não desfaz o hábito, mas vários seguidos sim.',
          'Marking an X on the calendar for each day done creates a chain you want to keep: that is the idea behind the streak. The important complement is not turning one missed day into two: Lally\'s study shows a single slip does not undo a habit, but several in a row do.',
          'Marcar una X en el calendario cada día cumplido crea una cadena que da ganas de mantener: es la idea detrás de la racha. El complemento importante es no convertir un día perdido en dos: el estudio de Lally muestra que un desliz aislado no deshace el hábito, pero varios seguidos sí.',
        ),
        tips: [
          L('Meta da ofensiva realista (50% é um bom começo) vence meta perfeita abandonada.', 'A realistic streak goal (50% is a good start) beats a perfect goal you abandon.', 'Una meta de racha realista (50% es un buen comienzo) gana a una meta perfecta abandonada.'),
          L('Guarde um Congelamento de Ofensiva para os dias difíceis.', 'Keep a Streak Freeze for hard days.', 'Guarda una Congelación de Racha para los días difíciles.'),
        ],
      },
    ],
  },
  {
    id: 'metas',
    icon: 'target',
    title: L('Definir objetivos', 'Setting goals', 'Definir objetivos'),
    intro: L(
      'Objetivos claros e planos concretos ("quando, onde, como") estão entre os achados mais sólidos da psicologia sobre desempenho.',
      'Clear goals and concrete plans ("when, where, how") are among the most solid findings in the psychology of performance.',
      'Objetivos claros y planes concretos ("cuándo, dónde, cómo") están entre los hallazgos más sólidos de la psicología del desempeño.',
    ),
    cards: [
      {
        id: 'locke',
        kind: 'estudo',
        title: L('Teoria da definição de metas', 'Goal-setting theory', 'Teoría del establecimiento de metas'),
        text: L(
          'Em 35 anos de pesquisa, Locke e Latham mostraram que metas específicas e desafiadoras levam a desempenho melhor do que "fazer o melhor possível". Funcionam ainda melhor com compromisso, retorno (feedback) sobre o progresso e tarefas que a pessoa sabe executar.',
          'In 35 years of research, Locke and Latham showed that specific, challenging goals lead to better performance than "do your best". They work even better with commitment, feedback on progress and tasks the person knows how to do.',
          'En 35 años de investigación, Locke y Latham mostraron que las metas específicas y desafiantes llevan a un mejor desempeño que "hacer lo mejor posible". Funcionan aún mejor con compromiso, retroalimentación sobre el progreso y tareas que la persona sabe hacer.',
        ),
        tips: [
          L('Troque "ler mais" por "ler 10 páginas por dia": é a meta de um hábito no Lida.', 'Swap "read more" for "read 10 pages a day": that is a habit goal in Lida.', 'Cambia "leer más" por "leer 10 páginas al día": es la meta de un hábito en Lida.'),
          L('Escreva os objetivos maiores na Visão, na aba Eu.', 'Write your bigger goals in Vision, in the Me tab.', 'Escribe los objetivos mayores en la Visión, en la pestaña Yo.'),
        ],
        src: { label: 'Locke & Latham (2002), American Psychologist', url: doi('10.1037/0003-066X.57.9.705') },
      },
      {
        id: 'smart',
        kind: 'metodo',
        title: L('Metas SMART', 'SMART goals', 'Metas SMART'),
        text: L(
          'Um checklist para transformar um desejo em meta: Específica, Mensurável, Alcançável, Relevante e com Tempo definido. Não é um estudo, é um jeito prático de aplicar a teoria de definição de metas.',
          'A checklist to turn a wish into a goal: Specific, Measurable, Achievable, Relevant and Time-bound. It is not a study, it is a practical way to apply goal-setting theory.',
          'Una lista para transformar un deseo en meta: Específica, Medible, Alcanzable, Relevante y con Tiempo definido. No es un estudio, es una forma práctica de aplicar la teoría de metas.',
        ),
        tips: [L('Uma tarefa com data, horário e projeto no Lida já é quase uma meta SMART.', 'A task with a date, time and project in Lida is already almost a SMART goal.', 'Una tarea con fecha, hora y proyecto en Lida ya es casi una meta SMART.')],
      },
      {
        id: 'implementation',
        kind: 'estudo',
        title: L('Intenções de implementação ("se... então...")', 'Implementation intentions ("if... then...")', 'Intenciones de implementación ("si... entonces...")'),
        text: L(
          'Planos no formato "quando X acontecer, eu faço Y" ligam a ação a um momento concreto. Uma meta-análise de 94 estudos encontrou efeito de médio a grande sobre o alcance das metas em comparação com só ter a intenção.',
          'Plans in the form "when X happens, I will do Y" link the action to a concrete moment. A meta-analysis of 94 studies found a medium-to-large effect on goal attainment compared with intention alone.',
          'Los planes en el formato "cuando pase X, haré Y" unen la acción a un momento concreto. Un metaanálisis de 94 estudios encontró un efecto de mediano a grande sobre el logro de metas frente a solo tener la intención.',
        ),
        tips: [
          L('Dê horário às tarefas importantes: "sexta 9h revisar o relatório".', 'Give important tasks a time: "Friday 9am review the report".', 'Ponle hora a las tareas importantes: "viernes 9h revisar el informe".'),
          L('Ligue o novo hábito a um que já existe: "depois do café, alongar 5 minutos".', 'Attach the new habit to an existing one: "after coffee, stretch 5 minutes".', 'Une el nuevo hábito a uno que ya existe: "después del café, estirar 5 minutos".'),
        ],
        src: { label: 'Gollwitzer & Sheeran (2006), Advances in Experimental Social Psychology', url: doi('10.1016/S0065-2601(06)38002-1') },
        free: [{ label: 'Gollwitzer & Sheeran (2006) — KOPS, Universität Konstanz', url: 'https://kops.uni-konstanz.de/entities/publication/2e749bfb-8533-437c-8203-7e788c910c5f' }],
      },
      {
        id: 'woop',
        kind: 'metodo',
        title: L('WOOP: desejo, resultado, obstáculo, plano', 'WOOP: wish, outcome, obstacle, plan', 'WOOP: deseo, resultado, obstáculo, plan'),
        text: L(
          'Método de Gabriele Oettingen que junta o "contraste mental" (imaginar o resultado e logo depois o obstáculo interno real) com um plano "se... então...". Imaginar só o resultado positivo tende a relaxar; olhar o obstáculo prepara para agir.',
          'Gabriele Oettingen\'s method combining "mental contrasting" (imagining the outcome and right after the real inner obstacle) with an "if... then..." plan. Imagining only the positive outcome tends to relax you; looking at the obstacle prepares you to act.',
          'Método de Gabriele Oettingen que une el "contraste mental" (imaginar el resultado y justo después el obstáculo interno real) con un plan "si... entonces...". Imaginar solo el resultado positivo tiende a relajar; mirar el obstáculo prepara para actuar.',
        ),
        tips: [L('Wish: o que eu quero? Outcome: como vai ser? Obstacle: o que em mim atrapalha? Plan: se o obstáculo vier, eu...', 'Wish: what do I want? Outcome: what will it be like? Obstacle: what in me gets in the way? Plan: if the obstacle comes, I will...', 'Wish: ¿qué quiero? Outcome: ¿cómo será? Obstacle: ¿qué en mí lo impide? Plan: si llega el obstáculo, yo...')],
        src: { label: 'WOOP — woopmylife.org', open: true, url: 'https://woopmylife.org' },
      },
      {
        id: 'planfallacy',
        kind: 'estudo',
        title: L('A falácia do planejamento', 'The planning fallacy', 'La falacia de la planificación'),
        text: L(
          'Pessoas subestimam de forma sistemática quanto tempo as próprias tarefas vão levar, mesmo sabendo que tarefas parecidas atrasaram antes. No estudo clássico, estudantes previram terminar a monografia em cerca de 34 dias; levaram em média 56.',
          'People systematically underestimate how long their own tasks will take, even knowing that similar tasks ran late before. In the classic study, students predicted finishing their thesis in about 34 days; it took them 56 on average.',
          'Las personas subestiman de forma sistemática cuánto tardarán sus propias tareas, aun sabiendo que tareas parecidas se atrasaron antes. En el estudio clásico, estudiantes previeron terminar la tesina en unos 34 días; tardaron 56 en promedio.',
        ),
        tips: [
          L('Planeje menos do que acha que cabe no dia: o IPL premia carga realista.', 'Plan less than you think fits in a day: the IPL rewards a realistic load.', 'Planifica menos de lo que crees que cabe en el día: el IPL premia una carga realista.'),
          L('Use a duração nas tarefas e compare com o tempo real no modo foco.', 'Use durations on tasks and compare with the real time in focus mode.', 'Usa la duración en las tareas y compárala con el tiempo real en el modo enfoque.'),
        ],
        src: { label: 'Buehler, Griffin & Ross (1994), Journal of Personality and Social Psychology', url: doi('10.1037/0022-3514.67.3.366') },
        free: [{ label: 'SPSP — Buehler and the planning fallacy', url: 'https://spsp.org/news-center/blog/buehler-planning-fallacy' }],
      },
      {
        id: 'plan',
        kind: 'estudo',
        title: L('Fazer um plano acalma a cabeça', 'Making a plan quiets the mind', 'Hacer un plan calma la cabeza'),
        text: L(
          'Metas não cumpridas ficam "voltando" ao pensamento e atrapalham outras tarefas. Nos experimentos de Masicampo e Baumeister, só fazer um plano específico para a meta (sem cumpri-la) já reduziu essa interferência.',
          'Unfulfilled goals keep "coming back" to mind and get in the way of other tasks. In Masicampo and Baumeister\'s experiments, just making a specific plan for the goal (without completing it) already reduced that interference.',
          'Las metas no cumplidas vuelven al pensamiento y estorban otras tareas. En los experimentos de Masicampo y Baumeister, solo hacer un plan específico para la meta (sin cumplirla) ya redujo esa interferencia.',
        ),
        tips: [L('Antes de dormir, use Esvaziar a mente e dê data ao que importa.', 'Before bed, use Empty your mind and give a date to what matters.', 'Antes de dormir, usa Vaciar la mente y ponle fecha a lo que importa.')],
        src: { label: 'Masicampo & Baumeister (2011), Journal of Personality and Social Psychology', url: pubmed('21688924') },
        free: [{ label: 'E. J. Masicampo — Wake Forest University (publications)', url: 'https://users.wfu.edu/masicaej/publications.html' }],
      },
    ],
  },
  {
    id: 'metodos',
    icon: 'list',
    title: L('Métodos de organização', 'Organization methods', 'Métodos de organización'),
    intro: L(
      'Métodos populares para decidir o que fazer e quando. Nenhum é obrigatório: o Lida tem peças de vários, e vale usar o que serve para você.',
      'Popular methods to decide what to do and when. None is mandatory: Lida has pieces of several, and it is worth using what works for you.',
      'Métodos populares para decidir qué hacer y cuándo. Ninguno es obligatorio: Lida tiene piezas de varios, y conviene usar lo que te sirva.',
    ),
    cards: [
      {
        id: 'gtd',
        kind: 'metodo',
        title: L('GTD: capturar, esclarecer, organizar, refletir, executar', 'GTD: capture, clarify, organize, reflect, engage', 'GTD: capturar, aclarar, organizar, reflexionar, ejecutar'),
        text: L(
          'O método de David Allen parte de uma ideia: a cabeça é para ter ideias, não para guardá-las. Tudo o que aparece vai para uma caixa de entrada confiável; depois cada item ganha o próximo passo concreto, um lugar e uma data, e uma revisão semanal mantém o sistema em dia.',
          'David Allen\'s method starts from one idea: your mind is for having ideas, not holding them. Everything that comes up goes into a trusted inbox; then each item gets a concrete next step, a place and a date, and a weekly review keeps the system up to date.',
          'El método de David Allen parte de una idea: la cabeza es para tener ideas, no para guardarlas. Todo lo que surge va a una bandeja de entrada confiable; luego cada elemento recibe el siguiente paso concreto, un lugar y una fecha, y una revisión semanal mantiene el sistema al día.',
        ),
        tips: [
          L('Capture na Entrada ou na adição rápida, sem decidir nada na hora.', 'Capture into the Inbox or quick add, without deciding anything right away.', 'Captura en la Bandeja o en el añadido rápido, sin decidir nada en el momento.'),
          L('Escreva tarefas como ações: "ligar para o dentista", não "dentista".', 'Write tasks as actions: "call the dentist", not "dentist".', 'Escribe las tareas como acciones: "llamar al dentista", no "dentista".'),
          L('Uma vez por semana, esvazie a Entrada e olhe os Próximos dias.', 'Once a week, empty the Inbox and look at the Next days.', 'Una vez por semana, vacía la Bandeja y mira los Próximos días.'),
        ],
      },
      {
        id: 'eisenhower',
        kind: 'metodo',
        title: L('Matriz de Eisenhower', 'Eisenhower matrix', 'Matriz de Eisenhower'),
        text: L(
          'Separa as tarefas em urgente e importante: faça agora (as duas coisas), agende (importante, não urgente), delegue (urgente, pouco importante) e elimine (nenhuma das duas). O quadrante mais esquecido, e o que mais rende a longo prazo, é o importante e não urgente.',
          'Splits tasks into urgent and important: do now (both), schedule (important, not urgent), delegate (urgent, not important) and drop (neither). The most forgotten quadrant, and the one that pays off most in the long run, is important but not urgent.',
          'Separa las tareas en urgente e importante: hazlo ahora (ambas), agéndalo (importante, no urgente), delégalo (urgente, poco importante) y elimínalo (ninguna). El cuadrante más olvidado, y el que más rinde a largo plazo, es lo importante y no urgente.',
        ),
        tips: [L('No Lida: P0/P1 para o que é importante, e o quadro por prioridade para ver o equilíbrio.', 'In Lida: P0/P1 for what is important, and the board by priority to see the balance.', 'En Lida: P0/P1 para lo importante, y el tablero por prioridad para ver el equilibrio.')],
      },
      {
        id: 'pomodoro',
        kind: 'metodo',
        title: L('Técnica Pomodoro', 'Pomodoro Technique', 'Técnica Pomodoro'),
        text: L(
          'Criada por Francesco Cirillo no fim dos anos 1980: 25 minutos de foco numa única tarefa, 5 de pausa, e uma pausa maior a cada quatro ciclos. A força está menos no número 25 e mais em três coisas: começar (o cronômetro baixa a barreira), proteger o bloco de interrupções e descansar de verdade.',
          'Created by Francesco Cirillo in the late 1980s: 25 minutes of focus on a single task, 5 of break, and a longer break every four cycles. Its strength lies less in the number 25 and more in three things: starting (the timer lowers the barrier), protecting the block from interruptions and truly resting.',
          'Creada por Francesco Cirillo a fines de los años 1980: 25 minutos de enfoque en una sola tarea, 5 de pausa, y una pausa mayor cada cuatro ciclos. Su fuerza está menos en el número 25 y más en tres cosas: empezar (el cronómetro baja la barrera), proteger el bloque de interrupciones y descansar de verdad.',
        ),
        tips: [L('Ajuste os minutos na faixa giratória do Pomodoro: 25/5 é ponto de partida, não regra.', 'Adjust the minutes on the Pomodoro dial: 25/5 is a starting point, not a rule.', 'Ajusta los minutos en la franja giratoria del Pomodoro: 25/5 es un punto de partida, no una regla.')],
      },
      {
        id: 'timeblock',
        kind: 'metodo',
        title: L('Blocos de tempo', 'Time blocking', 'Bloques de tiempo'),
        text: L(
          'Em vez de só uma lista, cada tarefa ganha um espaço no calendário. Torna visível que o dia tem limite (ajuda contra a falácia do planejamento) e protege tempo para o que é importante e não urgente.',
          'Instead of just a list, each task gets a slot in the calendar. It makes it visible that the day has a limit (helps against the planning fallacy) and protects time for what is important but not urgent.',
          'En lugar de solo una lista, cada tarea recibe un espacio en el calendario. Hace visible que el día tiene límite (ayuda contra la falacia de la planificación) y protege tiempo para lo importante y no urgente.',
        ),
        tips: [L('No Calendário (visão Dia), toque num horário vazio para criar a tarefa ali.', 'In the Calendar (Day view), tap an empty slot to create the task there.', 'En el Calendario (vista Día), toca un horario vacío para crear la tarea ahí.')],
      },
      {
        id: 'kanban',
        kind: 'metodo',
        title: L('Kanban', 'Kanban', 'Kanban'),
        text: L(
          'Quadro com colunas que mostram o fluxo do trabalho. Nasceu na produção industrial japonesa e ficou popular em times de software. A regra mais útil para uma pessoa só: limitar quanta coisa fica "em andamento" ao mesmo tempo.',
          'A board with columns showing the flow of work. It was born in Japanese manufacturing and became popular with software teams. The most useful rule for one person: limit how much is "in progress" at once.',
          'Tablero con columnas que muestran el flujo del trabajo. Nació en la producción industrial japonesa y se hizo popular en equipos de software. La regla más útil para una sola persona: limitar cuántas cosas están "en curso" a la vez.',
        ),
        tips: [L('Use Lista · Quadro · Calendário em Hoje, Planejar e nos projetos.', 'Use List · Board · Calendar in Today, Plan and projects.', 'Usa Lista · Tablero · Calendario en Hoy, Planificar y los proyectos.')],
      },
      {
        id: 'frog',
        kind: 'pratica',
        title: L('Comer o sapo e a regra dos dois minutos', 'Eat the frog and the two-minute rule', 'Comerse el sapo y la regla de los dos minutos'),
        text: L(
          'Duas regras simples que se completam. "Comer o sapo": fazer primeiro a tarefa mais difícil e importante, enquanto a energia está alta. "Dois minutos" (do GTD): se algo leva menos que isso, faça agora em vez de anotar.',
          'Two simple rules that complement each other. "Eat the frog": do the hardest, most important task first, while energy is high. "Two minutes" (from GTD): if something takes less than that, do it now instead of writing it down.',
          'Dos reglas simples que se complementan. "Comerse el sapo": hacer primero la tarea más difícil e importante, mientras la energía está alta. "Dos minutos" (del GTD): si algo lleva menos que eso, hazlo ahora en vez de anotarlo.',
        ),
        tips: [L('O Desafio do dia é um bom sapo: vale só para hoje.', 'The Daily challenge makes a good frog: it only counts today.', 'El Desafío del día es un buen sapo: vale solo para hoy.')],
      },
      {
        id: 'review',
        kind: 'pratica',
        title: L('Revisão semanal', 'Weekly review', 'Revisión semanal'),
        text: L(
          'Uns 20 a 30 minutos por semana para fechar pontas: esvaziar a Entrada, olhar a semana que passou (o que funcionou, o que travou) e escolher as 3 coisas mais importantes da próxima. É a etapa "refletir" do GTD e o que mantém o sistema confiável.',
          'About 20 to 30 minutes a week to tie up loose ends: empty the Inbox, look at the past week (what worked, what got stuck) and pick the 3 most important things for the next. It is GTD\'s "reflect" step and what keeps the system trustworthy.',
          'Unos 20 a 30 minutos por semana para cerrar pendientes: vaciar la Bandeja, mirar la semana que pasó (qué funcionó, qué se trabó) y elegir las 3 cosas más importantes de la próxima. Es la etapa "reflexionar" del GTD y lo que mantiene el sistema confiable.',
        ),
        tips: [L('Crie uma tarefa repetida "Revisão semanal" no domingo e use o IPL da semana como espelho.', 'Create a repeating "Weekly review" task on Sunday and use the week\'s IPL as a mirror.', 'Crea una tarea repetida "Revisión semanal" el domingo y usa el IPL de la semana como espejo.')],
      },
    ],
  },
  {
    id: 'foco',
    icon: 'target',
    title: L('Foco e atenção', 'Focus and attention', 'Enfoque y atención'),
    intro: L(
      'Atenção é limitada: trocar de tarefa custa, interrupções cansam e pausas curtas ajudam a manter o rendimento.',
      'Attention is limited: switching tasks has a cost, interruptions are tiring and short breaks help sustain performance.',
      'La atención es limitada: cambiar de tarea cuesta, las interrupciones cansan y las pausas cortas ayudan a sostener el rendimiento.',
    ),
    cards: [
      {
        id: 'multitask',
        kind: 'estudo',
        title: L('Multitarefa pesada atrapalha a filtragem de distrações', 'Heavy multitasking hurts filtering distractions', 'La multitarea intensa empeora el filtrado de distracciones'),
        text: L(
          'Em testes de laboratório, pessoas que costumavam usar muitas mídias ao mesmo tempo se saíram pior em ignorar estímulos irrelevantes e em trocar de tarefa do que quem usava poucas. O estudo mostra uma associação, não prova a causa, mas é um bom alerta.',
          'In lab tests, people who habitually used many media at once did worse at ignoring irrelevant stimuli and switching tasks than light users. The study shows an association, not proof of cause, but it is a good warning.',
          'En pruebas de laboratorio, las personas que solían usar muchos medios a la vez lo hicieron peor al ignorar estímulos irrelevantes y al cambiar de tarea que quienes usaban pocos. El estudio muestra una asociación, no prueba la causa, pero es una buena alerta.',
        ),
        tips: [L('Uma tarefa em foco por vez: o alvo no Lida existe para isso.', 'One task in focus at a time: the target in Lida exists for that.', 'Una tarea en enfoque a la vez: el objetivo en Lida existe para eso.')],
        src: { label: 'Ophir, Nass & Wagner (2009), PNAS', url: doi('10.1073/pnas.0903620106') },
        free: [{ label: 'Ophir, Nass & Wagner (2009) — PubMed Central', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2747164/' }],
      },
      {
        id: 'interrupt',
        kind: 'estudo',
        title: L('O custo das interrupções', 'The cost of interruptions', 'El costo de las interrupciones'),
        text: L(
          'Num experimento, pessoas interrompidas terminaram as tarefas no mesmo tempo, mas trabalhando mais rápido e com mais estresse, frustração e sensação de pressão. A interrupção não "some": a pessoa compensa pagando com esforço.',
          'In an experiment, interrupted people finished their tasks in the same time, but by working faster and with more stress, frustration and time pressure. The interruption does not "disappear": people compensate by paying with effort.',
          'En un experimento, las personas interrumpidas terminaron las tareas en el mismo tiempo, pero trabajando más rápido y con más estrés, frustración y sensación de presión. La interrupción no "desaparece": la persona compensa pagando con esfuerzo.',
        ),
        tips: [L('Durante o Pomodoro, silencie notificações; anote o que surgir em Esvaziar a mente.', 'During a Pomodoro, silence notifications; jot down what comes up in Empty your mind.', 'Durante el Pomodoro, silencia las notificaciones; anota lo que surja en Vaciar la mente.')],
        src: { label: 'Mark, Gudith & Klocke (2008), CHI', url: doi('10.1145/1357054.1357072') },
        free: [{ label: 'Mark, Gudith & Klocke (2008) — PDF, UC Irvine', url: 'https://www.ics.uci.edu/~gmark/chi08-mark.pdf' }],
      },
      {
        id: 'breaks',
        kind: 'estudo',
        title: L('Pausas curtas mantêm o foco numa tarefa longa', 'Short breaks sustain focus on a long task', 'Las pausas cortas sostienen el enfoque en una tarea larga'),
        text: L(
          'Numa tarefa de vigilância de 50 minutos, o desempenho caía com o tempo, exceto no grupo que fez duas breves trocas de atividade no meio. A explicação proposta: a atenção a um mesmo objetivo "se acostuma", e um intervalo a reativa.',
          'In a 50-minute vigilance task, performance dropped over time, except in the group that made two brief switches of activity in the middle. The proposed explanation: attention to the same goal "habituates", and a break reactivates it.',
          'En una tarea de vigilancia de 50 minutos, el desempeño caía con el tiempo, salvo en el grupo que hizo dos breves cambios de actividad en el medio. La explicación propuesta: la atención a un mismo objetivo "se acostumbra", y una pausa la reactiva.',
        ),
        tips: [L('Na pausa, levante, beba água, olhe longe: nada de trocar uma tela por outra.', 'On a break, stand up, drink water, look far away: don\'t swap one screen for another.', 'En la pausa, levántate, bebe agua, mira lejos: no cambies una pantalla por otra.')],
        src: { label: 'Ariga & Lleras (2011), Cognition', url: doi('10.1016/j.cognition.2010.12.007') },
        free: [{ label: 'University of Illinois — Brief diversions vastly improve focus', url: 'https://news.illinois.edu/brief-diversions-vastly-improve-focus-researchers-find/' }],
      },
      {
        id: 'deepwork',
        kind: 'conceito',
        title: L('Trabalho focado (deep work)', 'Deep work', 'Trabajo profundo (deep work)'),
        text: L(
          'Termo de Cal Newport para períodos longos de concentração sem distrações em tarefas cognitivamente exigentes, em oposição ao "trabalho raso" (e-mails, mensagens, tarefas logísticas). A proposta é agendar esses blocos como compromissos e treinar a tolerância ao tédio.',
          'Cal Newport\'s term for long periods of distraction-free concentration on cognitively demanding tasks, as opposed to "shallow work" (email, messages, logistics). The proposal is to schedule these blocks like appointments and train tolerance for boredom.',
          'Término de Cal Newport para períodos largos de concentración sin distracciones en tareas cognitivamente exigentes, frente al "trabajo superficial" (correos, mensajes, logística). La propuesta es agendar esos bloques como compromisos y entrenar la tolerancia al aburrimiento.',
        ),
        tips: [L('Uma tarefa com tempo (modo foco) de 60 a 90 minutos no começo do dia é um bom bloco.', 'A timed task (focus mode) of 60 to 90 minutes early in the day makes a good block.', 'Una tarea con tiempo (modo enfoque) de 60 a 90 minutos al empezar el día es un buen bloque.')],
      },
    ],
  },
  {
    id: 'habitos',
    icon: 'habit',
    title: L('Construir (e largar) hábitos', 'Building (and breaking) habits', 'Construir (y dejar) hábitos'),
    intro: L(
      'Técnicas práticas para começar pequeno, deixar o hábito fácil de lembrar e mais gostoso de repetir.',
      'Practical techniques to start small, make the habit easy to remember and more enjoyable to repeat.',
      'Técnicas prácticas para empezar pequeño, hacer el hábito fácil de recordar y más agradable de repetir.',
    ),
    cards: [
      {
        id: 'loop',
        kind: 'conceito',
        title: L('O ciclo do hábito: deixa, rotina, recompensa', 'The habit loop: cue, routine, reward', 'El ciclo del hábito: señal, rutina, recompensa'),
        text: L(
          'Popularizado por Charles Duhigg e refinado por James Clear (deixa, desejo, resposta, recompensa): um gatilho do ambiente dispara a ação, e a recompensa ensina o cérebro a repetir. Para criar um hábito, deixe a deixa óbvia e a recompensa imediata; para largar, faça o contrário.',
          'Popularized by Charles Duhigg and refined by James Clear (cue, craving, response, reward): a trigger in the environment fires the action, and the reward teaches the brain to repeat it. To build a habit, make the cue obvious and the reward immediate; to break one, do the opposite.',
          'Popularizado por Charles Duhigg y refinado por James Clear (señal, deseo, respuesta, recompensa): un disparador del entorno activa la acción, y la recompensa enseña al cerebro a repetirla. Para crear un hábito, haz la señal obvia y la recompensa inmediata; para dejarlo, haz lo contrario.',
        ),
        tips: [L('XP, ouro e o "plim" de concluir são recompensas imediatas de propósito.', 'XP, gold and the completion "ding" are immediate rewards on purpose.', 'El XP, el oro y el sonido de completar son recompensas inmediatas a propósito.')],
      },
      {
        id: 'tiny',
        kind: 'metodo',
        title: L('Comece ridiculamente pequeno', 'Start ridiculously small', 'Empieza ridículamente pequeño'),
        text: L(
          'BJ Fogg propõe hábitos tão pequenos que não exigem motivação (uma flexão, um fio dental, uma linha escrita), ancorados num hábito existente e celebrados na hora. Depois que o hábito está automático, ele cresce sozinho.',
          'BJ Fogg proposes habits so small they need no motivation (one push-up, one tooth flossed, one line written), anchored to an existing habit and celebrated right away. Once automatic, the habit grows on its own.',
          'BJ Fogg propone hábitos tan pequeños que no requieren motivación (una flexión, un diente con hilo dental, una línea escrita), anclados a un hábito existente y celebrados al momento. Una vez automático, el hábito crece solo.',
        ),
        tips: [L('Comece o hábito no Lida com meta 1 e aumente quando a sequência passar de duas semanas.', 'Start the habit in Lida with goal 1 and raise it once the streak passes two weeks.', 'Empieza el hábito en Lida con meta 1 y súbela cuando la racha pase de dos semanas.')],
      },
      {
        id: 'stacking',
        kind: 'pratica',
        title: L('Empilhar hábitos', 'Habit stacking', 'Apilar hábitos'),
        text: L(
          '"Depois de [hábito atual], vou [hábito novo]." É uma intenção de implementação que usa uma rotina já automática como gatilho. Funciona melhor quando o novo hábito cabe no mesmo lugar e momento.',
          '"After [current habit], I will [new habit]." It is an implementation intention that uses an already automatic routine as the trigger. It works best when the new habit fits the same place and moment.',
          '"Después de [hábito actual], haré [hábito nuevo]." Es una intención de implementación que usa una rutina ya automática como disparador. Funciona mejor cuando el nuevo hábito cabe en el mismo lugar y momento.',
        ),
        tips: [L('Uma rotina do Lida (ex.: Manhã: água, alongar, planejar) é uma pilha pronta.', 'A Lida routine (e.g. Morning: water, stretch, plan) is a ready-made stack.', 'Una rutina de Lida (ej.: Mañana: agua, estirar, planificar) es una pila lista.')],
      },
      {
        id: 'bundling',
        kind: 'estudo',
        title: L('Juntar tentação e obrigação', 'Temptation bundling', 'Juntar tentación y obligación'),
        text: L(
          'No experimento de Katherine Milkman, quem só podia ouvir audiolivros viciantes na academia foi mais vezes à academia do que o grupo de controle (o efeito diminuiu depois das festas de fim de ano). Prender um prazer a uma tarefa chata ajuda a começar.',
          'In Katherine Milkman\'s experiment, people who could only listen to page-turner audiobooks at the gym went to the gym more often than the control group (the effect faded after the year-end holidays). Tying a pleasure to a chore helps you start.',
          'En el experimento de Katherine Milkman, quienes solo podían escuchar audiolibros adictivos en el gimnasio fueron más veces al gimnasio que el grupo de control (el efecto disminuyó tras las fiestas de fin de año). Atar un placer a una tarea aburrida ayuda a empezar.',
        ),
        tips: [L('Aquela série só durante a faxina; aquele podcast só na caminhada.', 'That show only while cleaning; that podcast only on the walk.', 'Esa serie solo durante la limpieza; ese podcast solo en la caminata.')],
        src: { label: 'Milkman, Minson & Volpp (2014), Management Science', url: doi('10.1287/mnsc.2013.1784') },
        free: [{ label: 'Milkman, Minson & Volpp (2014) — Penn Repository', url: 'https://repository.upenn.edu/oid_papers/150' }, { label: 'Knowledge at Wharton — The Hunger Games at the gym', url: 'https://knowledge.wharton.upenn.edu/article/researchers-used-hunger-games-encourage-healthier-choices/' }],
      },
      {
        id: 'environment',
        kind: 'pratica',
        title: L('Desenhe o ambiente', 'Design your environment', 'Diseña tu entorno'),
        text: L(
          'Como hábitos são puxados pelo contexto, mudar o ambiente costuma funcionar melhor que força de vontade: deixe à vista o que você quer fazer (a garrafa de água na mesa, o livro no travesseiro) e crie atrito para o que quer evitar (o celular em outro cômodo).',
          'Since habits are triggered by context, changing your environment usually works better than willpower: keep in sight what you want to do (the water bottle on the desk, the book on the pillow) and add friction to what you want to avoid (the phone in another room).',
          'Como los hábitos los dispara el contexto, cambiar el entorno suele funcionar mejor que la fuerza de voluntad: deja a la vista lo que quieres hacer (la botella de agua en la mesa, el libro en la almohada) y crea fricción para lo que quieres evitar (el celular en otra habitación).',
        ),
        tips: [L('No Desapego, anote o gatilho do mau hábito e mude o ambiente em volta dele.', 'In Letting go, note the bad habit\'s trigger and change the environment around it.', 'En Desapego, anota el disparador del mal hábito y cambia el entorno a su alrededor.')],
      },
    ],
  },
  {
    id: 'corpo',
    icon: 'water',
    title: L('Corpo e energia: água, sono e movimento', 'Body and energy: water, sleep and movement', 'Cuerpo y energía: agua, sueño y movimiento'),
    intro: L(
      'Foco também é físico. Hidratação, sono e movimento mexem com atenção e humor. Informação geral, não orientação médica: condições de saúde, gravidez, calor e esporte mudam as necessidades.',
      'Focus is physical too. Hydration, sleep and movement affect attention and mood. General information, not medical advice: health conditions, pregnancy, heat and sport change your needs.',
      'El enfoque también es físico. La hidratación, el sueño y el movimiento influyen en la atención y el ánimo. Información general, no orientación médica: condiciones de salud, embarazo, calor y deporte cambian las necesidades.',
    ),
    cards: [
      {
        id: 'water-need',
        kind: 'estudo',
        title: L('Quanta água por dia', 'How much water a day', 'Cuánta agua al día'),
        text: L(
          'A Autoridade Europeia de Segurança Alimentar (EFSA) considera adequada uma ingestão total de água de 2,0 L/dia para mulheres e 2,5 L/dia para homens adultos, em clima temperado e atividade moderada. Esse total inclui a água dos alimentos, que costuma ser cerca de 20%; as bebidas ficam com o resto.',
          'The European Food Safety Authority (EFSA) considers a total water intake of 2.0 L/day for adult women and 2.5 L/day for adult men adequate, in a temperate climate with moderate activity. That total includes water from food, usually around 20%; drinks cover the rest.',
          'La Autoridad Europea de Seguridad Alimentaria (EFSA) considera adecuada una ingesta total de agua de 2,0 L/día para mujeres y 2,5 L/día para hombres adultos, en clima templado y actividad moderada. Ese total incluye el agua de los alimentos, que suele ser cerca del 20%; las bebidas cubren el resto.',
        ),
        tips: [
          L('A meta de água do Lida (2 L por padrão) é das bebidas: ajuste ao seu corpo, ao calor e ao exercício.', 'Lida\'s water goal (2 L by default) is for drinks: adjust it to your body, the heat and exercise.', 'La meta de agua de Lida (2 L por defecto) es de bebidas: ajústala a tu cuerpo, al calor y al ejercicio.'),
          L('Um sinal simples: urina clara, quase sem cor, costuma indicar boa hidratação.', 'A simple sign: pale, almost colorless urine usually indicates good hydration.', 'Una señal simple: orina clara, casi sin color, suele indicar buena hidratación.'),
        ],
        src: { label: 'EFSA (2010), Dietary Reference Values for water', open: true, url: doi('10.2903/j.efsa.2010.1459') },
        free: [{ label: 'Harvard T.H. Chan — The Nutrition Source: Water', url: 'https://nutritionsource.hsph.harvard.edu/water/' }],
      },
      {
        id: 'water-mind',
        kind: 'estudo',
        title: L('Desidratação leve já mexe com humor e atenção', 'Mild dehydration already affects mood and attention', 'La deshidratación leve ya afecta el ánimo y la atención'),
        text: L(
          'Em estudos controlados com adultos jovens, uma perda de cerca de 1% a 1,5% do peso em água (desidratação leve) piorou o humor, aumentou a sensação de fadiga e a dor de cabeça e, nos homens, prejudicou a memória de trabalho e a atenção. As amostras foram pequenas (cerca de 25 pessoas em cada), mas os achados se repetem nas revisões.',
          'In controlled studies with young adults, losing about 1% to 1.5% of body weight in water (mild dehydration) worsened mood, increased fatigue and headache and, in men, impaired working memory and attention. Samples were small (about 25 people each), but the findings recur in reviews.',
          'En estudios controlados con adultos jóvenes, perder cerca del 1% al 1,5% del peso en agua (deshidratación leve) empeoró el ánimo, aumentó la fatiga y el dolor de cabeza y, en los hombres, perjudicó la memoria de trabajo y la atención. Las muestras fueron pequeñas (unas 25 personas en cada una), pero los hallazgos se repiten en las revisiones.',
        ),
        tips: [L('Beba ao longo do dia, não tudo de uma vez: os lembretes de água do Lida ajudam.', 'Drink throughout the day, not all at once: Lida\'s water reminders help.', 'Bebe a lo largo del día, no todo de una vez: los recordatorios de agua de Lida ayudan.')],
        src: { label: 'Ganio et al. (2011), British Journal of Nutrition', url: pubmed('21736786') },
        src2: { label: 'Armstrong et al. (2012), Journal of Nutrition', url: doi('10.3945/jn.111.142000') },
        src3: { label: 'Adan (2012), Journal of the American College of Nutrition', url: pubmed('22855911') },
        free: [{ label: "Popkin, D'Anci & Rosenberg (2010), Water, hydration and health — PubMed Central", url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2908954/' }],
      },
      {
        id: 'water-us',
        kind: 'estudo',
        title: L('A referência americana', 'The US reference', 'La referencia estadounidense'),
        text: L(
          'As Academias Nacionais dos EUA (Institute of Medicine, 2004) definiram como ingestão adequada de água total cerca de 3,7 L/dia para homens e 2,7 L/dia para mulheres, contando bebidas e alimentos. Os números são maiores que os da EFSA porque partem de outros dados de consumo; nenhum dos dois é um mínimo rígido.',
          'The US National Academies (Institute of Medicine, 2004) set an adequate total water intake of about 3.7 L/day for men and 2.7 L/day for women, counting drinks and food. The numbers are higher than EFSA\'s because they come from different intake data; neither is a strict minimum.',
          'Las Academias Nacionales de EE. UU. (Institute of Medicine, 2004) definieron como ingesta adecuada de agua total cerca de 3,7 L/día para hombres y 2,7 L/día para mujeres, contando bebidas y alimentos. Las cifras son mayores que las de la EFSA porque parten de otros datos de consumo; ninguna es un mínimo rígido.',
        ),
        src: { label: 'National Academies (2004), Dietary Reference Intakes for Water', open: true, url: doi('10.17226/10925') },
      },
      {
        id: 'sleep',
        kind: 'estudo',
        title: L('Sono: 7 horas ou mais', 'Sleep: 7 hours or more', 'Sueño: 7 horas o más'),
        text: L(
          'O consenso da Academia Americana de Medicina do Sono e da Sociedade de Pesquisa do Sono recomenda que adultos durmam 7 horas ou mais por noite com regularidade. Dormir menos está associado a pior atenção, mais erros e pior humor, além de riscos à saúde a longo prazo.',
          'The consensus of the American Academy of Sleep Medicine and the Sleep Research Society recommends that adults regularly sleep 7 or more hours per night. Sleeping less is associated with worse attention, more errors and worse mood, plus long-term health risks.',
          'El consenso de la Academia Estadounidense de Medicina del Sueño y la Sociedad de Investigación del Sueño recomienda que los adultos duerman 7 horas o más por noche con regularidad. Dormir menos se asocia con peor atención, más errores y peor ánimo, además de riesgos para la salud a largo plazo.',
        ),
        tips: [L('Horário de dormir também pode ser hábito: um hábito "Deitar às 23h" com alarme.', 'Bedtime can be a habit too: a "In bed by 11pm" habit with an alarm.', 'La hora de dormir también puede ser un hábito: un hábito "Acostarse a las 23h" con alarma.')],
        src: { label: 'Watson et al. (2015), Sleep', url: doi('10.5665/sleep.4716') },
        free: [{ label: 'Watson et al. (2015) — PubMed Central', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4434546/' }],
      },
      {
        id: 'move',
        kind: 'estudo',
        title: L('Movimento: 150 a 300 minutos por semana', 'Movement: 150 to 300 minutes a week', 'Movimiento: 150 a 300 minutos por semana'),
        text: L(
          'A Organização Mundial da Saúde recomenda a adultos de 150 a 300 minutos de atividade física moderada por semana (ou 75 a 150 de intensa), mais fortalecimento muscular 2 vezes por semana, e reduzir o tempo sentado. Qualquer quantidade é melhor que nenhuma.',
          'The World Health Organization recommends adults do 150 to 300 minutes of moderate physical activity a week (or 75 to 150 of vigorous), plus muscle strengthening twice a week, and reduce sitting time. Any amount is better than none.',
          'La Organización Mundial de la Salud recomienda a los adultos de 150 a 300 minutos de actividad física moderada por semana (o 75 a 150 de intensa), más fortalecimiento muscular 2 veces por semana, y reducir el tiempo sentado. Cualquier cantidad es mejor que nada.',
        ),
        tips: [L('Um hábito de 30 minutos, 5 dias por semana, já chega aos 150.', 'A 30-minute habit, 5 days a week, already gets you to 150.', 'Un hábito de 30 minutos, 5 días por semana, ya llega a 150.')],
        src: { label: 'WHO (2020), Guidelines on physical activity and sedentary behaviour', open: true, url: 'https://www.who.int/publications/i/item/9789240015128' },
      },
      {
        id: 'move-mind',
        kind: 'estudo',
        title: L('Exercício e cérebro', 'Exercise and the brain', 'Ejercicio y cerebro'),
        text: L(
          'A revisão de Hillman, Erickson e Kramer reúne evidências de que atividade aeróbica regular está associada a melhor função executiva (planejar, alternar, inibir impulsos) em várias idades, com mecanismos estudados em humanos e animais.',
          'Hillman, Erickson and Kramer\'s review gathers evidence that regular aerobic activity is associated with better executive function (planning, switching, inhibiting impulses) across ages, with mechanisms studied in humans and animals.',
          'La revisión de Hillman, Erickson y Kramer reúne evidencias de que la actividad aeróbica regular se asocia con mejor función ejecutiva (planificar, alternar, inhibir impulsos) en varias edades, con mecanismos estudiados en humanos y animales.',
        ),
        tips: [L('Use a pausa longa do Pomodoro para caminhar uns minutos.', 'Use the long Pomodoro break for a few minutes\' walk.', 'Usa la pausa larga del Pomodoro para caminar unos minutos.')],
        src: { label: 'Hillman, Erickson & Kramer (2008), Nature Reviews Neuroscience', url: doi('10.1038/nrn2298') },
        free: [{ label: 'Erickson et al. (2019) — PubMed Central', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6527141/' }],
      },
    ],
  },
  {
    id: 'mente',
    icon: 'heart',
    title: L('Mente: reflexão, autocompaixão e mentalidade', 'Mind: reflection, self-compassion and mindset', 'Mente: reflexión, autocompasión y mentalidad'),
    intro: L(
      'Como você trata os próprios deslizes muda o que acontece depois deles.',
      'How you treat your own slips changes what happens after them.',
      'Cómo tratas tus propios deslices cambia lo que pasa después de ellos.',
    ),
    cards: [
      {
        id: 'selfcomp',
        kind: 'estudo',
        title: L('Autocompaixão aumenta a vontade de melhorar', 'Self-compassion increases the drive to improve', 'La autocompasión aumenta las ganas de mejorar'),
        text: L(
          'Em quatro experimentos, pessoas incentivadas a tratar um erro ou fraqueza com gentileza (em vez de autocrítica dura ou só de elevar a autoestima) se mostraram mais motivadas a corrigir o erro e a estudar para melhorar.',
          'In four experiments, people encouraged to treat a mistake or weakness with kindness (instead of harsh self-criticism or just boosting self-esteem) were more motivated to fix the mistake and study to improve.',
          'En cuatro experimentos, las personas animadas a tratar un error o debilidad con amabilidad (en vez de autocrítica dura o solo subir la autoestima) se mostraron más motivadas a corregir el error y a estudiar para mejorar.',
        ),
        tips: [L('Ofensiva quebrou? Leia o resumo do dia como dado, não como sentença.', 'Streak broke? Read the day\'s summary as data, not as a verdict.', '¿Se rompió la racha? Lee el resumen del día como dato, no como sentencia.')],
        src: { label: 'Breines & Chen (2012), Personality and Social Psychology Bulletin', url: doi('10.1177/0146167212445599') },
        free: [{ label: 'Kelly McGonigal (Stanford) — Psychology Today', url: 'https://www.psychologytoday.com/us/blog/the-science-of-willpower/201206/does-self-compassion-or-criticism-motivate-self-improvement' }],
      },
      {
        id: 'mindset',
        kind: 'conceito',
        title: L('Mentalidade de crescimento', 'Growth mindset', 'Mentalidad de crecimiento'),
        text: L(
          'Ideia de Carol Dweck: quem vê habilidades como algo que se desenvolve com esforço e estratégia tende a encarar desafios e erros como parte do caminho. Estudos de intervenção em larga escala mostraram efeitos reais, porém modestos e dependentes do contexto: ajuda, mas não é mágica.',
          'Carol Dweck\'s idea: people who see abilities as something developed through effort and strategy tend to treat challenges and mistakes as part of the path. Large-scale intervention studies showed real but modest, context-dependent effects: it helps, but it is not magic.',
          'Idea de Carol Dweck: quien ve las habilidades como algo que se desarrolla con esfuerzo y estrategia tiende a encarar desafíos y errores como parte del camino. Estudios de intervención a gran escala mostraron efectos reales, pero modestos y dependientes del contexto: ayuda, pero no es magia.',
        ),
      },
      {
        id: 'reflect',
        kind: 'pratica',
        title: L('Escrever para pensar', 'Write to think', 'Escribir para pensar'),
        text: L(
          'Registrar o humor, escrever objetivos e anotar aprendizados transforma impressões vagas em algo que dá para revisar. O registro também é a forma mais forte de acompanhar progresso, segundo a meta-análise de Harkin.',
          'Logging your mood, writing goals and noting lessons turns vague impressions into something you can review. Recording is also the strongest form of progress monitoring, according to Harkin\'s meta-analysis.',
          'Registrar el ánimo, escribir objetivos y anotar aprendizajes transforma impresiones vagas en algo que se puede revisar. El registro es también la forma más fuerte de seguir el progreso, según el metaanálisis de Harkin.',
        ),
        tips: [L('Humor, Visão e Reflexões ficam na aba Eu.', 'Mood, Vision and Reflections live in the Me tab.', 'Ánimo, Visión y Reflexiones están en la pestaña Yo.')],
      },
    ],
  },
  {
    id: 'livros',
    icon: 'book',
    title: L('Estante', 'Bookshelf', 'Estantería'),
    intro: L(
      'Livros citados com frequência sobre o tema. Sem link de loja e sem patrocínio: procure na biblioteca, no sebo ou onde preferir. Os títulos em português são das edições brasileiras.',
      'Books often cited on the topic. No store links and no sponsorship: look for them at the library, a used bookstore or wherever you like.',
      'Libros citados con frecuencia sobre el tema. Sin enlaces de tienda y sin patrocinio: búscalos en la biblioteca, en una librería de usados o donde prefieras.',
    ),
    cards: [
      { id: 'b-atomic', kind: 'livro', title: L('Hábitos Atômicos (Atomic Habits)', 'Atomic Habits', 'Hábitos atómicos (Atomic Habits)'), text: L('James Clear, 2018. Hábitos como pequenas melhorias de 1% que se acumulam; as "quatro leis" (óbvio, atraente, fácil, satisfatório) e o foco em identidade.', 'James Clear, 2018. Habits as small 1% improvements that compound; the "four laws" (obvious, attractive, easy, satisfying) and a focus on identity.', 'James Clear, 2018. Los hábitos como pequeñas mejoras del 1% que se acumulan; las "cuatro leyes" (obvio, atractivo, fácil, satisfactorio) y el foco en la identidad.') },
      { id: 'b-gtd', kind: 'livro', title: L('A Arte de Fazer Acontecer (Getting Things Done)', 'Getting Things Done', 'Organízate con eficacia (Getting Things Done)'), text: L('David Allen, 2001 (revisto em 2015). O método GTD completo: captura, próximas ações, contextos e revisão semanal.', 'David Allen, 2001 (revised 2015). The complete GTD method: capture, next actions, contexts and weekly review.', 'David Allen, 2001 (revisado en 2015). El método GTD completo: captura, próximas acciones, contextos y revisión semanal.') },
      { id: 'b-power', kind: 'livro', title: L('O Poder do Hábito (The Power of Habit)', 'The Power of Habit', 'El poder de los hábitos (The Power of Habit)'), text: L('Charles Duhigg, 2012. Jornalismo sobre a ciência dos hábitos em pessoas, empresas e sociedades; popularizou o ciclo deixa-rotina-recompensa.', 'Charles Duhigg, 2012. Journalism on the science of habits in people, companies and societies; popularized the cue-routine-reward loop.', 'Charles Duhigg, 2012. Periodismo sobre la ciencia de los hábitos en personas, empresas y sociedades; popularizó el ciclo señal-rutina-recompensa.') },
      { id: 'b-tiny', kind: 'livro', title: L('Tiny Habits', 'Tiny Habits', 'Tiny Habits'), text: L('BJ Fogg, 2019. O método de começar minúsculo, ancorar e celebrar, do pesquisador de Stanford.', 'BJ Fogg, 2019. The method of starting tiny, anchoring and celebrating, from the Stanford researcher.', 'BJ Fogg, 2019. El método de empezar diminuto, anclar y celebrar, del investigador de Stanford.') },
      { id: 'b-goodhabits', kind: 'livro', title: L('Good Habits, Bad Habits', 'Good Habits, Bad Habits', 'Good Habits, Bad Habits'), text: L('Wendy Wood, 2019. A pesquisadora por trás de muitos estudos sobre contexto e hábito explica por que força de vontade importa menos do que parece.', 'Wendy Wood, 2019. The researcher behind many studies on context and habit explains why willpower matters less than it seems.', 'Wendy Wood, 2019. La investigadora detrás de muchos estudios sobre contexto y hábito explica por qué la fuerza de voluntad importa menos de lo que parece.') },
      { id: 'b-deep', kind: 'livro', title: L('Trabalho Focado (Deep Work)', 'Deep Work', 'Deep Work'), text: L('Cal Newport, 2016. Por que a concentração profunda é rara e valiosa, e regras práticas para cultivá-la.', 'Cal Newport, 2016. Why deep concentration is rare and valuable, and practical rules to cultivate it.', 'Cal Newport, 2016. Por qué la concentración profunda es rara y valiosa, y reglas prácticas para cultivarla.') },
      { id: 'b-essential', kind: 'livro', title: L('Essencialismo (Essentialism)', 'Essentialism', 'Esencialismo (Essentialism)'), text: L('Greg McKeown, 2014. Fazer menos, porém melhor: escolher o essencial e dizer não ao resto.', 'Greg McKeown, 2014. Doing less, but better: choosing what is essential and saying no to the rest.', 'Greg McKeown, 2014. Hacer menos, pero mejor: elegir lo esencial y decir que no al resto.') },
      { id: 'b-4000', kind: 'livro', title: L('Quatro Mil Semanas (Four Thousand Weeks)', 'Four Thousand Weeks', 'Cuatro mil semanas (Four Thousand Weeks)'), text: L('Oliver Burkeman, 2021. Um contraponto bem-vindo: aceitar que nunca vai dar tempo de tudo e escolher com calma.', 'Oliver Burkeman, 2021. A welcome counterpoint: accepting you will never get to everything, and choosing calmly.', 'Oliver Burkeman, 2021. Un contrapunto bienvenido: aceptar que nunca alcanzará el tiempo para todo y elegir con calma.') },
      { id: 'b-mindset', kind: 'livro', title: L('Mindset: A Nova Psicologia do Sucesso', 'Mindset: The New Psychology of Success', 'Mindset: La actitud del éxito'), text: L('Carol Dweck, 2006. Mentalidade fixa e de crescimento, com exemplos de escola, esporte e trabalho.', 'Carol Dweck, 2006. Fixed and growth mindsets, with examples from school, sport and work.', 'Carol Dweck, 2006. Mentalidad fija y de crecimiento, con ejemplos de la escuela, el deporte y el trabajo.') },
      { id: 'b-grit', kind: 'livro', title: L('Garra (Grit)', 'Grit', 'Grit'), text: L('Angela Duckworth, 2016. Paixão e perseverança por objetivos de longo prazo, e como desenvolvê-las.', 'Angela Duckworth, 2016. Passion and perseverance for long-term goals, and how to develop them.', 'Angela Duckworth, 2016. Pasión y perseverancia por objetivos a largo plazo, y cómo desarrollarlas.') },
      { id: 'b-kahneman', kind: 'livro', title: L('Rápido e Devagar (Thinking, Fast and Slow)', 'Thinking, Fast and Slow', 'Pensar rápido, pensar despacio'), text: L('Daniel Kahneman, 2011. Os dois "sistemas" do pensamento e vieses como a falácia do planejamento.', 'Daniel Kahneman, 2011. The two "systems" of thinking and biases such as the planning fallacy.', 'Daniel Kahneman, 2011. Los dos "sistemas" del pensamiento y sesgos como la falacia de la planificación.') },
      { id: 'b-woop', kind: 'livro', title: L('Rethinking Positive Thinking', 'Rethinking Positive Thinking', 'Rethinking Positive Thinking'), text: L('Gabriele Oettingen, 2014. A pesquisa por trás do contraste mental e do método WOOP.', 'Gabriele Oettingen, 2014. The research behind mental contrasting and the WOOP method.', 'Gabriele Oettingen, 2014. La investigación detrás del contraste mental y del método WOOP.') },
    ],
  },
  {
    id: 'lida',
    icon: 'sparkles',
    title: L('Como o Lida usa isso', 'How Lida uses this', 'Cómo Lida usa esto'),
    intro: L(
      'Cada parte do app conversa com alguma das ideias acima.',
      'Each part of the app relates to one of the ideas above.',
      'Cada parte de la app se relaciona con alguna de las ideas anteriores.',
    ),
    cards: [
      { id: 'l-streak', kind: 'conceito', title: L('Ofensiva e Congelamento', 'Streak and Freeze', 'Racha y Congelación'), text: L('"Não quebre a corrente" com a rede de segurança do "nunca falhe duas vezes": a meta é uma parte do programado, e o Congelamento absorve um dia ruim.', '"Don\'t break the chain" with the safety net of "never miss twice": the goal is a share of what was planned, and the Freeze absorbs a bad day.', '"No rompas la cadena" con la red de seguridad de "nunca falles dos veces": la meta es una parte de lo programado, y la Congelación absorbe un mal día.') },
      { id: 'l-ipl', kind: 'conceito', title: L('IPL, anéis e resumos', 'IPL, rings and summaries', 'IPL, anillos y resúmenes'), text: L('Acompanhamento de progresso visível e registrado (Harkin, 2016) e pequenas vitórias diárias (Amabile e Kramer).', 'Visible, recorded progress monitoring (Harkin, 2016) and daily small wins (Amabile and Kramer).', 'Seguimiento del progreso visible y registrado (Harkin, 2016) y pequeñas victorias diarias (Amabile y Kramer).') },
      { id: 'l-capture', kind: 'conceito', title: L('Entrada, adição rápida e Esvaziar a mente', 'Inbox, quick add and Empty your mind', 'Bandeja, añadido rápido y Vaciar la mente'), text: L('A captura do GTD e o alívio de ter um plano (Masicampo e Baumeister): tirar da cabeça e decidir depois.', 'GTD capture and the relief of having a plan (Masicampo and Baumeister): get it out of your head and decide later.', 'La captura del GTD y el alivio de tener un plan (Masicampo y Baumeister): sacarlo de la cabeza y decidir después.') },
      { id: 'l-routines', kind: 'conceito', title: L('Rotinas e hábitos com horário', 'Routines and timed habits', 'Rutinas y hábitos con horario'), text: L('Empilhar hábitos e intenções de implementação: o mesmo momento e a mesma sequência, todo dia.', 'Habit stacking and implementation intentions: the same moment and the same sequence, every day.', 'Apilar hábitos e intenciones de implementación: el mismo momento y la misma secuencia, cada día.') },
      { id: 'l-game', kind: 'conceito', title: L('XP, ouro e conquistas', 'XP, gold and achievements', 'XP, oro y logros'), text: L('Recompensas imediatas para um comportamento cujo benefício real chega devagar: a parte "satisfatória" do ciclo do hábito.', 'Immediate rewards for behavior whose real benefit arrives slowly: the "satisfying" part of the habit loop.', 'Recompensas inmediatas para un comportamiento cuyo beneficio real llega despacio: la parte "satisfactoria" del ciclo del hábito.') },
      { id: 'l-water', kind: 'conceito', title: L('Água e lembretes', 'Water and reminders', 'Agua y recordatorios'), text: L('A meta de 2 L parte das referências da EFSA para bebidas; os lembretes espalham a água pelo dia.', 'The 2 L goal is based on EFSA\'s references for drinks; reminders spread water throughout the day.', 'La meta de 2 L parte de las referencias de la EFSA para bebidas; los recordatorios reparten el agua a lo largo del día.') },
    ],
  },
];
// i18n:skip-end

export const HUB_BY_ID = new Map(HUB.map((s) => [s.id, s]));
export const HUB_CARD = new Map(HUB.flatMap((s) => s.cards.map((c) => [c.id, { ...c, section: s.id }])));
