// Novidades e correções, da mais nova para a mais antiga (aparece em Ajustes > Novidades e correções).
// Regra: toda versão nova entra aqui, com o que mudou para quem usa (não detalhes de código).
// tipo: 'novo' | 'melhoria' | 'correcao'
// en/es (opcional): { title, items: [textos na mesma ordem] } para quem usa o app em inglês ou espanhol.
export const CHANGELOG = [
  {
    v: '3.0.0-alfa.24',
    date: '2026-11-19',
    title: 'Pomodoro automático',
    items: [
      ['novo', 'Pomodoro automático: ligue em Pomodoro > Automático e a pausa começa sozinha quando o foco acaba, e o foco recomeça quando a pausa acaba, até você pausar. Se o app ficou fechado, a sequência continua do ponto certo e os focos do meio-tempo contam. No Linux: menu Foco e lida pomo --auto.'],
    ],
    en: {
      title: 'Automatic Pomodoro',
      items: [
        'Automatic Pomodoro: turn on Pomodoro > Automatic and the break starts by itself when focus ends, and focus starts again when the break ends, until you pause. If the app was closed, the sequence picks up at the right point and the focus cycles in between count. On Linux: Focus menu and lida pomo --auto.',
      ],
    },
    es: {
      title: 'Pomodoro automático',
      items: [
        'Pomodoro automático: activa Pomodoro > Automático y la pausa empieza sola cuando termina el enfoque, y el enfoque vuelve a empezar cuando termina la pausa, hasta que pauses. Si la app estuvo cerrada, la secuencia sigue desde el punto correcto y los enfoques de ese tiempo cuentan. En Linux: menú Enfoque y lida pomo --auto.',
      ],
    },
  },
  {
    v: '3.0.0-alfa.23',
    date: '2026-11-19',
    title: 'Flow: foco em fila',
    items: [
      ['novo', 'Flow: uma tarefa por vez, em tela cheia; concluiu, a próxima aparece. Antes de começar, você monta a fila (hoje, atrasadas e rotinas; tira, acrescenta e arrasta), escolhe a ordem e o que fazer quando chega o horário de uma tarefa. Tem pausa, tique, Pomodoro e barras de atividade que não gravam nada.'],
      ['novo', 'Tarefas com tempo começam o cronômetro sozinhas no Flow, e as com horário entram na hora certa (com aviso de 10 s, na hora ou depois da atual, como você escolher).'],
      ['novo', 'Widget Foco do KDE: durante o Flow, fica verde-água e sem segundos; ao clicar, mostra o resumo, a próxima e os botões Concluir, Pausar e Pular. Na CLI: lida flow.'],
      ['novo', 'Conquistas do Flow: dez novas, de "Primeiro Flow" a "Cem horas de Flow".'],
      ['melhoria', 'Hub: cada estudo pago ganhou uma versão de leitura gratuita e confiável (PubMed Central, repositórios das universidades, sites dos autores e revistas).'],
      ['correcao', 'Hub no celular: o texto não é mais cortado na borda direita.'],
    ],
    en: {
      title: 'Flow: focus in a queue',
      items: [
        'Flow: one task at a time, full screen; finish one and the next appears. Before starting, you build the queue (today, overdue and routines; remove, add and drag), choose the order and what happens when a task\'s time comes. It has pause, tick, Pomodoro and activity bars that record nothing.',
        'Timed tasks start their timer on their own in Flow, and scheduled ones come in at the right time (with a 10 s warning, right away or after the current one, as you choose).',
        'KDE Focus widget: during Flow, it turns teal with no seconds; click it to see the summary, what\'s next and the Complete, Pause and Skip buttons. In the CLI: lida flow.',
        'Flow achievements: ten new ones, from "First Flow" to "A hundred hours of Flow".',
        'Hub: every paywalled study now has a free, reliable version to read (PubMed Central, university repositories, authors\' and journals\' sites).',
        'Hub on phones: text is no longer cut off at the right edge.',
      ],
    },
    es: {
      title: 'Flow: enfoque en cola',
      items: [
        'Flow: una tarea a la vez, a pantalla completa; terminas una y aparece la siguiente. Antes de empezar, armas la cola (hoy, atrasadas y rutinas; quitas, añades y arrastras), eliges el orden y qué hacer cuando llega la hora de una tarea. Tiene pausa, tic, Pomodoro y barras de actividad que no guardan nada.',
        'Las tareas con tiempo inician su cronómetro solas en el Flow, y las que tienen hora entran a tiempo (con aviso de 10 s, al momento o después de la actual, como elijas).',
        'Widget Enfoque de KDE: durante el Flow, se vuelve verde agua y sin segundos; al hacer clic, muestra el resumen, la siguiente y los botones Completar, Pausar y Saltar. En la CLI: lida flow.',
        'Logros del Flow: diez nuevos, de "Primer Flow" a "Cien horas de Flow".',
        'Hub: cada estudio de pago tiene ahora una versión gratuita y confiable para leer (PubMed Central, repositorios de universidades, sitios de autores y revistas).',
        'Hub en el móvil: el texto ya no se corta en el borde derecho.',
      ],
    },
  },
  {
    v: '3.0.0-alfa.22',
    date: '2026-11-19',
    title: 'Congelamento de Ofensiva, comemoração da meta e Hub de Produtividade',
    items: [
      ['novo', 'Congelamento de Ofensiva, na Loja por 9 vouchers: como no Duolingo, fica equipado (até 2) e é gasto sozinho num dia sem a meta, sem quebrar a ofensiva.'],
      ['novo', 'Ao bater a meta da ofensiva com o app aberto, uma animação mostra o número subindo, marca o dia na semana e diz a que horas a meta veio, comparada com a sua média.'],
      ['novo', 'Hub de Produtividade, na aba Eu: métodos, estudos, práticas e livros sobre constância, objetivos, foco, hábitos e corpo (água, sono, movimento). Sem patrocínio. Os "?" do app levam ao trecho certo.'],
      ['melhoria', 'Modo demo: ritmo Impecável (ofensiva sem quebra) e simulação de nove meses.'],
      ['correcao', 'O "?" de ajuda fica centralizado no círculo, e o ouro com seis dígitos cabe no quadro da Loja.'],
    ],
    en: {
      title: 'Streak Freeze, goal celebration and the Productivity Hub',
      items: [
        'Streak Freeze, in the Shop for 9 vouchers: like in Duolingo, it stays equipped (up to 2) and is used automatically on a day without the goal, without breaking your streak.',
        'When you meet your streak goal with the app open, an animation shows the number going up, marks the day in the week and tells you what time you met it, compared with your average.',
        'Productivity Hub, in the Me tab: methods, studies, practices and books on consistency, goals, focus, habits and the body (water, sleep, movement). No sponsorship. The app\'s "?" buttons link to the right section.',
        'Demo mode: Flawless pace (unbroken streak) and a nine-month simulation.',
        'The help "?" is centered in its circle, and six-digit gold fits in the Shop panel.',
      ],
    },
    es: {
      title: 'Congelación de Racha, celebración de la meta y Hub de Productividad',
      items: [
        'Congelación de Racha, en la Tienda por 9 vales: como en Duolingo, queda equipada (hasta 2) y se usa sola en un día sin la meta, sin romper la racha.',
        'Al cumplir la meta de la racha con la app abierta, una animación muestra el número subiendo, marca el día en la semana y dice a qué hora llegó la meta, comparada con tu promedio.',
        'Hub de Productividad, en la pestaña Yo: métodos, estudios, prácticas y libros sobre constancia, objetivos, enfoque, hábitos y cuerpo (agua, sueño, movimiento). Sin patrocinio. Los "?" de la app llevan a la parte correcta.',
        'Modo demo: ritmo Impecable (racha sin cortes) y simulación de nueve meses.',
        'El "?" de ayuda queda centrado en su círculo, y el oro de seis dígitos cabe en el panel de la Tienda.',
      ],
    },
  },
  {
    v: '3.0.0-alfa.21',
    date: '2026-11-18',
    title: 'Calendário, adição rápida no widget e Lidinho Kaizen',
    items: [
      ['novo', 'Calendário ao lado de Lista e Quadro: o mês inteiro, a semana ou o dia numa linha do tempo, com hoje destacado. Repetições aparecem como previstas (as diárias viram uma faixa no topo do mês) e os hábitos como contador. Dá para concluir, abrir, arrastar e criar tarefas direto nele.'],
      ['novo', 'Agendas externas no calendário, só para ver: Google Agenda pela conta ou o link iCal de qualquer serviço (Outlook, iCloud, Nextcloud).'],
      ['novo', 'Widget de adição rápida no Android: o + abre uma janelinha para anotar sem abrir o app, e as tarefas de hoje se concluem ali.'],
      ['novo', 'Conquistas da Ofensiva, de 3 a 365 dias. Com um ano de ofensiva vem o Lidinho Kaizen, todo em fogo e de óculos escuros.'],
      ['novo', 'Sons Metal, Piano e Mokia, e os temas AMOLED Mono e Yaru, na Loja.'],
      ['correcao', 'Widgets do Plasma não fazem mais o plasmashell crescer sem parar: a leitura do estado deixou de criar uma entrada nova a cada segundo, e listas e anéis só são redesenhados quando algo muda.'],
    ],
    en: {
      title: 'Calendar, quick add widget and the Kaizen Lidinho',
      items: [
        'Calendar next to List and Board: the whole month, the week or the day on a timeline, with today highlighted. Repeats show up as upcoming (daily ones become a strip at the top of the month) and habits as a counter. You can complete, open, drag and create tasks right there.',
        'External calendars in the calendar, view-only: Google Calendar through your account or the iCal link from any service (Outlook, iCloud, Nextcloud).',
        'Quick add widget on Android: the + opens a small window to jot something down without opening the app, and today\'s tasks can be completed right there.',
        'Streak achievements, from 3 to 365 days. A year-long streak unlocks the Kaizen Lidinho, all on fire and in sunglasses.',
        'Metal, Piano and Mokia sound packs, and the AMOLED Mono and Yaru themes, in the Shop.',
        'Plasma widgets no longer make plasmashell grow nonstop: reading the state stopped creating a new entry every second, and lists and rings are only redrawn when something changes.',
      ],
    },
    es: {
      title: 'Calendario, añadido rápido en el widget y Lidinho Kaizen',
      items: [
        'Calendario junto a Lista y Tablero: el mes entero, la semana o el día en una línea de tiempo, con hoy destacado. Las repeticiones aparecen como previstas (las diarias se vuelven una franja arriba del mes) y los hábitos como contador. Puedes completar, abrir, arrastrar y crear tareas ahí mismo.',
        'Calendarios externos en el calendario, solo para ver: Google Calendar con tu cuenta o el enlace iCal de cualquier servicio (Outlook, iCloud, Nextcloud).',
        'Widget de añadido rápido en Android: el + abre una ventanita para anotar sin abrir la app, y las tareas de hoy se completan ahí.',
        'Logros de la Racha, de 3 a 365 días. Con un año de racha llega el Lidinho Kaizen, todo en llamas y con gafas de sol.',
        'Sonidos Metal, Piano y Mokia, y los temas AMOLED Mono y Yaru, en la Tienda.',
        'Los widgets de Plasma ya no hacen crecer plasmashell sin parar: leer el estado dejó de crear una entrada nueva cada segundo, y las listas y anillos solo se redibujan cuando algo cambia.',
      ],
    },
  },
  {
    v: '3.0.0-alfa.20',
    date: '2026-11-18',
    title: 'Chave de recuperação, exportação, tour e manual',
    items: [
      ['novo', 'Chave de recuperação: um código de 24 letras e números que devolve o acesso aos dados se você esquecer a senha. Aparece ao criar a conta; em contas antigas, crie em Ajustes > Conta. Na tela de desbloqueio, "Esqueci a senha" pede o código e uma senha nova, que vale em todos os aparelhos.'],
      ['novo', 'Exportar para outros apps: tarefas e hábitos em planilha (CSV, abre no Excel, LibreOffice e Planilhas Google) e tudo em JSON, em Ajustes > Backup e exportação.'],
      ['novo', 'Tour de boas-vindas nas contas novas: passo a passo pelas partes do Lida, destacando cada uma e escurecendo o resto. Dá para rever em Ajustes > Ajuda e manual.'],
      ['novo', 'Ajuda: um "?" ao lado dos títulos das seções explica cada recurso, e o manual completo (com busca) fica em Ajustes > Ajuda e manual.'],
    ],
    en: {
      title: 'Recovery key, export, tour and manual',
      items: [
        'Recovery key: a 24-character code that gives you back access to your data if you forget your password. It appears when you create the account; on older accounts, create it in Settings > Account. On the unlock screen, "Forgot password" asks for the code and a new password, which works on all devices.',
        'Export to other apps: tasks and habits as a spreadsheet (CSV, opens in Excel, LibreOffice and Google Sheets) and everything as JSON, in Settings > Backup and export.',
        'Welcome tour for new accounts: a step-by-step walk through the parts of Lida, highlighting each one and dimming the rest. You can replay it in Settings > Help and manual.',
        'Help: a "?" next to section titles explains each feature, and the full manual (with search) is in Settings > Help and manual.',
      ],
    },
    es: {
      title: 'Clave de recuperación, exportación, tour y manual',
      items: [
        'Clave de recuperación: un código de 24 letras y números que te devuelve el acceso a los datos si olvidas la contraseña. Aparece al crear la cuenta; en cuentas antiguas, créala en Ajustes > Cuenta. En la pantalla de desbloqueo, "Olvidé la contraseña" pide el código y una contraseña nueva, que vale en todos los dispositivos.',
        'Exportar a otras apps: tareas y hábitos en hoja de cálculo (CSV, se abre en Excel, LibreOffice y Hojas de cálculo de Google) y todo en JSON, en Ajustes > Copia de seguridad y exportación.',
        'Tour de bienvenida en las cuentas nuevas: un paso a paso por las partes de Lida, destacando cada una y oscureciendo el resto. Puedes verlo de nuevo en Ajustes > Ayuda y manual.',
        'Ayuda: un "?" junto a los títulos de las secciones explica cada función, y el manual completo (con búsqueda) está en Ajustes > Ayuda y manual.',
      ],
    },
  },
  {
    v: '3.0.0-alfa.19',
    date: '2026-11-18',
    title: 'Pomodoro novo, tique do relógio e metrônomo',
    items: [
      ['novo', 'Pomodoro redesenhado: os minutos se escolhem girando uma faixa de números, como num timer de cozinha. O número do centro cresce e os das bordas encolhem como se estivessem num cilindro, com vibração a cada minuto (mais forte nos múltiplos de 5). Com o Pomodoro correndo, a faixa gira sozinha com o tempo.'],
      ['novo', 'Tique do relógio: um tique por segundo enquanto o Pomodoro ou o modo foco com tempo correm. Liga e desliga no botão Tique, no Pomodoro e na tela de foco.'],
      ['novo', 'Metrônomo (avançado): de 1 a 8 tempos por compasso (até 8/8), cada tempo forte, normal ou mudo, andamento de 30 a 200 batidas por minuto e seis sons (relógio de parede, bloco de madeira, claves, bipe digital, pulso suave e gota). Dá para escolher se toca no foco, na pausa ou no modo foco.'],
    ],
    en: {
      title: 'New Pomodoro, clock tick and metronome',
      items: [
        'Redesigned Pomodoro: you choose the minutes by turning a strip of numbers, like a kitchen timer. The center number grows and the ones at the edges shrink as if they were on a cylinder, with a vibration every minute (stronger on multiples of 5). While the Pomodoro runs, the strip turns on its own with the time.',
        'Clock tick: one tick per second while the Pomodoro or timed focus mode is running. Turn it on and off with the Tick button, in the Pomodoro and on the focus screen.',
        'Metronome (advanced): 1 to 8 beats per bar (up to 8/8), each beat strong, normal or silent, tempo from 30 to 200 beats per minute and six sounds (wall clock, wood block, claves, digital beep, soft pulse and drop). You can choose whether it plays during focus, breaks or focus mode.',
      ],
    },
    es: {
      title: 'Pomodoro nuevo, tic del reloj y metrónomo',
      items: [
        'Pomodoro rediseñado: los minutos se eligen girando una tira de números, como en un temporizador de cocina. El número del centro crece y los de los bordes se encogen como si estuvieran en un cilindro, con vibración en cada minuto (más fuerte en los múltiplos de 5). Con el Pomodoro en marcha, la tira gira sola con el tiempo.',
        'Tic del reloj: un tic por segundo mientras el Pomodoro o el modo enfoque con tiempo están en marcha. Se activa y desactiva con el botón Tic, en el Pomodoro y en la pantalla de enfoque.',
        'Metrónomo (avanzado): de 1 a 8 tiempos por compás (hasta 8/8), cada tiempo fuerte, normal o mudo, tempo de 30 a 200 pulsaciones por minuto y seis sonidos (reloj de pared, bloque de madera, claves, pitido digital, pulso suave y gota). Puedes elegir si suena en el enfoque, en la pausa o en el modo enfoque.',
      ],
    },
  },
  {
    v: '3.0.0-alfa.18',
    date: '2026-11-18',
    title: 'Ofensiva, widgets novos e alarmes de confiança',
    items: [
      ['novo', 'Ofensiva: dias seguidos cumprindo uma parte do que estava programado (tarefas do dia e hábitos). A meta é 50% e dá para mudar em Ajustes > Jogo. Tarefas adiantadas ou atrasadas concluídas no dia contam a favor; dias de folga e a Folga dos hábitos não quebram. A chama fica em Hoje e acende quando a meta do dia vem.'],
      ['novo', 'Lidinho com seis caras para a ofensiva: animado de manhã, comemorando, bravo quando o dia está acabando sem a meta, de pijama depois de cumprir, chorando quando a ofensiva quebra e empoeirado quando o Lida fica abandonado.'],
      ['novo', 'Widgets novos no Android e no Plasma: Ofensiva (o Lidinho muda de cara com a hora, mesmo com o app fechado) e IPL da semana (a nota de cada dia, a média e o melhor dia).'],
      ['melhoria', 'Ajustes em seções: um índice com Conta, Aparência e idioma, Jogo, Sons, Lembretes, Alarmes, Foco, Backup e Sobre, cada uma na sua página.'],
      ['melhoria', 'Tela do alarme mais limpa: a hora, o nome, a descrição e dois botões, sem o realce azul ao tocar. O LED agora é vermelho puro e pisca seco, sem brilho em volta.'],
      ['correcao', 'Alarmes no Android: a tela abre também com o celular em uso (antes ficava só o aviso no topo), não fica mais escondida atrás do pedido de senha da tela de bloqueio e toca o próprio som mesmo sem a permissão de notificações. Em Ajustes > Alarmes, um atalho libera "Sobrepor a outros apps" quando faltar.'],
      ['correcao', 'O resumo de ontem aparece uma vez só, no primeiro aparelho aberto no dia (antes repetia em cada aparelho), e só depois da revisão das tarefas esquecidas, com os números já fechados.'],
      ['correcao', 'A janela de conquista não sai mais da tela no celular, e espera a revisão e os resumos fecharem antes de aparecer.'],
    ],
    en: {
      title: 'Streak, new widgets and alarms you can trust',
      items: [
        'Streak: days in a row completing part of what was scheduled (the day\'s tasks and habits). The goal is 50% and can be changed in Settings > Game. Tasks done ahead of time or late count on the day you complete them; days off and the Habit Day Off don\'t break it. The flame sits in Today and lights up when the day\'s goal is reached.',
        'Lidinho with six faces for the streak: cheerful in the morning, celebrating, angry when the day is ending without the goal, in pajamas after reaching it, crying when the streak breaks and dusty when Lida is abandoned.',
        'New widgets on Android and Plasma: Streak (Lidinho changes his face with the time of day, even with the app closed) and IPL this week (each day\'s score, the average and the best day).',
        'Settings in sections: an index with Account, Appearance and language, Game, Sounds, Reminders, Alarms, Focus, Backup and About, each on its own page.',
        'Cleaner alarm screen: the time, the name, the description and two buttons, without the blue tap highlight. The LED is now pure red and blinks sharply, with no glow.',
        'Alarms on Android: the screen now opens while you are using the phone (before, only the banner at the top showed), no longer hides behind the lock screen PIN, and plays its own sound even without notification permission. Settings > Alarms has a shortcut to allow "Display over other apps" when it is missing.',
        'Yesterday\'s summary shows only once, on the first device opened that day (before, it repeated on each device), and only after reviewing forgotten tasks, with the final numbers.',
        'The achievement window no longer runs off the screen on phones, and waits for the review and summaries to close before showing up.',
      ],
    },
    es: {
      title: 'Racha, widgets nuevos y alarmas confiables',
      items: [
        'Racha: días seguidos cumpliendo una parte de lo programado (tareas del día y hábitos). La meta es 50% y se puede cambiar en Ajustes > Juego. Las tareas adelantadas o atrasadas completadas en el día cuentan; los días de descanso y el Descanso de hábitos no la rompen. La llama está en Hoy y se enciende cuando llega la meta del día.',
        'Lidinho con seis caras para la racha: animado por la mañana, celebrando, enojado cuando el día se acaba sin la meta, en pijama después de cumplirla, llorando cuando se rompe la racha y empolvado cuando Lida queda abandonado.',
        'Widgets nuevos en Android y Plasma: Racha (Lidinho cambia de cara con la hora, incluso con la app cerrada) e IPL de la semana (la nota de cada día, el promedio y el mejor día).',
        'Ajustes en secciones: un índice con Cuenta, Apariencia e idioma, Juego, Sonidos, Recordatorios, Alarmas, Enfoque, Copia de seguridad y Acerca de, cada una en su página.',
        'Pantalla de alarma más limpia: la hora, el nombre, la descripción y dos botones, sin el resaltado azul al tocar. El LED ahora es rojo puro y parpadea seco, sin brillo alrededor.',
        'Alarmas en Android: la pantalla se abre también con el teléfono en uso (antes solo aparecía el aviso arriba), ya no queda escondida detrás del PIN de la pantalla de bloqueo y suena por sí misma incluso sin permiso de notificaciones. En Ajustes > Alarmas, un atajo habilita "Mostrar sobre otras apps" cuando falta.',
        'El resumen de ayer aparece una sola vez, en el primer dispositivo abierto en el día (antes se repetía en cada uno), y solo después de revisar las tareas olvidadas, con los números ya cerrados.',
        'La ventana de logro ya no se sale de la pantalla en el teléfono, y espera a que se cierren la revisión y los resúmenes antes de aparecer.',
      ],
    },
  },
  {
    v: '3.0.0-alfa.17',
    date: '2026-11-12',
    title: 'Lida em inglês e espanhol, e alarmes de tela cheia',
    items: [
      ['novo', 'O app inteiro em inglês e espanhol, além do português: telas, avisos, notificações, widgets do Android e do Plasma, menus do app do Linux, datas e números. Escolha em Ajustes > Idioma (ou na tela de entrada); de início, segue o idioma do aparelho. A adição rápida entende cada idioma ("tomorrow 9am", "mañana a las 9").'],
      ['novo', 'Alarmes de tela cheia para tarefas com horário, rotinas e hábitos: mostram o nome, a descrição e a hora atual, com botões para concluir ou ignorar, e uma luz vermelha piscando como a de um aparelho. Usam a fonte escolhida, com as cores do tema ou um visual AMOLED preto e minimalista. No Android, tocam com o app fechado e o celular bloqueado, no brilho máximo.'],
      ['novo', 'Seis toques de alarme mais longos: despertador clássico com bipes, relógio digital, sinos calmos, marimba, amanhecer e passarinhos. Até 10 alarmes ligados ao mesmo tempo.'],
      ['novo', 'Tema AMOLED Azul: preto puro com um azul bem vivo.'],
      ['correcao', 'A água agora é sempre azul, em qualquer tema (no Bumblebee ela ficava amarela).'],
    ],
    en: {
      title: 'Lida in English and Spanish, and full-screen alarms',
      items: [
        'The whole app in English and Spanish, besides Portuguese: screens, messages, notifications, Android and Plasma widgets, Linux app menus, dates and numbers. Pick it in Settings > Language (or on the welcome screen); at first it follows the device language. Quick add understands each language ("tomorrow 9am", "mañana a las 9").',
        'Full-screen alarms for timed tasks, routines and habits: they show the name, the description and the current time, with buttons to complete or dismiss, and a blinking red light like a device LED. They use your chosen font, with the theme colors or a black, minimalist AMOLED look. On Android they ring with the app closed and the phone locked, at full brightness.',
        'Six longer alarm tones: classic beeping alarm clock, digital clock, calm bells, marimba, sunrise and birdsong. Up to 10 alarms on at the same time.',
        'AMOLED Blue theme: pure black with a vivid blue.',
        'Water is now always blue, in every theme (in Bumblebee it turned yellow).',
      ],
    },
    es: {
      title: 'Lida en inglés y español, y alarmas a pantalla completa',
      items: [
        'Toda la app en inglés y español, además de portugués: pantallas, avisos, notificaciones, widgets de Android y de Plasma, menús de la app de Linux, fechas y números. Elígelo en Ajustes > Idioma (o en la pantalla de entrada); al principio sigue el idioma del dispositivo. La adición rápida entiende cada idioma ("tomorrow 9am", "mañana a las 9").',
        'Alarmas a pantalla completa para tareas con hora, rutinas y hábitos: muestran el nombre, la descripción y la hora actual, con botones para completar o ignorar, y una luz roja parpadeante como la de un aparato. Usan la fuente elegida, con los colores del tema o un estilo AMOLED negro y minimalista. En Android suenan con la app cerrada y el teléfono bloqueado, con el brillo al máximo.',
        'Seis tonos de alarma más largos: despertador clásico con pitidos, reloj digital, campanas tranquilas, marimba, amanecer y pajaritos. Hasta 10 alarmas activadas a la vez.',
        'Tema AMOLED Azul: negro puro con un azul muy vivo.',
        'El agua ahora es siempre azul, en cualquier tema (en Bumblebee se veía amarilla).',
      ],
    },
  },
  {
    v: '3.0.0-alfa.16',
    date: '2026-11-11',
    title: 'Conquistas, Lidinho na foto e atualização no Linux',
    items: [
      ['novo', 'Conquistas, na aba Eu: 112 metas em oito grupos (tarefas, IPL, água, sequências, hábitos, dias seguidos usando o Lida, dias de folga e jornada), cada uma com o seu ícone. Pagam ouro conforme a dificuldade (de 100 a 3.000), resgatado quando você quiser. O que você já tinha feito conta: as conquistas do seu histórico já aparecem desbloqueadas.'],
      ['novo', 'Ao ganhar uma conquista, a medalha aparece virada, treme e gira para mostrar qual foi. A animação aparece uma vez só, no aparelho que você está usando; os outros não repetem.'],
      ['novo', 'Lidinho na foto de perfil de dois jeitos: inteiro, sem moldura, ou em "selfie", com o rosto ocupando o círculo todo e o detalhe de cada título (broto, boina, capelo, coroa, auréola...). Escolha qualquer Lidinho que você já alcançou, ou deixe acompanhar o título.'],
      ['novo', 'Três fantasias do Lidinho liberadas para todo mundo, com selfie: Pinguim, Autômato (não é androide, juramos) e Kiko, o Dragão Encantado. Dá para usar qualquer uma em qualquer aparelho.'],
      ['novo', 'App do Linux: procura versão nova sozinho (ou em Ajustes > Procurar atualização), mostra o que mudou, baixa, confere e instala, e abre de novo já atualizado. Quem instalou pelo git vê os comandos para atualizar.'],
      ['melhoria', 'As Conquistas já estão em português, inglês e espanhol. O resto do app ganha os dois idiomas na próxima versão.'],
    ],
  },
  {
    v: '3.0.0-alfa.15',
    date: '2026-11-11',
    title: 'Lida Libre e consertos',
    items: [
      ['novo', 'Lida Libre: uma versão do app sem nada do Google (nem login, nem Firebase), para o F-Droid e para quem prefere. Sincroniza pela sua nuvem (Dropbox, OneDrive ou Nextcloud) e pode ficar instalada junto com a outra.'],
      ['novo', 'O Lida agora é software livre (licença GPL-3.0). O link do código está em Ajustes > Sobre.'],
      ['correcao', 'Na criação e na edição de hábito, o campo do ícone ocupava a largura toda e empurrava o texto de ajuda para fora da tela.'],
      ['correcao', 'No Quadro, a primeira coluna ficava colada na borda esquerda da tela no celular.'],
    ],
  },
  {
    v: '3.0.0-alfa.14',
    date: '2026-11-11',
    title: 'Sincronize pela sua nuvem e o Lidinho novo',
    items: [
      ['novo', 'Sincronização pela sua própria nuvem: Dropbox, OneDrive ou Nextcloud (e outros servidores WebDAV). Tudo vai cifrado com a sua senha do Lida: quem guarda os arquivos não consegue ler nada. Em Ajustes > Conta.'],
      ['novo', 'Quem usa a conta Google pode mover a sincronização para a própria nuvem (Ajustes > Mover a sincronização). Num aparelho novo, a tela de entrada tem "Já uso o Lida com Dropbox, OneDrive ou Nextcloud".'],
      ['novo', 'Lidinho redesenhado, com um desenho para cada título.'],
      ['novo', 'Títulos novos, agora 12: Neófito, Iniciado, Diligente, Perseverante, Erudito, Obstinado, Calejado, Virtuoso, Mestre, Lifehacker, Ancestral e Soberano.'],
      ['melhoria', 'Cada título agora dá um presente ao ser alcançado (vouchers e, em alguns, um item), crescendo junto com a distância entre um título e o próximo. Os 15 vouchers do nível 15 passaram para os títulos. Quem já tinha títulos recebe os presentes deles uma vez, sem contar duas vezes o que o nível 15 já tinha dado. Temas, Cartas da Sorte e os limites de P0 e P1 continuam nos mesmos níveis.'],
    ],
  },
  {
    v: '3.0.0-alfa.13',
    date: '2026-11-10',
    title: 'Sincronização visível, backup e atualização dentro do app',
    items: [
      ['novo', 'Status da sincronização no topo, com o horário da última sincronização. Um toque mostra os detalhes: o que ainda está esperando para subir, "Sincronizar agora" e as mudanças feitas ao mesmo tempo em dois aparelhos, para você escolher qual fica.'],
      ['novo', 'Backup .lida em Ajustes: exporta todos os dados num arquivo cifrado com uma senha sua e importa juntando com o que já existe (serve para restaurar e para trocar de aparelho ou de versão).'],
      ['novo', 'Foto de perfil: envie uma foto (reduzida e cifrada), use o Lidinho do seu título ou a inicial.'],
      ['novo', 'Atualização dentro do app (APK do GitHub): o Lida avisa quando sai versão nova, mostra o que mudou e baixa, confere e instala sem você sair dele.'],
      ['melhoria', 'Conflitos agora são percebidos entre aparelhos da mesma pessoa (antes só entre pessoas diferentes).'],
      ['correcao', 'A mesma etiqueta criada em dois aparelhos virava duas. Agora é uma só.'],
      ['melhoria', 'App do Linux sem modo de desenvolvedor, e a depuração do app Android fica desligada.'],
    ],
  },
  {
    v: '3.0.0-alfa.12',
    date: '2026-11-10',
    title: 'Temas novos, foco com subtarefas e barra translúcida',
    items: [
      ['novo', 'Quatro temas na Loja: Edna (inspirado no tema do KDE), Monocromo (tudo em cinza), Bumblebee (preto e amarelo) e Tumbleweed (claro, com a barra lateral preta e verde do Evernote).'],
      ['novo', 'Subtarefas e itens de rotina aparecem na tarefa em foco: no cartão de foco em Hoje (marcáveis), no widget do Plasma e na CLI (`lida sub foco N`).'],
      ['novo', 'Ofensiva da água: 7 dias seguidos batendo a meta rendem 200 XP e 200 de ouro.'],
      ['novo', 'App do Linux: barra lateral translúcida, com o desfoque do KWin (Ajustes > Tema ou menu Exibir).'],
      ['melhoria', 'Tarefas rendem cerca de 30% mais ouro (P0 65, P1 52, P2 40, P3 28, P4 15). A punição continua igual.'],
      ['correcao', 'Anéis e barras de progresso pulavam direto para o valor novo ao concluir tarefas ou subtarefas. Agora a trajetória anima.'],
    ],
  },
  {
    v: '3.0.0-alfa.11',
    date: '2026-11-10',
    title: 'Revisão completa, foco em rotinas e Live Update',
    items: [
      ['novo', 'A revisão de ontem agora inclui hábitos e água: marque o hábito que você fez e esqueceu, ou some os copos que faltaram, tudo valendo para ontem.'],
      ['novo', 'Dá para focar em rotinas: toque na rotina para abrir o cartão (com os itens marcáveis) e use Focar, ou escolha em "Focar numa tarefa".'],
      ['melhoria', 'Power-ups (Respiro e Alívio) saíram da edição e foram para o cartão da tarefa, com a quantidade que você tem.'],
      ['melhoria', 'Live Update (Android 16): a notificação do foco ganhou barra de progresso, o pedido de promoção ficou completo e, em Ajustes > Foco, dá para ver se está ativa e liberar com um toque. Na Xiaomi, o chip mostra o tempo em texto.'],
      ['melhoria', 'Textos do Lidinho reescritos: cada título fala de uma fase da produtividade.'],
      ['correcao', 'Com a fonte VT323, a interface inteira ficava maior e espaçada. Agora só as letras dela são ajustadas; espaços e botões ficam iguais aos das outras fontes.'],
    ],
  },
  {
    v: '3.0.0-alfa.10',
    date: '2026-11-10',
    title: 'Virada do dia confiável',
    items: [
      ['correcao', 'Tarefas adiadas com o Alívio sumiam no dia seguinte quando você usava dois aparelhos. O aparelho que abria primeiro fechava o dia antes de receber a mudança do outro e marcava a tarefa como vencida. Agora a virada só acontece depois de puxar os dados do servidor; sem conexão, ela espera. As tarefas que já tinham sumido voltam sozinhas para a lista, e a punição é devolvida.'],
      ['correcao', 'Tarefas concluídas em um aparelho apareciam como não feitas no resumo do outro e derrubavam o IPL. Mesmo motivo, mesma correção. E as notas dos últimos 7 dias agora são refeitas quando chega uma informação atrasada (conclusão, prazo adiado, falha desfeita), junto com a do mês e a do ano.'],
      ['correcao', 'Rotina duplicada (por exemplo, duas "Noite"): a rotina de um dia já fechado que chegava aberta pela sincronização ficava na lista para sempre. Agora ela é arquivada.'],
      ['correcao', 'Tarefa repetida que vencia parava de repetir. Agora a próxima ocorrência nasce mesmo quando a anterior vence.'],
      ['correcao', 'O aviso do Congelamento Automático mostrava o nome do hábito em branco.'],
      ['correcao', 'Ao marcar uma tarefa ou um hábito, o círculo podia piscar fora do lugar por um instante.'],
      ['novo', 'Revisão de ontem: antes do resumo do dia, aparecem as tarefas que eram para ontem e ficaram sem marcar. Marque o que você fez e esqueceu: conta para ontem, com a recompensa normal, e só depois o IPL é calculado. Só aparece quando o último dia aberto foi ontem; depois de vários dias longe, não.'],
      ['novo', 'Novidades e correções aqui em Ajustes.'],
    ],
  },
  {
    v: '3.0.0-alfa.9.1',
    date: '2026-11-09',
    title: 'Lidinho com vida',
    items: [
      ['melhoria', 'Lidinho redesenhado: rosto de lado e de três quartos, poses e cenas diferentes em cada título (mochila de lado, corrida, leitura, pulo com diploma, capa, feitiço, salto de Lenda).'],
      ['novo', 'Tocar no Lidinho abre a coleção: o título atual e os anteriores com um texto curto, e os próximos só na sombra.'],
    ],
  },
  {
    v: '3.0.0-alfa.9',
    date: '2026-11-09',
    title: 'Quadro, resumão do ano e Loja maior',
    items: [
      ['novo', 'Quadro (Kanban) em Hoje, Planejar, projetos e no Painel: agrupe por data, prioridade ou projeto e arraste para mudar.'],
      ['novo', 'Resumão do ano na virada, com o IPL do ano pela média dos meses.'],
      ['novo', 'Lidinho, o mascote, perto do nível.'],
      ['novo', 'Quatro conjuntos de sons na Loja e o Congelamento Automático.'],
      ['novo', 'Fonte retrô VT323 e botão de copiar a descrição.'],
      ['melhoria', 'Carta da Sorte premia quase sempre (prêmios menores, mais frequentes).'],
      ['correcao', 'Ícones da barra de status escuros nos temas claros, no Android.'],
    ],
  },
  {
    v: '3.0.0-alfa.8',
    date: '2026-11-08',
    title: 'Lida para Linux',
    items: [
      ['novo', 'App para Linux (KDE): menu global, bandeja, comando "lida" no terminal e widgets do Plasma (Foco e Anéis).'],
      ['melhoria', 'Ícones novos, com cantos arredondados.'],
      ['novo', 'Cartão com os detalhes da tarefa ao tocar; descrição visível na lista.'],
    ],
  },
  {
    v: '3.0.0-alfa.7',
    date: '2026-11-08',
    title: 'Foco global e Painel',
    items: [
      ['novo', 'Foco global: tarefa em foco e cronômetros sincronizados entre aparelhos.'],
      ['novo', 'Painel em telas largas, relógio flutuante e widget Anéis no Android.'],
      ['melhoria', 'Tamanho real da interface, constância da água, hábitos em dia de folga e reflexões em tela cheia.'],
    ],
  },
  {
    v: '3.0.0-alfa.6',
    date: '2026-11-07',
    title: 'IPL e resumos',
    items: [
      ['novo', 'IPL revisado, resumo do dia e do mês, cronômetro na notificação.'],
      ['melhoria', 'Subtarefas visíveis, editar segurando, seletor de horário, água com copo e garrafa, mais lembretes.'],
    ],
  },
];

export const KIND_LABEL = { novo: 'Novo', melhoria: 'Melhoria', correcao: 'Correção' };
