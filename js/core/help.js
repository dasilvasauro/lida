// Ajuda do Lida: o texto curto do "?" ao lado das seções e o manual (Ajustes > Ajuda e manual).
// Cada tópico: title, short (uma frase, no "?") e body (parágrafos do manual).
// Os textos estão em português e passam pelo dicionário (js/i18n) como o resto do app.

export const CHAPTERS = [
  {
    id: 'comeco',
    title: 'Começando',
    topics: [
      {
        id: 'hoje',
        title: 'Hoje',
        short: 'O que é para hoje: tarefas com data de hoje, as atrasadas, as rotinas do dia e o que você já concluiu.',
        body: [
          'Hoje junta tudo o que tem data de hoje, as tarefas atrasadas (com o botão Trazer para hoje), as rotinas do dia e as concluídas. Toque no círculo para concluir; segure a tarefa para editar.',
          'No topo ficam a chama da ofensiva, o Prêmio do dia, o humor e as ferramentas: focar numa tarefa, Pomodoro e Esvaziar a mente. Em telas largas, Hoje e Planejar viram um Painel só.',
        ],
      },
      {
        id: 'adicionar',
        title: 'Adição rápida',
        short: 'Escreva como você fala: "Pagar luz amanhã 9h p1 #Casa @contas" já sai com data, hora, prioridade, projeto e etiqueta.',
        body: [
          'O Lida entende datas (hoje, amanhã, sexta, dia 15, 20/11, em 3 dias, próxima semana), horários (9h, 14:30, às 9), prioridade (p0 a p4), #projeto, @etiqueta e repetição (todo dia, dias úteis, toda segunda e quarta, todo mês).',
          'O que ele entendeu aparece como etiquetas embaixo do campo antes de você salvar. Funciona em português, inglês e espanhol, no idioma escolhido no app.',
        ],
      },
      {
        id: 'planejar',
        title: 'Planejar',
        short: 'Entrada (o que ainda não tem data), os próximos dias e os projetos, em lista ou em quadro.',
        body: [
          'A Entrada guarda o que ainda não tem data nem projeto: anote primeiro e organize depois. Próximos dias mostra a semana, dia a dia. Projetos agrupam tarefas de um mesmo assunto, com progresso.',
          'O botão Lista/Quadro troca para colunas (como num kanban): arraste uma tarefa para mudar a data ou a coluna.',
        ],
      },
      {
        id: 'tipos',
        title: 'Tipos de tarefa',
        short: 'Normal, com tempo (abre o modo foco com cronômetro), sprint (objetivo maior com etapas), desafio do dia e bônus.',
        body: [
          'Com tempo: tem duração e o botão ▶ abre o modo foco com contagem regressiva. Sprint: um objetivo maior, com etapas e data de fim; só um ativo por vez e rende bem mais. Desafio do dia: vale só para hoje e expira à meia-noite.',
          'Tarefa Bônus (item da Loja): rende a recompensa normal e não pune se ficar para trás.',
        ],
      },
      {
        id: 'prioridades',
        title: 'Prioridades',
        short: 'De P0 (crítica) a P4 (sem prioridade). Quanto mais alta, mais XP e ouro; P0 e P1 têm limite por dia.',
        body: [
          'A prioridade pesa na recompensa e no IPL. Para P0 e P1 não virarem tudo, há um limite de tarefas abertas para hoje (uma P0 e duas P1 até certos níveis); itens da Loja liberam mais uma, e o limite some nos níveis altos.',
        ],
      },
    ],
  },
  {
    id: 'habitos',
    title: 'Hábitos',
    topics: [
      {
        id: 'habitos',
        title: 'Hábitos e sequências',
        short: 'Cada hábito tem uma meta por dia e os dias da semana. Bater a meta mantém a sequência e rende progresso de voucher.',
        body: [
          'Toque no círculo para somar (ou marcar). A sequência conta os dias seguidos batendo a meta nos dias do hábito; os outros dias não quebram. Feito num dia de folga conta como extra.',
          'A cada 3 metas batidas, um voucher. Segure o hábito para editar, proteger com Congelamento ou ver o histórico.',
        ],
      },
      {
        id: 'agua',
        title: 'Água',
        short: 'Registre copos e garrafas até a meta do dia. Dias seguidos na meta formam uma ofensiva da água.',
        body: ['Ajuste a meta, o copo e a garrafa no lápis do cartão. A cada 7 dias seguidos na meta, +200 de XP e +200 de ouro. Os lembretes de água ficam em Ajustes > Lembretes.'],
      },
      {
        id: 'rotinas',
        title: 'Rotinas',
        short: 'Uma lista curta (ex.: Manhã: água, alongar, planejar) que aparece em Hoje nos dias escolhidos.',
        body: ['A rotina vira um cartão em Hoje com os itens para marcar. Rende de 50 a 200 de XP e ouro, conforme o número de itens. Rotina não concluída não pune. Pode ter horário e alarme.'],
      },
      {
        id: 'desapego',
        title: 'Desapego',
        short: 'Para o que você quer deixar de fazer: um check-in por dia sem recair, com recompensas que crescem na semana.',
        body: ['O 7º dia do ciclo traz uma Carta da Sorte. Se recair, o contador volta ao dia 1 e você perde metade do XP do nível atual e do ouro. Excluir custa o mesmo que uma recaída, para não virar atalho.'],
      },
      {
        id: 'folga',
        title: 'Folga e Congelamento',
        short: 'Congelamento protege a sequência de um hábito num dia difícil; a Folga dos hábitos protege todos de uma vez.',
        body: [
          'São itens da Loja. O Congelamento Automático salva sozinho as sequências dos hábitos que ficaram por fazer num dia perdido (um por dia). Os dias de folga da semana (Ajustes > Jogo) não são cobrados no IPL nem quebram a ofensiva.',
        ],
      },
    ],
  },
  {
    id: 'jogo',
    title: 'Jogo',
    topics: [
      {
        id: 'xp',
        title: 'XP, níveis e títulos',
        short: 'Concluir rende XP. Os níveis sobem e, de tempos em tempos, vem um título novo, com presente e o Lidinho de roupa nova.',
        body: [
          'São 12 títulos, do Neófito ao Soberano, e cada um traz vouchers (e às vezes itens). O Lidinho, o mascote, troca de roupa a cada título; toque nele na aba Eu para ver todos. Os marcos de nível liberam temas, cartas e limites maiores de P0 e P1.',
        ],
      },
      {
        id: 'ouro',
        title: 'Ouro e Loja',
        short: 'Ouro vem de tarefas, rotinas, água, check-ins e conquistas. Na Loja vira itens, temas e conjuntos de sons.',
        body: ['Na Loja, a aba Ouro tem os itens do dia a dia (impulsos, Dado Mágico, Respiro, Alívio...). Vouchers compram os itens especiais. Temas e sons comprados valem em todos os aparelhos.'],
      },
      {
        id: 'itens',
        title: 'Vouchers, cartas e itens',
        short: 'Vouchers vêm de hábitos, do Pomodoro e dos títulos; as Cartas da Sorte quase sempre premiam. Use os itens em "Seus itens".',
        body: [
          'Um voucher a cada 3 metas de hábito, a cada hora de foco no Pomodoro e nos títulos. Cartas da Sorte: ouro, XP, voucher ou item (e de vez em quando a sorte grande). Respiro e Alívio se usam no cartão da tarefa; Congelamento, no cartão do hábito.',
        ],
      },
      {
        id: 'modus',
        title: 'Estilo de jogo e punições',
        short: 'O Modus Operandi dá um bônus para o seu jeito de trabalhar. Punições tiram XP e ouro de tarefas que vencem.',
        body: ['Multitarefa (+20% em tudo), Minimalista (+50% em P0 e P1), Pontual (+30% em tarefas com data) ou Ambicioso (+80% em sprints e desafios). Trocar depois custa um item da Loja. As punições nunca baixam o seu nível e podem ser desligadas em Ajustes > Jogo.'],
      },
      {
        id: 'conquistas',
        title: 'Conquistas',
        short: 'Mais de cem metas em oito grupos, cada uma com medalha e ouro para resgatar quando quiser.',
        body: ['O que você já tinha feito conta. Ao ganhar uma, a medalha aparece com suspense no aparelho que você está usando. O ouro fica esperando o resgate na aba Eu > Conquistas.'],
      },
      {
        id: 'ofensiva',
        title: 'Ofensiva',
        short: 'Dias seguidos cumprindo a meta do dia (50% do programado, por padrão). A chama em Hoje acende quando a meta vem.',
        body: [
          'Conta as tarefas com prazo no dia e os hábitos do dia; o que você adianta ou recupera também conta. Num dia sem nada programado, basta concluir uma coisa. Dias de folga e a Folga dos hábitos não quebram. A meta muda em Ajustes > Jogo.',
          'O Lidinho muda de cara: animado de manhã, bravo no fim do dia sem a meta, de pijama depois de cumprir, chorando quando a ofensiva quebra.',
        ],
      },
      {
        id: 'premio',
        title: 'Prêmio do dia',
        short: 'Abra o Lida todo dia e resgate: o prêmio cresce ao longo de 7 dias, e o maior vem no 7º.',
        body: ['Faltou um dia, a sequência recomeça no dia 1. É separado da ofensiva: o prêmio é por aparecer; a ofensiva é por cumprir.'],
      },
    ],
  },
  {
    id: 'foco',
    title: 'Foco',
    topics: [
      {
        id: 'pomodoro',
        title: 'Pomodoro, tique e metrônomo',
        short: 'Ciclos de foco e pausa. Gire a faixa de números para escolher os minutos; o tique e o metrônomo são opcionais.',
        body: [
          'Cada hora de foco no Pomodoro rende um voucher. O botão Tique toca um tique por segundo enquanto o cronômetro corre; em Metrônomo dá para montar uma batida de até 8 tempos, com tempos fortes, normais ou mudos, e escolher o som.',
        ],
      },
      {
        id: 'focotarefa',
        title: 'Tarefa em foco e modo foco',
        short: 'A tarefa em foco aparece em todos os aparelhos, na notificação e nos widgets. Tarefas com tempo abrem o modo foco com cronômetro.',
        body: ['No Android, a notificação do foco mostra a contagem (e vira Live Update no Android 16). Ao minimizar o Lida com um cronômetro rodando, o relógio flutuante fica por cima dos outros apps, se você liberar.'],
      },
      {
        id: 'mente',
        title: 'Esvaziar a mente',
        short: 'Despeje tudo o que está na cabeça, uma coisa por linha, e depois distribua em quatro caixas.',
        body: ['Fazer agora (leva menos de 5 minutos), Agendar, Delegar ou largar, e Incubadora (ideias para depois). Qualquer item pode virar tarefa.'],
      },
    ],
  },
  {
    id: 'acompanhar',
    title: 'Acompanhamento',
    topics: [
      {
        id: 'ipl',
        title: 'IPL',
        short: 'Índice de Produtividade do Lida: uma nota de 0 a 100 para o dia, por partes, não pela quantidade de tarefas.',
        body: [
          'Execução (o que tinha prazo e saiu a tempo, com peso pela prioridade), Hábitos e rotinas, Constância (dias ativos na semana), Projetos e sprints, Planejamento (carga realista, pouca coisa adiada) e Foco. Só entram as partes que você usa.',
          'O dia fecha à meia-noite; a nota do mês é a média dos dias com nota, e a do ano, a média dos meses.',
        ],
      },
      {
        id: 'resumos',
        title: 'Revisão e resumos',
        short: 'Na primeira abertura do dia, a revisão mostra o que ficou sem marcar ontem; depois vem o resumo do dia, uma vez só.',
        body: ['Marque na revisão o que você fez e esqueceu: conta para ontem, com a recompensa normal. O resumo do dia (e do mês e do ano, quando fecham) aparece no primeiro aparelho aberto e fica na aba Eu.'],
      },
      {
        id: 'visao',
        title: 'Humor, visão e reflexões',
        short: 'Registre o humor do dia, escreva seus objetivos na Visão e guarde aprendizados em cartões de Reflexões.',
        body: ['A Visão lembra você de revisar os objetivos a cada poucas semanas, com o estado de cada um de 1 (inativo) a 5 (consistente). As Reflexões são frases curtas para reler quando precisar.'],
      },
    ],
  },
  {
    id: 'avisos',
    title: 'Avisos',
    topics: [
      {
        id: 'lembretes',
        title: 'Lembretes',
        short: 'Tarefas com horário, atrasadas, hábitos pendentes, caixa de entrada, resumo da manhã, fechamento do dia e água.',
        body: ['Cada tipo tem seu interruptor e horário em Ajustes > Lembretes. No Android, chegam com o app fechado e sem internet; na web, enquanto o Lida estiver aberto.'],
      },
      {
        id: 'alarmes',
        title: 'Alarmes',
        short: 'Alarme de tela cheia para o que não pode passar, em tarefas com horário, rotinas e hábitos. Até 10 ligados.',
        body: ['Escolha o toque no editor de cada um. A tela mostra o nome, a descrição e a hora, com Concluir e Ignorar. No Android, libere a tela cheia e "Sobrepor a outros apps" em Ajustes > Alarmes.'],
      },
    ],
  },
  {
    id: 'dados',
    title: 'Seus dados',
    topics: [
      {
        id: 'sync',
        title: 'Sincronização e privacidade',
        short: 'Tudo é cifrado com a sua senha antes de sair do aparelho: nem quem guarda os dados consegue ler.',
        body: ['Use só no aparelho, com a conta Google ou com a sua própria nuvem (Dropbox, OneDrive, Nextcloud/WebDAV). Funciona sem internet e sincroniza quando a conexão volta.'],
      },
      {
        id: 'recuperacao',
        title: 'Senha e chave de recuperação',
        short: 'A senha cifra os seus dados. A chave de recuperação deixa criar uma senha nova se você esquecer a sua.',
        body: [
          'O código de recuperação aparece ao criar a conta e pode ser gerado de novo em Ajustes > Conta (o anterior deixa de valer). Para usar, toque em "Esqueci a senha" na tela de desbloqueio.',
          'Guarde o código fora do Lida. Sem a senha e sem o código, ninguém recupera os dados, nem o Lida.',
        ],
      },
      {
        id: 'backup',
        title: 'Backup e exportação',
        short: 'O backup .lida (cifrado) restaura no Lida; a planilha (CSV) e o JSON levam os dados para outros programas.',
        body: ['Importar um backup junta os dados com os que já estão no aparelho, sem apagar nada. Os arquivos CSV e JSON saem sem cifra: guarde com cuidado.'],
      },
      {
        id: 'widgets',
        title: 'Widgets',
        short: 'No Android: Hoje, Anéis, Ofensiva e IPL da semana. No Plasma (Linux): Foco, Anéis, Ofensiva e IPL da semana.',
        body: ['Os widgets mostram o que o app manda e se atualizam sempre que algo muda. No Android, segure a tela inicial > Widgets > Lida.'],
      },
    ],
  },
];

export const TOPICS = Object.fromEntries(CHAPTERS.flatMap((c) => c.topics.map((t) => [t.id, { ...t, chapter: c.id }])));
