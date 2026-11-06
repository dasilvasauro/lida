# Lida

Tarefas e hábitos num só lugar, com uma pequena recompensa a cada passo concluído.
Funciona no navegador (celular e computador) e como app Android, offline, com os dados cifrados no aparelho.

> **Lida 3 — alfa 3.** Esta é a reescrita completa do Lida, na mesma base do Pago e do Zelo.
> A versão anterior (React) continua no ar na branch `main` até a nova alcançar o que ela fazia.

---

## Sumário

1. [O que mudou no Lida 3](#o-que-mudou-no-lida-3)
2. [O que já funciona e o que vem depois](#o-que-já-funciona-e-o-que-vem-depois)
3. [Usar na web](#usar-na-web)
4. [Usar no Android (APK)](#usar-no-android-apk)
5. [Lembretes](#lembretes)
6. [Trazer os dados do Lida anterior](#trazer-os-dados-do-lida-anterior)
7. [Privacidade e sincronização](#privacidade-e-sincronização)
8. [Sua parte: publicar](#sua-parte-publicar)
9. [Desenvolvimento](#desenvolvimento)
10. [Limites honestos](#limites-honestos)

---

## O que mudou no Lida 3

- **Foco em tarefas e hábitos.** Notas, Feeds e a tela de Atalhos foram removidos (e não são importados).
- **Mesma base do Pago e do Zelo.** JavaScript sem etapa de build, cada tarefa é um registro cifrado
  separado, sincronização campo a campo (duas edições no mesmo minuto não se apagam).
- **App Android de verdade.** O APK é gerado automaticamente pelo GitHub Actions, sem Android Studio.
  Lembretes são agendados no próprio celular: chegam sem internet e com o app fechado.
- **Aparência.** 14 temas com paleta por função (fundo, superfícies, texto, destaque, progresso,
  prioridades), 7 fontes embutidas (funcionam offline) ou a fonte do sistema, 3 tamanhos de texto.
- **Sons.** Sintetizados no aparelho (nenhum arquivo para baixar): concluir, XP, subir de nível,
  progresso. Volume ajustável, podem ser desligados.

## O que já funciona e o que vem depois

| Fase | Conteúdo | Situação |
|---|---|---|
| 1 | Base nova, login, senha, importação, aparência, sons, lembretes, APK | Pronta |
| 2–4 | Tipos de tarefa, virada do dia, hábitos, água, rotinas, desapego, Loja, Pomodoro, Esvaziar a mente, animações | Pronta |
| 5 | **Etiquetas**, **descrição com formatação** (negrito, links, listas de verificação), **adição rápida em linguagem natural**, **projetos**, **busca**. Aba **Eu** (perfil, nível, marcos, gráficos, constância, pontuação do mês, humor, visão, reflexões), **humor do dia** em Hoje, **apresentação** na primeira abertura, **notificações** completas com som de campainha de bicicleta e botões, **widget** Hoje no Android | **Esta versão** |
| 6 | **Espaço compartilhado** para duas pessoas (convite por QR Code, cifrado como o Pago/Zelo) | Próxima |
| 7 | Login Google dentro do APK | |

## Como o jogo funciona

**Tarefas**

| Tipo | Como funciona |
|---|---|
| Tarefa | Recompensa por prioridade: P0 150 XP / 50 de ouro … P4 25 XP / 10 de ouro. |
| Com tempo | Tem duração (5 a 120 min). O ▶ abre o modo foco com cronômetro, que continua certo com a tela desligada. |
| Sprint | Objetivo maior com etapas e data de fim. Um ativo por vez, mostrado no topo de Hoje com o progresso das etapas e dos dias. |
| Desafio do dia | Vale só para hoje. Um por dia. |
| Bônus | Usa uma Tarefa Bônus da Loja. Rende o normal e não pune se ficar para trás. |
| Rotina | Criada sozinha nos dias escolhidos (aba Hábitos). De 50 a 200 de XP e ouro, conforme o número de itens. Não pune. |

- **Limites:** até o nível 30, uma P0 aberta para hoje; até o 40, duas P1. Os itens P0 Extra e P1 Extra liberam mais uma.
- **Virada do dia:** ao abrir o app (ou à meia-noite com ele aberto), cada dia que passou é fechado: tarefas vencidas
  falham e tiram XP e ouro (nunca baixam de nível; dá para desligar em Ajustes), rotinas não feitas são arquivadas,
  o dia ganha uma pontuação e as rotinas de hoje aparecem. Uma tarefa que venceu ainda pode ser concluída, sem recompensa,
  ou reagendada para hoje.
- **Estilo de jogo (Ajustes):** Multitarefa (+20% em tudo), Minimalista (+50% em P0/P1), Pontual (+30% com data),
  Ambicioso (+80% em sprints e desafios). Trocar depois custa um item da Loja.
- **Marcos de nível:** Carta da Sorte a cada 5 níveis (e a cada nível depois do 25), +15 vouchers no 15, temas no 10, 20 e 35,
  P0 sem limite no 30, P1 sem limite no 40, Darcula e +40 vouchers no 50. Títulos: Aprendiz, Iniciante, Praticante,
  Constante, Disciplinado, Persistente, Veterano, Especialista, Mestre, Grão-Mestre e Lenda.

**Hábitos**

- Toque no círculo para marcar (soma 1 até a meta do dia; na meta, volta a zero). Bater a meta rende progresso de voucher:
  a cada 3, um voucher.
- A sequência conta só os dias escolhidos para o hábito. Congelamento protege um dia; Folga dos hábitos protege o dia inteiro.
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
| `todo dia`, `dias úteis`, `toda segunda`, `toda semana`, `todo mês`, `todo ano` | repetição |

Exemplo: `Pagar luz amanhã 9h p1 #Casa @contas`. Enquanto você digita, aparece o que foi entendido.

**Descrição:** aceita `**negrito**`, `*itálico*`, `~~riscado~~`, `` `código` ``, `[texto](https://link)`, links soltos,
listas com `- ` e listas de verificação com `- [ ] ` (clicáveis).

Atalhos no computador: **Q**/**N** nova tarefa, **/** ou **Ctrl+K** buscar, **P** Pomodoro, **B** Esvaziar a mente, **1–5** seções.

## Usar na web

Abra o endereço do Lida. Na primeira vez, uma apresentação curta mostra o que o app faz; depois:

- **Continuar com Google**: sincroniza entre aparelhos. Os dados vão para a nuvem já cifrados com a sua senha.
- **Usar só neste aparelho**: nada sai do aparelho. Dá para conectar a conta Google depois, em Ajustes.
- **Explorar com dados de exemplo**: modo demo, separado dos seus dados, com um botão para avançar o relógio.

Para instalar como app: no Chrome do Android, menu ⋮ > *Adicionar à tela inicial*; no computador,
o ícone de instalar na barra de endereço.

## Usar no Android (APK)

1. No GitHub, abra **Actions > Android**, clique na execução mais recente e baixe o arquivo em **Artifacts**
   (é um .zip com o APK dentro). Versões com tag (ex.: `v3.0.0`) também aparecem em **Releases**.
2. No celular, abra o APK e permita a instalação de fontes desconhecidas quando o Android pedir.
3. Em **Ajustes > Lembretes**, ligue os lembretes e aceite a permissão de notificações.
4. No Android 12 ou mais novo, se aparecer "Horário aproximado", toque em **Permitir** e libere
   **Alarmes e lembretes** para o Lida. Sem isso o Android pode atrasar os avisos em alguns minutos.
5. Recomendado: em *Configurações > Apps > Lida > Bateria*, escolha **Sem restrições**. Alguns fabricantes
   (Xiaomi, Samsung, Motorola) seguram alarmes de apps "otimizados".

Atualizar: instale o APK novo por cima. Os dados ficam.
Se o APK for de **depuração** (sem a chave de assinatura configurada, veja abaixo), cada build sai com uma
assinatura diferente e o Android só instala depois de desinstalar a versão anterior.

## Lembretes

- **Tarefas com horário**: na hora marcada, com o projeto, a prioridade e as subtarefas no texto expandido.
  Botões **Concluir** (rende a recompensa normal) e **Lembrar em 1 h**.
- **Resumo da manhã** (padrão 8h): quantas tarefas há no dia e quais são.
- **Fechamento do dia** (padrão 21h): o que foi feito e o que ficou pendente.
- **Água** (opcional): a cada 2 h, das 9h às 21h, até bater a meta. Botão **Bebi um copo**.
- **Pomodoro e modo foco**: aviso no fim de cada ciclo.
- Som: **campainha de bicicleta** (gerada para o Lida, arquivo em `sounds/`). No Android, é o som do canal
  "Lembretes": dá para trocar em *Configurações > Apps > Lida > Notificações*.
- No APK: agendados no sistema, funcionam com o app fechado, sem internet e depois de reiniciar.
- Na web: o navegador não agenda notificações sem um servidor. Chegam enquanto o Lida estiver aberto
  (mesmo em outra aba ou minimizado), com o mesmo som.

## Widget (Android)

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

### 4. Testar

Abra **Actions > Android > Run workflow** (branch `v3`). Em uns 5 minutos o APK aparece em Artifacts.
Para testar a versão web da `v3` sem tirar o Lida atual do ar, rode localmente (abaixo).

## Desenvolvimento

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
           model, tasks                   regras: prioridades, XP, níveis, repetição, lembretes
           legacy                         importação do Lida anterior
           notify, sound, demo            lembretes, sons, dados de exemplo
js/ui/     ui, pickers, theme, reward...  componentes
js/views/  gate, today, tasks, settings   telas
android/                                  projeto Android (Capacitor); compilado pelo Actions
```

Ao publicar uma versão nova: aumente `VERSION` em `sw.js` e `app.version` em `js/state.js`.

## Limites honestos

- **Login com Google no APK**: o Google bloqueia login dentro de WebView. Resolver exige um plugin nativo
  e o arquivo `google-services.json` com a impressão digital (SHA-1) da chave de assinatura — por isso
  fica para a Fase 7, agora que a chave de assinatura existe. Até lá, o APK funciona no modo "só neste
  aparelho" (e a web segue com Google).
- **Widget**: só exibe e abre o app (como combinado). Marcar tarefas direto no widget exigiria mais código nativo.
- **Notificações na web**: só com o Lida aberto (limitação dos navegadores, não do app).
- **Bubblewrap/TWA**: descartado. Um TWA é o site dentro do Chrome e não agenda notificações locais offline.
