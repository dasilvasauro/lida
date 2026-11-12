# Lida

Tarefas e hábitos num só lugar, com uma pequena recompensa a cada passo concluído.
Funciona no navegador (celular e computador) e como app Android, offline, com os dados cifrados no aparelho.

> **Lida 3 — alfa 16.** Esta é a reescrita completa do Lida, na mesma base do Pago e do Zelo.
> A versão anterior (React) continua no ar na branch `main` até a nova alcançar o que ela fazia.

---

## Sumário

1. [O que mudou no Lida 3](#o-que-mudou-no-lida-3)
2. [O que já funciona e o que vem depois](#o-que-já-funciona-e-o-que-vem-depois)
3. [Usar na web](#usar-na-web)
4. [Usar no Android (APK)](#usar-no-android-apk)
5. [Lida para Linux](#lida-para-linux) (app, CLI `lida` e widgets do Plasma)
6. [Idiomas](#idiomas)
7. [Lembretes](#lembretes)
8. [Alarmes](#alarmes)
9. [Foco](#foco)
10. [Trazer os dados do Lida anterior](#trazer-os-dados-do-lida-anterior)
11. [Privacidade e sincronização](#privacidade-e-sincronização)
12. [Sua parte: publicar](#sua-parte-publicar)
13. [Licença](#licença)
14. [Desenvolvimento](#desenvolvimento)
15. [Limites honestos](#limites-honestos)

---

## O que mudou no Lida 3

- **Foco em tarefas e hábitos.** Notas, Feeds e a tela de Atalhos foram removidos (e não são importados).
- **Mesma base do Pago e do Zelo.** JavaScript sem etapa de build, cada tarefa é um registro cifrado
  separado, sincronização campo a campo (duas edições no mesmo minuto não se apagam).
- **App Android de verdade.** O APK é gerado automaticamente pelo GitHub Actions, sem Android Studio.
  Lembretes são agendados no próprio celular: chegam sem internet e com o app fechado.
- **Aparência.** 18 temas (e o automático, que segue o aparelho) com paleta por função (fundo, superfícies, texto, destaque, progresso,
  prioridades), 8 fontes embutidas (funcionam offline), incluindo a retrô VT323, e 4 tamanhos de interface.
- **Sons.** Sintetizados no aparelho (nenhum arquivo para baixar): concluir, XP, subir de nível,
  progresso. Volume ajustável, podem ser desligados, e mais 4 conjuntos de timbres na Loja.

## O que já funciona e o que vem depois

| Fase | Conteúdo | Situação |
|---|---|---|
| 1 | Base nova, login, senha, importação, aparência, sons, lembretes, APK | Pronta |
| 2–4 | Tipos de tarefa, virada do dia, hábitos, água, rotinas, desapego, Loja, Pomodoro, Esvaziar a mente, animações | Pronta |
| 5 | **Etiquetas**, **descrição com formatação** (negrito, links, listas de verificação), **adição rápida em linguagem natural**, **projetos**, **busca**. Aba **Eu** (perfil, nível, marcos, gráficos, constância, IPL, humor, visão, reflexões), **humor do dia** em Hoje, **apresentação** na primeira abertura, **notificações** completas com som de campainha de bicicleta e botões, **widget** Hoje no Android | Pronta |
| 6 | **Espaço compartilhado** para duas pessoas (convite por QR Code, cifrado como o Pago/Zelo) | Próxima |
| 7 | **Login com Google no APK** (seletor de contas do Android) | Pronta (precisa do passo 4 de "Sua parte") |
| alfa 6 | **IPL** revisado com gráfico e explicação, **resumo do dia** e **do mês**, subtarefas visíveis e recolhíveis, editar segurando, seletor de horário próprio, água com copo e garrafa, qualquer emoji nos hábitos, avisos dispensáveis, mais lembretes (antecedência, atrasadas, hábitos, caixa de entrada, aviso com o app aberto), **cronômetro na notificação** (Live Update no Android 16) | Pronta |
| alfa 7 | **Foco global** (tarefa em foco e cronômetros sincronizados entre aparelhos), **Painel** em telas largas (Hoje + Planejar + resumo), notificação do foco colorida, **relógio flutuante** e widget **Anéis** no Android, tamanho real da interface, constância da água, hábitos em dia de folga, reflexões em tela cheia | Pronta |
| alfa 8 | **Lida para Linux** (Qt/PySide6): menu global do KDE, bandeja, CLI `lida`, widgets do Plasma (foco/Pomodoro e Anéis), script de instalação | Pronta |
| alfa 9 | **Quadro (Kanban)** com Lista/Quadro em Hoje, Planejar, projetos e Painel; **resumão do ano** com IPL pela média dos meses; **Lidinho**, o mascote que troca de roupa a cada título; **4 conjuntos de sons** na Loja; **Congelamento Automático**; Carta da Sorte que premia mais; fonte retrô **VT323**; copiar a descrição; simular dias no modo demo | Pronta |
| alfa 10 | **Virada do dia confiável** entre aparelhos (puxa do servidor antes de fechar; sem conexão, espera), consertos automáticos (falha por engano, rotina duplicada, notas dos últimos 7 dias refeitas), repetida que vence continua a série, **revisão de ontem** antes do resumo e **Novidades e correções** em Ajustes | Pronta |
| alfa 11 | Revisão de ontem com **hábitos e água**, **foco em rotinas**, power-ups no **cartão da tarefa**, **Live Update** com progresso e status em Ajustes, VT323 sem inflar a interface, textos novos do Lidinho | Pronta |
| alfa 12 | Temas **Edna, Monocromo, Bumblebee e Tumbleweed**, subtarefas na tarefa em foco (cartão, widget e CLI), ofensiva da água, +30% de ouro nas tarefas, anéis e barras animados, **barra lateral translúcida** no Linux | Pronta |
| alfa 13 | **Status e horário da sincronização**, conflitos entre aparelhos, **backup .lida** cifrado, **foto de perfil** ou Lidinho, **atualização dentro do app** com changelog, Releases com link fixo do APK, fim do modo de desenvolvedor | Pronta |
| alfa 14 | **Sincronização pela sua nuvem** (Dropbox, OneDrive, Nextcloud/WebDAV), **mover a sincronização** da conta Google para ela, **Lidinho redesenhado**, 12 títulos novos com presentes | Pronta |
| alfa 15 | **Lida Libre** (sem Google nem Firebase, id próprio, APK na Release), receita do F-Droid e metadados, versionCode tirado da versão, licença **GPL-3.0**, correções no ícone do hábito e no Quadro | Pronta |
| alfa 16 | **Conquistas** (112, com medalhas, ouro resgatável e revelação com suspense), **Lidinho na foto** (inteiro ou selfie, qualquer um já alcançado), **atualização dentro do app no Linux** | Pronta |
| alfa 17 | O app inteiro em **inglês e espanhol** (Ajustes > Idioma), **alarmes de tela cheia** com 6 toques, tema **AMOLED Azul**, água sempre azul | **Esta versão** |

## Como o jogo funciona

**Tarefas**

| Tipo | Como funciona |
|---|---|
| Tarefa | Recompensa por prioridade: P0 150 XP / 65 de ouro, P1 100 / 52, P2 75 / 40, P3 50 / 28, P4 25 / 15. A punição de uma tarefa vencida é menor no ouro (P0 50 … P4 10). |
| Com tempo | Tem duração (5 a 120 min). O ▶ abre o modo foco com cronômetro, que continua certo com a tela desligada. |
| Sprint | Objetivo maior com etapas e data de fim. Um ativo por vez, mostrado no topo de Hoje com o progresso das etapas e dos dias. |
| Desafio do dia | Vale só para hoje. Um por dia. |
| Bônus | Usa uma Tarefa Bônus da Loja. Rende o normal e não pune se ficar para trás. |
| Rotina | Criada sozinha nos dias escolhidos (aba Hábitos). De 50 a 200 de XP e ouro, conforme o número de itens. Não pune. |

- **Limites:** até o nível 30, uma P0 aberta para hoje; até o 40, duas P1. Os itens P0 Extra e P1 Extra liberam mais uma.
- **Virada do dia:** ao abrir o app (ou à meia-noite com ele aberto), cada dia que passou é fechado: tarefas vencidas
  falham e tiram XP e ouro (nunca baixam de nível; dá para desligar em Ajustes), rotinas não feitas são arquivadas,
  o dia ganha uma nota no IPL e as rotinas de hoje aparecem. Na primeira abertura do dia aparece o **resumo de ontem**
  (na virada do mês, o **resumo do mês**; na virada do ano, o **resumão do ano**, com o IPL do ano pela média das
  notas dos meses, o melhor e o pior mês, o projeto que mais andou e o hábito mais firme). Uma tarefa que venceu ainda pode ser concluída, sem recompensa,
  ou reagendada para hoje.
- **Revisão de ontem:** se o último dia aberto foi ontem e ficou algo de ontem sem marcar (tarefas, hábitos ou a meta
  de água), antes de fechar o dia o Lida mostra o que ficou. Marque o que você fez e esqueceu, ou some os copos que
  faltaram: conta para ontem, com a recompensa normal, e só depois o IPL é calculado. Depois de vários dias longe, a revisão não aparece (os dias fecham direto).
- **Com dois aparelhos:** a virada só acontece depois de puxar do servidor o que mudou nos outros aparelhos. Sem
  conexão, ela espera (o app avisa) e roda assim que conectar. Se mesmo assim chegar algo atrasado, a virada seguinte
  conserta: desfaz falhas marcadas por engano (devolvendo a punição), arquiva rotinas de dias já fechados e refaz as
  notas dos últimos 7 dias, do mês e do ano.
- **Estilo de jogo (Ajustes):** Multitarefa (+20% em tudo), Minimalista (+50% em P0/P1), Pontual (+30% com data),
  Ambicioso (+80% em sprints e desafios). Trocar depois custa um item da Loja.
- **Títulos (12):** Neófito (1), Iniciado (3), Diligente (5), Perseverante (8), Erudito (12), Obstinado (16),
  Calejado (20), Virtuoso (25), Mestre (30), Lifehacker (37), Ancestral (44) e Soberano (50). Cada título dá um presente
  ao ser alcançado, que cresce junto com a distância até o próximo: Iniciado e Diligente +3 vouchers, Perseverante
  +5 e um Congelamento, Erudito +5 e um Impulso de XP, Obstinado +8 e um Congelamento Automático, Calejado +8,
  Virtuoso +10, Mestre +10, Lifehacker +12 e um Dado Mágico, Ancestral +15 e um Impulso de Ouro, Soberano +40.
  Quem já tinha títulos antes do alfa 14 recebe os presentes deles uma vez (descontados os 15 vouchers que o
  nível 15 dava antes).
- **Marcos de nível:** Carta da Sorte a cada 5 níveis (e a cada nível depois do 25), temas no 10, 20, 35 e 50 (Darcula),
  P0 sem limite no 30, P1 sem limite no 40, mais o presente de cada título. O **Lidinho**, o mascote (um bichinho
  redondo e lavanda), aparece no cartão de nível, no avatar (se você quiser) e no aviso de título novo, com um desenho
  para cada título (`icons/lidinho/`). Tocar nele abre a coleção: o título atual e os anteriores com um texto curto,
  e os próximos só na silhueta, sem o nome.
- **Conquistas (aba Eu):** 112 metas em oito grupos: tarefas (criadas, concluídas, P0, sprints, desafios, de
  madrugada ou de noite, subtarefas, projetos, etiquetas), IPL (do mês e do dia), água, sequências (hábitos, prêmio do
  dia, Desapego), hábitos, dias seguidos usando o Lida, atividade nos dias de folga e jornada (nível, horas de foco,
  humor, reflexões, visão, Cartas da Sorte, ouro ganho). Cada uma tem o seu ícone numa medalha (bronze, prata, ouro,
  platina ou diamante) e paga ouro pela dificuldade: 100, 250, 600, 1.400 ou 3.000. O ouro é resgatado à mão (uma a
  uma ou todas de uma vez). Ao ganhar, a medalha aparece virada, treme e gira para mostrar a conquista; isso acontece
  uma vez só, no aparelho que está com a tela aberta, que marca a conquista como vista (os outros aparelhos não
  repetem a animação). O histórico conta: na primeira abertura com esta versão, o que você já tinha feito desbloqueia
  de uma vez, num aviso só. Uma vez desbloqueada, a conquista fica, mesmo que o número caia depois. Os textos
  existem em português, inglês e espanhol.
- **Foto de perfil:** sua foto (reduzida e cifrada), a inicial, a da conta Google ou o Lidinho, inteiro (sem moldura)
  ou em "selfie" (o rosto ocupa o círculo todo, sem fundo, com o detalhe do título por cima: broto, mochila, faixa,
  cachecol, óculos, faixa de honra, boina e bigode, capelo, capa, telas e óculos escuros, coroa, auréola; em
  `icons/lidinho/selfie/`, gerados por `scripts/lidinho-selfie.py`).
  Além dos 12 títulos, três **fantasias** liberadas para todo mundo, em qualquer aparelho: Pinguim, Autômato e Kiko,
  o Dragão Encantado (desenhadas por `scripts/lidinho-costumes.py` sobre o Lidinho Neófito; desenhos originais,
  sem copiar mascote de ninguém). Dá para escolher qualquer Lidinho já alcançado ou deixar acompanhar o título.
- **Carta da Sorte:** quase sempre premia, quase sempre pouco: 30 a 60 de ouro (30%), 60 a 120 XP (25%), 100 de ouro (12%),
  200 XP (10%), 1 voucher (7%), um item (5%), a sorte grande de 300 de ouro ou 500 XP (3%) e nada (8%).

**IPL — Índice de Produtividade do Lida (aba Eu):** nota de 0 a 100 por dia, com média do mês (A+ a F) e gráfico
de 30 dias. Não conta só tarefas: avalia o dia por partes, e **só entram as partes que fazem sentido para o seu uso**.

| Parte | Peso | O que mede |
|---|---|---|
| Execução | 30 | Tarefas com prazo no dia concluídas a tempo, pesadas pela prioridade (P0 5×, P4 1×). Adiantar ou recuperar soma um pouco. |
| Hábitos e rotinas | 25 | Fração da meta de cada hábito programado (meia meta conta meio), passos das rotinas e meta de água (se você registra água). |
| Constância | 15 | Dias com alguma atividade nos últimos 7 (folgas não são cobradas). |
| Projetos e sprints | 15 | Sprint no ritmo do calendário (etapas × tempo) e projetos com prazo por perto que andaram na semana. |
| Planejamento | 10 | Poucas tarefas adiadas e carga do dia perto da sua média. |
| Foco | 5 | Minutos de Pomodoro (50 min = máximo). Só conta se você usou o Pomodoro no último mês. |

Sem projetos, a parte de projetos não entra; sem Pomodoro, o foco não entra; as partes que valem são reescaladas
para 0–100. Dias de folga sem nenhuma atividade ficam sem nota. A conta está em `js/core/ipl.js`.

**Prêmio do dia:** abra o Lida todo dia e resgate o prêmio em Hoje. Ele cresce ao longo de 7 dias seguidos
(20, 30, 40 + 30 XP, 50, 60 + 1 voucher, 80 + 50 XP e, no 7º, 150 de ouro + 100 XP + 2 vouchers). Pular um dia
volta ao dia 1.

**Repetição em dias escolhidos:** em Repetir, escolha "Escolher os dias" e marque, por exemplo, segunda, quarta e sexta.

**Hábitos**

- Toque no círculo para marcar (soma 1 até a meta do dia; na meta, volta a zero). Bater a meta rende progresso de voucher:
  a cada 3, um voucher.
- A sequência conta só os dias escolhidos para o hábito. Congelamento protege um dia; Folga dos hábitos protege o dia inteiro.
  **Congelamento Automático** (9 vouchers, o triplo do normal) não precisa ser usado: na virada de um dia perdido, ele
  salva sozinho todos os hábitos que vinham em sequência e ficaram por fazer. Um item por dia perdido.
- **Água:** meta diária ajustável (padrão 2 L) e tamanho do copo. Bater a meta rende 20 XP e 10 de ouro.
- **Desapego:** um check-in por dia sem recair. As recompensas crescem ao longo de um ciclo de 7 dias (o 7º traz uma
  Carta da Sorte). Recaída: volta ao dia 1 e perde metade do XP do nível atual e do ouro. Um espaço grátis; mais na Loja.

**Pomodoro:** 25/5 minutos por padrão (ajustável). Cada hora de foco acumulada rende um voucher. No celular, um lembrete
avisa o fim do ciclo mesmo com o app fechado.

**Esvaziar a mente:** escreva tudo de uma vez (uma coisa por linha) e depois distribua em Fazer agora, Agendar,
Delegar ou largar e Incubadora. Qualquer item vira tarefa com um toque.

**Adição rápida em linguagem natural** (em qualquer "Adicionar tarefa"):

| Escreva | Vira |
|---|---|
| `hoje`, `amanhã`, `depois de amanhã`, `sexta`, `próxima semana`, `em 3 dias`, `dia 15`, `20/01` | data |
| `9h`, `9h30`, `14:15`, `às 10` | horário |
| `p0` … `p4` | prioridade |
| `#Casa` | projeto (o início do nome basta) |
| `@contas` | etiqueta (é criada se não existir) |
| `todo dia`, `dias úteis`, `toda segunda`, `toda segunda, quarta e sexta`, `todas as terças e quintas`, `toda semana`, `todo mês`, `todo ano` | repetição |

Exemplo: `Pagar luz amanhã 9h p1 #Casa @contas`. Enquanto você digita, aparece o que foi entendido.

**Descrição:** aceita `**negrito**`, `*itálico*`, `~~riscado~~`, `` `código` ``, `[texto](https://link)`, links soltos,
listas com `- ` e listas de verificação com `- [ ] ` (clicáveis).

**Power-ups na tarefa:** toque na tarefa para abrir o cartão; Respiro (+3 h no horário) e Alívio (prazo para o dia
seguinte, sem punição) ficam lá, com quantos você tem.

**Foco em rotinas:** toque na rotina para abrir o cartão (itens marcáveis, Concluir, Focar) ou escolha a rotina em
"Focar numa tarefa".

**Lista ou Quadro:** Hoje, Planejar, cada projeto e o Painel (telas largas) têm o botão Lista/Quadro, lembrado por tela.
No Quadro, escolha **Agrupar por** Data (Atrasadas, Hoje, Amanhã, Esta semana, Depois, Sem data), Prioridade (P0 a P4)
ou Projeto. Arrastar um cartão para outra coluna muda a data, a prioridade ou o projeto (com Desfazer). No mouse, é só
arrastar; no toque, segure o cartão um instante e arraste (segurar e soltar sem mover abre a edição). Cada coluna tem
o seu "Adicionar tarefa", que já cria a tarefa naquela coluna.

**Temas da Loja:** Aqua, Matrix, Rosa, Tomate, Cinza, Laranja, **Monocromo** (tudo em cinza, até emojis e o
Lidinho) e **Bumblebee** (preto e amarelo) por 2.500 de ouro; **Edna** (inspirado no tema do KDE, ardósia com
destaque azul e gradiente verde-água → índigo) e **Tumbleweed** (claro, com a barra lateral preta e o verde do
Evernote) por 3.000.

**Sincronização visível:** na conta Google, o topo mostra o status e o horário da última sincronização
("Sincronizado · 14:32"). Um toque abre os detalhes: quantas alterações esperam para subir, **Sincronizar
agora** e, quando dois aparelhos mudaram o mesmo campo (título, data, descrição, prioridade…) antes de um ver
o outro, a lista dessas mudanças para você escolher qual versão fica.

**Backup .lida (Ajustes > Backup):** exporta todos os dados num arquivo cifrado com uma senha que você
escolhe; sem ela, ninguém abre o arquivo. Importar **junta** com o que já existe (vence a versão mais nova de
cada campo, como na sincronização), então serve para restaurar e para levar os dados a outro aparelho ou a
outra versão do Lida. No Android o arquivo vai para Downloads; no Linux, para a pasta Downloads.

**Foto de perfil (toque no avatar em Ajustes):** uma foto sua (reduzida para 256 px e cifrada), o Lidinho do
seu título ou a inicial do nome.

**Água em ofensiva:** a cada 7 dias seguidos batendo a meta de água, 200 XP e 200 de ouro (fora os 20 XP e 10 de
ouro de cada dia).

**Sons:** o conjunto Clássico é de graça; na Loja (aba Sons) há Retrô 8-bit, Madeira e sinos, Cristal e Digital
(900 de ouro cada, valem em todos os aparelhos). Toque no alto-falante para ouvir antes de comprar; troque em Ajustes.

**Fontes:** além das outras, a **VT323**, retrô de terminal antigo (aparece um pouco maior, porque o desenho dela é pequeno).

**Modo demo:** a barra de cima tem **Simular…**: avança o relógio uma semana, um mês ou dois, vivendo cada dia com
tarefas, hábitos, água e humor (no ritmo Bom, Médio ou Fraco). A virada fecha o IPL, os meses e o ano de verdade,
então dá para ver o resumo do mês e o resumão do ano.

Atalhos no computador: **Q**/**N** nova tarefa, **/** ou **Ctrl+K** buscar, **P** Pomodoro, **B** Esvaziar a mente, **1–5** seções.

## Usar na web

Abra o endereço do Lida. Na primeira vez, uma apresentação curta mostra o que o app faz; depois:

- **Continuar com Google**: sincroniza entre aparelhos. Os dados vão para a nuvem já cifrados com a sua senha.
- **Usar só neste aparelho**: nada sai do aparelho. Dá para conectar a conta Google depois, em Ajustes.
- **Explorar com dados de exemplo**: modo demo, separado dos seus dados, com um botão para avançar o relógio.

Para instalar como app: no Chrome do Android, menu ⋮ > *Adicionar à tela inicial*; no computador,
o ícone de instalar na barra de endereço.

## Usar no Android (APK)

1. Baixe o APK da versão mais nova direto (sem zip):
   - **https://github.com/dasilvasauro/lida/releases/latest/download/lida.apk** (com login Google)
   - **https://github.com/dasilvasauro/lida/releases/latest/download/lida-libre.apk** (Lida Libre, sem nada do Google)

   As duas podem ficar instaladas juntas (são apps diferentes, com dados separados). Builds de teste, sem tag,
   ficam em **Actions > Android > Artifacts**, dentro de um .zip.
2. No celular, abra o APK e permita a instalação de fontes desconhecidas quando o Android pedir.
3. Em **Ajustes > Lembretes**, ligue os lembretes e aceite a permissão de notificações.
4. No Android 12 ou mais novo, se aparecer "Horário aproximado", toque em **Permitir** e libere
   **Alarmes e lembretes** para o Lida. Sem isso o Android pode atrasar os avisos em alguns minutos.
5. Recomendado: em *Configurações > Apps > Lida > Bateria*, escolha **Sem restrições**. Alguns fabricantes
   (Xiaomi, Samsung, Motorola) seguram alarmes de apps "otimizados".

Atualizar: o próprio Lida avisa quando sai versão nova (uma vez por dia, ou em **Ajustes > Procurar
atualização**), mostra o que mudou e, em **Atualizar agora**, baixa, confere o SHA-256 e instala sem sair do
app. Na primeira vez o Android pede para liberar **Instalar apps desconhecidos** para o Lida e confirma a
atualização; do Android 12 em diante as seguintes podem dispensar a confirmação (o sistema decide). Ao
terminar, o Lida reabre sozinho ou deixa uma notificação "toque para abrir". Os dados ficam.

### Publicar uma versão (Release)

1. Registre as novidades da versão em `js/core/changelog.js` (o topo da lista) e suba a versão em
   `package.json`, `js/state.js` (`app.version`), `sw.js` e `desktop/lida_desktop/__init__.py`.
2. Rode `node scripts/version.mjs`: grava `android/version.properties` (versionName e versionCode, que o
   F-Droid lê) e o changelog do F-Droid em `fastlane/`. Faça commit. O workflow recusa publicar se esse
   arquivo estiver desatualizado ou se a versão não estiver no changelog.
3. Crie e envie a tag com o mesmo número: `git tag v3.0.0-alfa.15 && git push origin v3.0.0-alfa.15`.
4. O GitHub Actions compila os dois APKs assinados (Google e Libre) e cria a Release com `lida.apk` e
   `lida-libre.apk` (nomes fixos, para os links acima), `latest.json` (lido pelo atualizador do app: versão,
   SHA-256 de cada APK e novidades) e o texto da Release tirado do changelog. O pacote do Linux é anexado à
   mesma Release.

O versionCode sai da versão: `3.0.0-alfa.15` vira `300000150` (maior, menor, correção, alfa/beta/rc e número).
Ele é sempre maior que os números antigos (que vinham da contagem de builds do Actions), então quem tem uma
versão antiga atualiza por cima normalmente.

### Lida Libre e F-Droid

A **Lida Libre** é o mesmo app sem nada do Google: sem login com Google, sem Firebase, sem o plugin
google-services. Sincroniza pela nuvem da pessoa (Nextcloud/WebDAV, Dropbox ou OneDrive) e tem id próprio
(`io.github.dasilvasauro.lida.libre`), então convive com a versão normal. Tudo sai da mesma branch: o
`scripts/flavor.mjs` prepara a variante na hora de compilar (`libre` para o GitHub, `fdroid` para o F-Droid,
que ainda tira o atualizador e a permissão de instalar apps).

Toda funcionalidade nova entra nas duas automaticamente, porque o código é um só. A regra para o código novo:
nada do Google fora de `js/core/cloud.js`, `js/firebase-config.js` e dos blocos marcados com `<google>` no Gradle.

Onde publicar a Libre, do mais simples ao mais exigente:

1. **Releases do GitHub** (já funciona a partir desta versão): link fixo `lida-libre.apk`, com o atualizador
   dentro do app. Quem usa o [Obtainium](https://github.com/ImranR98/Obtainium) pode seguir o repositório e
   receber as atualizações por ele.
2. **IzzyOnDroid** (repositório que o F-Droid e o Droid-ify já listam): pega o APK das Releases do GitHub, sem
   compilar. Abra um pedido em <https://gitlab.com/IzzyOnDroid/repo/-/issues> com o link do repositório e diga
   que o APK é o `lida-libre.apk`. Costuma ser aceito em alguns dias.
3. **F-Droid oficial**: compila a partir do código. A receita pronta está em
   `docs/fdroid/io.github.dasilvasauro.lida.libre.yml`. Faça um fork de <https://gitlab.com/fdroid/fdroiddata>,
   copie a receita para `metadata/`, rode `fdroid lint` e `fdroid build` se puder (opcional) e abra um merge
   request. Os textos, o ícone, as capturas de tela e as novidades de cada versão vêm de `fastlane/` neste
   repositório. Pontos que os revisores podem pedir para ajustar: a versão do Node no servidor de build
   (o Capacitor 8 precisa do Node 20 ou mais novo) e o aviso **NonFreeNet** (Dropbox e OneDrive são opcionais).
   O F-Droid assina o APK com a chave dele: quem instalou a Libre pelo GitHub precisa desinstalar antes de
   instalar a do F-Droid (ou continuar pelo GitHub).

**Custo:** nenhum dos três cobra nada.
Se o APK for de **depuração** (sem a chave de assinatura configurada, veja abaixo), cada build sai com uma
assinatura diferente e o Android só instala depois de desinstalar a versão anterior.

## Lida para Linux

App nativo em **Qt/PySide6** com o mesmo Lida da web por dentro (QtWebEngine, o Chromium do Qt), mais:

- **Menu global do KDE**: o menu da janela vai para o widget "Menu global" do painel (X11 e Wayland). Lá estão
  Nova tarefa (Ctrl+N), Buscar (Ctrl+K), as seções (Ctrl+1 a 5), tema, fonte e tamanho, Focar numa tarefa
  (Ctrl+Shift+F), Concluir a tarefa em foco (Ctrl+Shift+D), Pomodoro (Ctrl+P, reiniciar, pular), sons, punições,
  cada tipo de lembrete, "Fechar para a bandeja" e "Abrir com o sistema". Sem o menu global, o menu fica na janela.
- **Bandeja**: fechar a janela deixa o Lida na bandeja (os lembretes continuam). O ícone mostra o foco e o tempo do
  Pomodoro; o menu dele tem Nova tarefa, Focar, Pomodoro e Parar foco. O título da janela mostra o tempo.
- **Notificações do sistema** para os lembretes; **dados no computador** (`~/.local/share/lida`), com a mesma
  criptografia e sincronização da web e do celular.
- **Painel**: em janela larga, Hoje + Planejar + resumo numa tela só.

### Instalar

Precisa do **PySide6 com o QtWebEngine**. Pelo gerenciador da distro (recomendado):

```sh
sudo pacman -S pyside6                                   # Arch / Manjaro / EndeavourOS
sudo dnf install python3-pyside6                         # Fedora
sudo apt install python3-pyside6.qtwebenginewidgets      # Kubuntu / KDE neon / Debian
```

Depois, na pasta do repositório:

```sh
./desktop/install.sh               # instala ou atualiza (sem root, tudo em ~/.local)
./desktop/install.sh --autostart   # idem, e abre na bandeja ao entrar na sessão
./desktop/install.sh --venv        # se a distro não tiver o PySide6: instala num ambiente próprio (~600 MB)
./desktop/install.sh --uninstall   # remove (seus dados ficam; --purge apaga também)
```

Para **atualizar**: o app procura versão nova uma vez por dia (ou em **Ajustes > Procurar atualização**), mostra o
que mudou e, em **Atualizar agora**, baixa o `lida-linux.tar.gz` da Release, confere o SHA-256, roda o `install.sh`
que vem nele e abre de novo já na versão nova (widgets e CLI juntos; os dados ficam). Se você instalou rodando o
`install.sh` de dentro de um repositório clonado (git), o app mostra os comandos em vez de baixar:
`lida fechar`, `git pull` e `./desktop/install.sh` de novo. O script troca os arquivos, os widgets e os ícones (e
apaga o cache de ícones do KDE, que é refeito sozinho). Se o painel ou o lançador ainda mostrarem o ícone antigo,
saia e entre na sessão (ou rode `plasmashell --replace &`).
Cada Release traz o `lida-linux.tar.gz` (descompacte e rode `lida/desktop/install.sh`); o GitHub Actions também gera
o pacote de teste em Actions > Linux.

### Entrar com a conta Google (uma vez)

O Google não deixa entrar dentro de navegadores embutidos, então o app abre o **navegador do sistema** para o
login e traz a credencial de volta. Para isso ele precisa de um cliente OAuth "App para computador" do projeto do
Firebase (`lida-81429`), como no gtasks++:

1. Abra <https://console.cloud.google.com/apis/credentials?project=lida-81429>.
2. **Criar credenciais > ID do cliente OAuth > Tipo de aplicativo: App para computador**. Nome: `Lida Linux`. Criar.
3. **Baixar JSON** e salvar como `~/.config/lida/google-oauth.json`.
4. No Lida, **Entrar com Google**: o navegador abre, você escolhe a conta e volta ao app. Depois, a senha do Lida.

Se o login voltar com erro de "audience"/"invalid IdP response": no Firebase, **Authentication > Método de login >
Google > Lista de permissões de IDs de cliente de projetos externos**, adicione o ID do cliente criado no passo 2.
Sem conta Google, o modo local (só neste computador) funciona normalmente.

### `lida` no terminal

O app fica na bandeja e a CLI conversa com ele (se estiver fechado, a CLI abre na bandeja e espera). Tudo passa
pelas regras do Lida: recompensas, punições, foco global e sincronização com o celular.

```sh
lida                                   # resumo do dia (anéis, foco, tarefas) + modo interativo
lida ls [hoje|atrasadas|entrada|proximos|feitas|tudo] [-p Projeto] [--ids]
lida add "pagar a luz amanhã 10h p1 #casa @Trabalho"   # linguagem natural, igual à adição rápida
lida add "revisar contrato" -d sexta -P 1 -p Trabalho
lida done 2                            # número da última lista, título ou pedaço único dele
lida done "luz" "e-mails"              # várias de uma vez
lida undone "luz" · lida rm 3 · lida edit 4 -d amanhã -H 15:30 -P 2 · lida sub 1 3
lida foco "relatório"                  # põe em foco (celular, bandeja e widget mostram) e abre a tela de foco
lida foco                              # tela de foco ao vivo: espaço Pomodoro, c concluir, s parar, ↑↓ e enter subtarefas
lida foco parar | concluir | status
lida pomo start|pause|toggle|reset|skip|status [--foco 50 --pausa 10]
lida habitos · lida habito ler [-u] · lida agua [copo|garrafa|300] [-u]
lida ipl · lida mente "ligar pro banco" · lida projetos · lida buscar luz
lida abrir [hoje|habitos|eu|ajustes] · lida status · lida fechar
lida --json …                          # qualquer comando, em JSON (scripts)
```

O que a CLI tem a mais que o gtasks++: linguagem natural ao adicionar (datas, horário, prioridade, projeto,
etiquetas, repetição), foco **global** (a mesma tarefa em foco no celular e no widget), Pomodoro, hábitos, água,
IPL, `--json` em tudo e completar comandos no **bash, zsh e fish** (instalados pelo `install.sh`).

### Barra lateral translúcida (blur)

Em **Ajustes > Tema** (ou no menu **Exibir**), ligue **Barra lateral translúcida**. A janela do Lida passa a ter fundo
transparente só na barra lateral; o desfoque do que fica atrás é feito pelo KWin:

- **X11:** basta o efeito **Desfoque** estar ligado em *Configurações do sistema > Gerenciamento de janelas > Efeitos
  da área de trabalho*. O Lida pede o desfoque sozinho (precisa do `xprop`, que vem com o `xorg-xprop`).
- **Wayland (padrão do Plasma 6):** um app Qt sem as bibliotecas do KDE não consegue pedir o desfoque. Instale o efeito
  **Better Blur** (`kwin-effects-forceblur`, no AUR ou em github.com/taj-ny/kwin-effects-forceblur), ligue em *Efeitos
  da área de trabalho*, abra a engrenagem dele e, em **Force blur**, adicione a classe de janela
  `io.github.dasilvasauro.lida`. Desligue o efeito **Desfoque** padrão para não ter dois desfoques ao mesmo tempo.

Sem o desfoque do KWin, a barra fica só transparente (mostra o papel de parede nítido).

### Widgets do Plasma

Clique com o botão direito no painel ou na área de trabalho > **Adicionar widgets** > procure "Lida".

- **Lida · Foco** (feito para a barra/painel, na linha do gtasks++): compacto, mostra numa linha só a tarefa em
  foco (ponto vermelho piscando, nome rolando e cronômetro do Pomodoro ou do foco), o contador de tarefas de hoje
  (○ abertas, ⚠ atrasadas, ✔ quando acabou), os hábitos do dia (◎ feitos/total) e quanto falta de água (gota que
  enche). Pisca verde quando uma tarefa é concluída em qualquer lugar. **Clique** para as ações rápidas: adicionar em
  linguagem natural, concluir/Pomodoro/parar o foco, abas Hoje · Atrasadas · Entrada (concluir ou focar cada tarefa),
  hábitos (toque soma um) e água (Copo, Garrafa).
- **Lida · Anéis**: os três anéis do dia (tarefas, hábitos e água), com legenda, IPL e botões Copo/Garrafa.

Os dois leem o estado que o app grava em `~/.cache/lida/state.json` e agem pela CLI. Nas configurações do widget dá
para mudar o comando (`lida`), a frequência de leitura e, no Foco, a largura do nome no painel.

### Onde ficam as coisas

| Caminho | O quê |
|---|---|
| `~/.local/share/lida/app` | os arquivos do Lida (mesma versão da web) |
| `~/.local/share/lida/webengine` | dados do navegador embutido (seus dados cifrados, sessão) |
| `~/.local/share/lida/desktop` | o app Qt e a CLI |
| `~/.config/lida/google-oauth.json` | cliente OAuth para o login com Google |
| `~/.cache/lida/state.json` | estado do dia para os widgets |
| `$XDG_RUNTIME_DIR/lida-desktop.sock` | por onde a CLI fala com o app |

O app serve os arquivos em `http://localhost:47390` (só para o próprio computador). A porta é fixa porque os dados
do navegador embutido ficam guardados por endereço; para mudar, use a variável `LIDA_PORT` (os dados não vêm junto).
Modo demo: `lida-desktop --demo` (dados de exemplo, separados da sua conta). O app não tem ferramentas de desenvolvedor.

## Idiomas

O Lida fala **português, inglês e espanhol**. Na primeira abertura ele segue o idioma do aparelho; depois, troque em
**Ajustes > Idioma** (ou no seletor da tela de entrada). Vale para tudo: telas, datas e números, notificações, a tela
do alarme, os widgets do Android e do Plasma e os menus e a bandeja do app do Linux. A adição rápida entende o idioma
escolhido ("Pay bills tomorrow 9am p1 #home", "Pagar la luz mañana a las 9 p1 #casa"; no inglês, datas como 1/20 são
mês/dia). Nomes de tarefas, hábitos e projetos ficam como você escreveu.

Fica em português: a CLI `lida` (comandos e respostas), as notas das versões antigas em Novidades e correções e os
nomes dos canais de notificação no Android, que seguem o idioma do sistema.

## Lembretes

Tudo em **Ajustes > Lembretes**, cada tipo com seu interruptor e horário:

- **Tarefas com horário**: com o projeto, a prioridade e as subtarefas no texto expandido. Botões **Concluir**
  (rende a recompensa normal) e **Lembrar em 1 h**. **Antecedência** padrão (na hora, 5, 10, 15, 30 min, 1 h, 2 h,
  1 dia) e, no editor da tarefa, a antecedência só daquela tarefa.
- **Tarefas atrasadas**: se passar do horário e a tarefa continuar aberta, um segundo aviso 15 min a 2 h depois.
- **Hábitos pendentes** (padrão 19h): lista o que falta marcar no dia.
- **Caixa de entrada** (opcional, padrão 10h): quando há tarefas sem data nem projeto.
- **Resumo da manhã** (padrão 8h) e **fechamento do dia** (padrão 21h).
- **Água** (opcional): a cada 2 h, das 9h às 21h, até bater a meta. Botão **Bebi um copo**.
- **Com o app aberto**: o lembrete aparece também no topo da tela, com os mesmos botões.
- **Pomodoro e modo foco**: aviso no fim de cada ciclo e, no APK, **cronômetro na notificação** enquanto roda
  (contagem feita pelo próprio Android, certa com o app minimizado). No **Android 16** ela pede para virar
  **Live Update**: chip com o tempo na barra de status e destaque na tela de bloqueio.
- Som: **campainha de bicicleta** (gerada para o Lida, arquivo em `sounds/`). No Android, é o som do canal
  "Lembretes": dá para trocar em *Configurações > Apps > Lida > Notificações*.
- No APK: agendados no sistema, funcionam com o app fechado, sem internet e depois de reiniciar.
- Na web: o navegador não agenda notificações sem um servidor. Chegam enquanto o Lida estiver aberto
  (mesmo em outra aba ou minimizado), com o mesmo som.

## Alarmes

Para o que não pode passar: **alarme de tela cheia** em tarefas com horário (repetidas ou não), rotinas e hábitos.
No editor de cada um, escolha um toque em **Alarme de tela cheia** (rotinas e hábitos escolhem também o horário).

- A tela mostra o **tipo** (tarefa, rotina, hábito), a **hora atual**, a data, o **nome** e a **descrição**, ocupando a
  tela toda, com uma **luz vermelha piscando** no canto, como o LED de um aparelho.
- Em vez de só desligar: **Concluir** (conclui a tarefa ou a rotina do dia, ou marca o hábito, com a recompensa
  normal) ou **Ignorar**.
- **Aparência** (Ajustes > Alarmes): com as cores do tema ou **AMOLED**, preto e minimalista. Sempre na fonte escolhida.
- **6 toques** (cada volta dura de 4 a 18 segundos e se repete até você responder): despertador clássico (bipes), relógio
  digital, sinos calmos, marimba, amanhecer e passarinhos (`scripts/alarm-tones.py` gera os arquivos).
- **Limite de 10 alarmes ligados** ao mesmo tempo: alarme demais vira barulho e se aprende a ignorar.
- **Android**: agendado no sistema como despertador (toca com o app fechado, o celular bloqueado e depois de
  reiniciar), no canal de alarme, com o brilho no máximo enquanto toca. No Android 14+, libere **Notificações em tela
  cheia** em Ajustes > Alarmes (sem isso, chega como notificação com os mesmos botões).
- **Linux**: com o app aberto ou na bandeja, a janela vem para a frente em tela cheia. **Web**: só com o Lida aberto.
- **Testar o alarme** em Ajustes mostra a tela na hora (no Android, em 3 segundos: bloqueie o celular para ver).

## Foco

- **Tarefa em foco**: em Hoje, **Focar** (ou, no cartão da tarefa, **Focar**). Aparece um cartão "Em foco" no topo,
  com Concluir, Pomodoro e Parar foco, e a tarefa ganha a marca "Em foco" na lista. Rotinas também podem entrar em
  foco. As subtarefas (ou os itens da rotina) aparecem marcáveis no cartão de foco, no widget do Plasma e na CLI
  (`lida foco status`; `lida sub foco 2` marca o 2º item da tarefa em foco).
- **Global e entre aparelhos**: a tarefa em foco, o Pomodoro e o modo foco das tarefas com tempo ficam num registro
  sincronizado (cifrado como o resto). Começou no computador, aparece no celular, e vice-versa. Os cronômetros
  guardam a hora de término, então cada aparelho conta sozinho. O celular recebe a mudança quando o Lida está
  aberto (ou ao abrir).
- **Android**: notificação fixa com a contagem feita pelo sistema (para cima no foco, regressiva no Pomodoro),
  vermelha até o Android 15 e Live Update no 16. **Relógio flutuante** (Ajustes > Foco): ao minimizar o Lida com um
  cronômetro rodando, um relógio fica por cima dos outros apps; arraste para mover, toque para voltar. Precisa da
  permissão **"Sobrepor a outros apps"**, que o próprio Ajustes abre.
- **Live Update (Android 16)**: a notificação do foco pede para ser promovida (chip com o tempo na barra de status e,
  nos aparelhos que mostram Live Updates de outros apps, na Now Bar da Samsung e na ilha da Xiaomi). Com duração
  conhecida (Pomodoro, modo foco), vem com barra de progresso. Em **Ajustes > Foco > Live Update** dá para ver se
  está liberada, se a notificação atual foi promovida, e abrir a tela do Android para liberar.
  - **Samsung (One UI 8)**: a Now Bar mostra Live Updates de apps de terceiros conforme o aparelho e a versão; em
    alguns, só com a opção "Live notifications for all apps" nas Opções do desenvolvedor. O Lida faz a parte dele
    (pedido de promoção dentro das regras do Android); se o chip aparece na barra de status mas não na Now Bar,
    é decisão do One UI.
  - **Xiaomi (HyperOS)**: a ilha não desenha o cronômetro do Android, então o chip leva o tempo em texto ("24 min",
    "45 s"), atualizado pelo serviço. O relógio "vivo" na Super Island exige a API de notificação de foco da Xiaomi,
    que só funciona para apps liberados por ela (pedido por e-mail); sem isso, o sistema mostra a notificação comum.

## Widgets (Android)

**Lida · Anéis**: três anéis do dia — tarefas (fora), hábitos (meio) e água (dentro) — com os números ao lado.


Segure o dedo na tela inicial > **Widgets** > **Lida · Hoje**. Mostra o progresso do dia, as próximas tarefas
e uma linha com hábitos e água. Tocar abre o Lida em Hoje; tocar na linha de baixo abre Hábitos.
O widget só exibe: ele é atualizado pelo app sempre que algo muda. Depois da meia-noite, até o app abrir de novo,
ele pede para abrir o Lida em vez de mostrar o dia anterior.

## Trazer os dados do Lida anterior

Acontece **uma vez**, ao criar a senha do Lida 3:

- Entrando com Google: o Lida encontra o seu cofre antigo na nuvem e pede a **Chave Mestra**.
- Usando só no aparelho: o Lida procura os dados da versão anterior neste mesmo navegador.

Mostra um resumo (tarefas, hábitos, ouro, XP) antes de importar. Vem: tarefas, projetos (pastas),
rotinas, hábitos e registros, desapego, humor, saldo de XP/ouro/vouchers/itens, temas comprados,
pontuações, visão e reflexões. Não vem: notas, feeds e atalhos.
O cofre antigo não é alterado nem apagado.

## Privacidade e sincronização

- Tudo é cifrado no aparelho (AES-256-GCM). A chave é protegida pela sua senha (PBKDF2, 600 mil iterações)
  e nunca sai do aparelho em texto puro. **A senha não pode ser recuperada.**
- Cada tarefa é um registro separado. Alterações em aparelhos diferentes são juntadas campo a campo.
- Offline: tudo funciona; as alterações sobem quando a internet voltar (bolinha ao lado do título).
- Em Ajustes: pedir a senha a cada abertura, alterar a senha, sair da conta.

**Onde sincronizar** (Ajustes > Conta):

| | Conta Google (servidor do Lida) | Sua nuvem: Dropbox, OneDrive, Nextcloud/WebDAV |
|---|---|---|
| Quem guarda | Firestore do projeto do Lida | Uma pasta sua (`Aplicativos/Lida` ou a pasta WebDAV que você indicar) |
| Chega nos outros aparelhos | Na hora | Em até 1 minuto com o app aberto (e ao abrir) |
| Web | Sim | Dropbox sim; WebDAV só se o servidor liberar CORS; OneDrive não (use o app) |
| Android e Linux | Sim | Sim, as três |

- **Conectar:** em "só neste aparelho", toque em **Sincronizar pela sua nuvem**. Com a conta Google, **Mover a
  sincronização para a sua nuvem** (os dados continuam os mesmos; faça o mesmo nos outros aparelhos). Num aparelho
  novo, na tela de entrada: **Já uso o Lida com Dropbox, OneDrive ou Nextcloud** (pede a senha do Lida de lá).
- **Se a pasta já tem um Lida de outro aparelho** que começou separado, o Lida pede a senha usada lá e junta os
  dados dos dois, sem perder nada.
- **Como fica a pasta:** `space.json` (a chave do espaço, embrulhada pela sua senha) e `log/` com pacotes cifrados,
  um conjunto por aparelho (dois aparelhos nunca escrevem no mesmo arquivo, então não aparecem "cópias em conflito").
  Cada aparelho junta os próprios pacotes de tempos em tempos. Sem a senha, nada ali é legível. Não edite nem mova
  esses arquivos; para começar do zero, desconecte em todos os aparelhos e apague a pasta.
- **Login:** Dropbox abre no navegador e mostra um código para colar no Lida; OneDrive mostra um código para digitar
  em microsoft.com/devicelogin; Nextcloud usa endereço, usuário e uma **senha de app**. O acesso fica guardado
  cifrado no aparelho. Se vencer ou for removido, o status mostra "Sem acesso à nuvem" e o botão **Conectar de novo**.
- O app do Linux, a CLI `lida` e os widgets do Plasma seguem iguais: eles falam com o app, que sincroniza.

## Sua parte: publicar

### 1. Enviar a branch `v3`

```bash
cd ~/projetos/lida
git fetch origin
git checkout v3          # a branch com o Lida 3
git push -u origin v3
```

(A `main` continua com o Lida anterior no ar. Quando o Lida 3 estiver completo, é só fazer o merge.)

### 2. Publicar as regras do Firestore (antes de usar o Lida 3 com Google)

Firebase Console > projeto **lida-81429** > Firestore Database > **Regras** > cole o conteúdo de
`firestore.rules` > **Publicar**.
As regras novas mantêm as do cofre antigo: o Lida anterior continua funcionando normalmente.

### 3. Chave de assinatura do APK (uma vez)

Sem ela, o Actions gera um APK de depuração (funciona, mas não atualiza por cima). Para ter um APK assinado
sempre com a mesma chave, no seu terminal:

```bash
keytool -genkeypair -v -keystore lida.keystore -alias lida -keyalg RSA -keysize 2048 -validity 10000
# responda as perguntas e anote a senha

gh secret set LIDA_KEYSTORE_BASE64 --repo dasilvasauro/lida < <(base64 -w0 lida.keystore)
gh secret set LIDA_KEYSTORE_PASSWORD --repo dasilvasauro/lida   # a senha que você criou
gh secret set LIDA_KEY_ALIAS --repo dasilvasauro/lida           # lida
gh secret set LIDA_KEY_PASSWORD --repo dasilvasauro/lida        # a mesma senha (padrão do keytool)
```

**Guarde `lida.keystore` e a senha fora do repositório** (num gerenciador de senhas, por exemplo).
Se perder a chave, o próximo APK não instala por cima: será preciso desinstalar e importar de novo.

### 4. Login com Google no APK (uma vez)

1. Pegue as impressões digitais da sua chave (a mesma do passo 3):
   ```bash
   keytool -list -v -keystore lida.keystore -alias lida
   ```
   Copie as linhas **SHA1** e **SHA256**.
2. No [Firebase Console](https://console.firebase.google.com/), projeto **lida-81429** > ⚙️ **Configurações do projeto** > aba
   **Geral** > **Seus apps** > **Adicionar app** > ícone do **Android**.
   - Nome do pacote: `io.github.dasilvasauro.lida`
   - Apelido: `Lida Android`
   - Certificado SHA-1: cole o SHA1 do item 1
   - **Registrar app** > **Baixar google-services.json** > pode pular os passos seguintes do assistente.
3. Ainda em **Configurações do projeto** > o app Android > **Adicionar impressão digital**: cole também o **SHA256**.
4. Em **Authentication** > **Método de login**, confira se **Google** está ativado (já deve estar, é o mesmo da web).
5. Guarde o arquivo como segredo do repositório:
   ```bash
   gh secret set GOOGLE_SERVICES_JSON --repo dasilvasauro/lida < google-services.json
   ```
6. Gere o APK de novo (push ou **Re-run all jobs**). No log do passo "Firebase (login com Google)" deve aparecer
   `google-services.json configurado.`

Se o login falhar com "O Google recusou o login", quase sempre é a impressão digital: confira se o SHA-1 cadastrado
é o da chave que assina o APK (a do passo 3, não uma chave de depuração).

### 5. Dropbox e OneDrive (uma vez)

O Nextcloud/WebDAV funciona sem nada disso. Para o Dropbox e o OneDrive, o Lida precisa estar registrado neles
(não há segredo envolvido: o login usa PKCE e código de aparelho). Depois, cole os dois valores em
`js/sync-config.js`, faça commit e gere a versão de novo.

**Dropbox**
1. Entre em <https://www.dropbox.com/developers/apps> > **Create app**.
2. **Scoped access** > **App folder** > nome `Lida` (se já existir, outro nome; a pasta fica em `Aplicativos/<nome>`).
3. Aba **Permissions**: marque `files.metadata.read`, `files.content.read` e `files.content.write` > **Submit**.
4. Aba **Settings**: copie o **App key** para `dropboxAppKey`. (Não precisa de Redirect URI.)
5. O app nasce em "Development" (até 500 pessoas). Para liberar para todo mundo: **Apply for production** na mesma página.

**OneDrive (Microsoft)**
1. Entre em <https://entra.microsoft.com> > **Aplicativos** > **Registros de aplicativo** > **Novo registro**.
   (Com conta pessoal, a Microsoft pode pedir para criar um diretório gratuito antes.)
2. Nome `Lida`; tipos de conta: **Contas em qualquer diretório organizacional e contas Microsoft pessoais**;
   redirecionamento: deixe em branco > **Registrar**.
3. **Autenticação** > **Permitir fluxos de clientes públicos**: **Sim** > Salvar.
4. **Permissões de API** > **Adicionar** > Microsoft Graph > **Permissões delegadas**: `Files.ReadWrite.AppFolder`,
   `User.Read` e `offline_access`.
5. Em **Visão geral**, copie o **ID do aplicativo (cliente)** para `microsoftClientId`.

### 6. Testar

Abra **Actions > Android > Run workflow** (branch `v3`). Em uns 5 minutos o APK aparece em Artifacts.
Para testar a versão web da `v3` sem tirar o Lida atual do ar, rode localmente (abaixo).

## Licença

O Lida é software livre, sob a **GNU GPL versão 3 ou posterior** (arquivo `LICENSE`). Você pode usar, estudar,
mudar e redistribuir; quem distribuir uma versão modificada precisa publicar o código dela sob a mesma licença.

## Desenvolvimento

**Novidades e correções:** toda versão registra o que mudou em `js/core/changelog.js` (aparece em Ajustes). O teste
falha se a versão do app não estiver no topo da lista.

Ícones: as fontes ficam em `art/icons/` (SVG) e `python3 scripts/make-icons.py` gera todos os tamanhos (web, PWA,
bandeja do Linux, ícone adaptativo/temático e splash do Android). Precisa de playwright e Pillow; os PNGs gerados
ficam no repositório.

```bash
npm install          # só para os testes e o Capacitor; o app em si não tem dependências
npm start            # http://localhost:5173
npm test             # testes do núcleo + conferência de imports e do service worker
npm run android:sync # copia o app para android/ (o Actions faz isso sozinho)
```

Estrutura:

```
index.html, sw.js, manifest.webmanifest   casca da versão web
css/app.css                               estilos (cores vêm de js/ui/theme.js)
js/main.js                                inicialização, rotas, ações globais
js/state.js                               estado da sessão e repositórios (pessoal, compartilhado)
js/core/   store, sync, cloud             motor de registros cifrados (o mesmo do Pago/Zelo)
js/core/   filesync, providers, net       sincronização pela nuvem da pessoa (Dropbox, OneDrive, WebDAV)
js/sync-config.js                         chaves públicas do Dropbox e da Microsoft (ver "Sua parte", passo 5)
icons/lidinho/                            o Lidinho de cada título (WebP com fundo transparente)
           model, tasks                   regras: prioridades, XP, níveis, repetição, lembretes
           legacy                         importação do Lida anterior
           notify, sound, demo            lembretes, sons, dados de exemplo
js/ui/     ui, pickers, theme, reward...  componentes
js/views/  gate, today, tasks, settings   telas
android/                                  projeto Android (Capacitor); compilado pelo Actions
```

Ao publicar uma versão nova: aumente `VERSION` em `sw.js` e `app.version` em `js/state.js`.

**Traduções:** o app é escrito em português e `js/core/i18n.js` traduz a tela com os dicionários `js/i18n/en.js` e
`js/i18n/es.js` ("texto em português" → tradução; `{0}`, `{1}` são lacunas que podem mudar de lugar). Conteúdo da
pessoa vai em elementos com `translate="no"`. Texto novo: `node scripts/i18n-extract.mjs` lista o que falta traduzir
(o teste falha enquanto faltar), `--stale` lista chaves que o código não usa mais, e o que não é para traduzir (nomes
de fonte, teclas) entra em `scripts/i18n-ignore.json`. Textos que nascem com as três versões usam `tr({ pt, en, es })`.

## Limites honestos

- **Traduções**: conferidas por testes (toda frase da interface tem chave em inglês e espanhol) e por capturas das
  telas principais nos três idiomas, não por falantes nativos. Uma frase montada de um jeito novo no código pode
  aparecer em português até ganhar a sua chave; o teste avisa quando é texto literal.
- **Alarmes no Android**: o código nativo (AlarmManager, tela sobre o bloqueio, brilho máximo, canais por toque) teve a
  sintaxe conferida aqui e compila no Actions; não foi testado num celular. Fabricantes com economia de bateria agressiva podem
  exigir liberar o Lida em "sem restrições".

- **Virada sem conexão**: na conta Google, se o aparelho não falar com o servidor, os dias anteriores ficam sem fechar
  (sem falhas, sem nota) até conectar. É de propósito: fechar com dados velhos era o que fazia tarefas sumirem.
- **Tarefas que já tinham sumido**: voltam sozinhas na primeira virada com esta versão quando a falha foi registrada
  antes do prazo atual (o caso do Alívio). As notas antigas só são refeitas se forem dos últimos 7 dias.

- **Quadro (Kanban)**: a ordem dos cartões dentro de uma coluna segue as regras da coluna (prioridade ou data) e não
  é guardada ao arrastar; arrastar só troca de coluna. "Esta semana" põe a tarefa para depois de amanhã e "Depois"
  para daqui a 7 dias (dá para ajustar na edição). O arrasto no toque foi testado no emulador do Chromium, não num
  celular de verdade.
- **Barra de status no Android**: agora o app pede ícones escuros nos temas claros pelos dois plugins (SystemBars e
  StatusBar) e reaplica ao voltar para o app. Não deu para testar num aparelho daqui.

- **Login com Google no APK**: usa o seletor de contas nativo do Android. Só funciona no APK assinado com a
  sua chave (a impressão digital dela fica cadastrada no Firebase). Sem o segredo `GOOGLE_SERVICES_JSON`, o APK
  sai sem login com Google.
- **Widget**: só exibe e abre o app (como combinado). Marcar tarefas direto no widget exigiria mais código nativo.
- **Notificações na web**: só com o Lida aberto (limitação dos navegadores, não do app).
- **Fonte do sistema**: saiu. No Android, a fonte escolhida pelo usuário (ex.: "Estilo da fonte" da Samsung) não
  chega a apps feitos com WebView, então a opção não entregava o que prometia.
- **Lida para Linux**: testei o app e a CLI de ponta a ponta (sem tela, com o mesmo Qt 6), mas o menu global, a
  bandeja e os widgets do Plasma só dá para ver num Plasma de verdade. Os widgets passam na análise do `qmllint`.
- **Foco no celular vindo do computador**: chega quando o Lida está aberto no celular (ou ao abrir). O Android não
  acorda o app só para isso.
- **Animação na notificação do foco**: o Android não anima notificações; o destaque é a cor (até o Android 15) ou o
  chip de Live Update (Android 16).
- **Live Update**: só no Android 16 e quando o sistema aceita promover a notificação; nas versões anteriores é uma
  notificação fixa comum com o cronômetro.
- **Bubblewrap/TWA**: descartado. Um TWA é o site dentro do Chrome e não agenda notificações locais offline.
