// Novidades e correções, da mais nova para a mais antiga (aparece em Ajustes > Novidades e correções).
// Regra: toda versão nova entra aqui, com o que mudou para quem usa (não detalhes de código).
// tipo: 'novo' | 'melhoria' | 'correcao'
// en/es (opcional): { title, items: [textos na mesma ordem] } para quem usa o app em inglês ou espanhol.
export const CHANGELOG = [
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
