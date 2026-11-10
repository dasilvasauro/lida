// Novidades e correções, da mais nova para a mais antiga (aparece em Ajustes > Novidades e correções).
// Regra: toda versão nova entra aqui, com o que mudou para quem usa (não detalhes de código).
// tipo: 'novo' | 'melhoria' | 'correcao'
export const CHANGELOG = [
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
