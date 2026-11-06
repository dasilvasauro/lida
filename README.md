# Lida

Tarefas e hábitos num só lugar, com uma pequena recompensa a cada passo concluído.
Funciona no navegador (celular e computador) e como app Android, offline, com os dados cifrados no aparelho.

> **Lida 3 — alfa 1 (Fase 1).** Esta é a reescrita completa do Lida, na mesma base do Pago e do Zelo.
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
| 1 | Base nova, login, senha, importação, Hoje / Entrada / Em breve, edição de tarefas (data, horário, prioridade, projeto, subtarefas, repetição), XP e ouro por tarefa, títulos por nível, pop-up de nível, aparência, sons, lembretes, APK | **Esta versão** |
| 2 | Tarefas completas: etiquetas, descrição com formatação e links, adição rápida em linguagem natural ("amanhã 9h p1 #casa"), projetos, busca, desafios e sprints, virada do dia com punições | Próxima |
| 3 | Hábitos (positivos, negativos e "desapego"), rotinas, **controle de água** | |
| 4 | Loja reescrita (descrições claras, mais densa), power-ups com animações simples, pomodoro comum | |
| 5 | Resumo diário e mensal redesenhados, perfil com gráficos e foto do Google | |
| 6 | **Espaço compartilhado** para duas pessoas (convite por QR Code, cifrado como o Pago/Zelo) | |
| 7 | Login Google dentro do APK e widget de tela inicial | |

Os dados de hábitos, rotinas, humor, visão e reflexões **já são importados** na Fase 1 e ficam guardados;
as telas deles chegam nas fases seguintes.

## Usar na web

Abra o endereço do Lida. Na primeira vez:

- **Continuar com Google**: sincroniza entre aparelhos. Os dados vão para a nuvem já cifrados com a sua senha.
- **Usar só neste aparelho**: nada sai do aparelho. Dá para conectar a conta Google depois, em Ajustes.
- **Explorar com dados de exemplo**: modo demo, separado dos seus dados, com um botão para avançar o relógio.

Para instalar como app: no Chrome do Android, menu ⋮ > *Adicionar à tela inicial*; no computador,
o ícone de instalar na barra de endereço.

Atalhos no computador: **Q** ou **N** cria uma tarefa.

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

- **Tarefas com horário**: aviso na hora marcada.
- **Fechamento do dia**: um aviso diário (padrão 21h) para revisar o dia e planejar o seguinte.
- São agendados as próximas duas semanas, e reagendados sempre que algo muda.
- No APK: agendados no sistema, funcionam com o app fechado, sem internet e depois de reiniciar.
- Na web: o navegador não agenda notificações sem um servidor. Chegam enquanto o Lida estiver aberto
  (mesmo em outra aba ou minimizado).

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
  fica para a Fase 7, depois que a chave do passo 3 existir. Até lá, o APK funciona no modo "só neste
  aparelho" (e a web segue com Google).
- **Widget**: possível sem Android Studio (o código Kotlin é escrito aqui e compilado pelo Actions), mas
  widgets Android não rodam o app: mostram dados que o app deixa prontos. O plano é um widget de
  "Hoje" com a lista e o progresso, atualizado quando o app abre ou muda algo, com toque para abrir.
  Marcar tarefas direto no widget é possível mas bem mais trabalhoso; avaliamos na Fase 7.
- **Notificações na web**: só com o Lida aberto (limitação dos navegadores, não do app).
- **Bubblewrap/TWA**: descartado. Um TWA é o site dentro do Chrome e não agenda notificações locais offline.
