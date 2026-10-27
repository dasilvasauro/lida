# Migração para o Cofre v2: o que você precisa fazer

Esta versão muda **como os dados ficam guardados na nuvem**. O app faz a conversão sozinho. Você só precisa fazer as etapas abaixo, **nesta ordem**.

> **Resumo:** 1) revisar e fazer o commit → 2) publicar as regras novas no Firebase → 3) colocar o app no ar → 4) abrir primeiro o aparelho principal → 5) abrir os outros aparelhos → 6) conferir.

---

## Por que a ordem importa

- O app novo grava em um lugar novo do Firestore (`users/{seu-uid}/vault/...`). **As regras atuais provavelmente não permitem gravar lá.** Se o app for ao ar antes das regras, a migração não acontece: o app continua funcionando só no aparelho e mostra um aviso vermelho pedindo para atualizar as regras. Nada se perde, mas nada sincroniza até você publicar as regras.
- As regras novas **funcionam com o app antigo**. Por isso, publicar as regras primeiro é seguro.

---

## Etapa 1: revisar e fazer o commit (no seu computador)

1. Na pasta `lida`, rode `git status` e `git diff` para ver o que mudou. Os arquivos novos estão listados no fim deste guia.
2. Rode `npm ci` (instala exatamente as versões do `package-lock.json`, sem precisar de `--legacy-peer-deps`) e depois `npm run build`. Precisa terminar sem erros.
3. Opcional: rode `npm run dev` e teste no navegador em **modo local** ("Continuar Offline"), sem conta Google.
4. Faça o commit. **Ainda não dê push**, porque o push publica o app.

## Etapa 2: publicar as regras do Firestore (no Firebase Console)

1. Acesse https://console.firebase.google.com e abra o projeto **lida-81429**.
2. Vá em **Firestore Database → aba Regras**.
3. **Copie as regras atuais para um bloco de notas.** Assim você tem como voltar se precisar.
4. Apague o conteúdo do editor e cole o conteúdo do arquivo `firestore.rules` (está na raiz do projeto).
5. Clique em **Publicar**. As regras passam a valer em cerca de 1 minuto.

O que essas regras fazem:
- Cada usuário só lê e grava os próprios dados (igual a antes).
- Liberam o cofre novo (`users/{uid}/vault/...`).
- O documento antigo (`users/{uid}`) continua legível, mas **para de aceitar gravações assim que o cofre novo existe**. Isso impede que uma versão antiga do app, ainda aberta em algum aparelho, sobrescreva dados depois da migração.

## Etapa 3: colocar o app no ar

1. Dê `git push` para a branch `main`.
2. Acompanhe no GitHub, na aba **Actions**, até o deploy terminar (fica verde).

## Etapa 4: abrir PRIMEIRO o aparelho principal

Escolha o aparelho onde seus dados estão mais atualizados, **principalmente a Visão de Vida**. A Visão antiga não tem data de alteração, então a do primeiro aparelho migrado vira a oficial.

1. Garanta que esse aparelho está **online** e **sem** o "Modo Offline Manual" ligado.
2. **Feche o app completamente e abra de novo.** O PWA baixa a versão nova em segundo plano; pode ser preciso fechar e abrir **duas vezes**.
3. Ao abrir, o app migra sozinho. Você **não** precisa digitar a Chave Mestra: ele usa a que a versão antiga deixou salva e depois apaga essa cópia.
4. A migração leva poucos segundos. Se aparecer uma faixa vermelha, veja "Se algo der errado" mais abaixo.

Para conferir no Firebase Console (Firestore Database → aba Dados):
- Em `users`, abra o documento com o seu uid.
- Deve existir uma subcoleção **`vault`** com o documento `_meta` e vários pedaços: `config`, `economy`, `habits`, `t-2026-10`, `n-2026-08` etc.
- O conteúdo dos pedaços é ilegível (está criptografado). Isso é o esperado.
- Os campos antigos (`tasks`, `habits`, `config`...) continuam no documento `users/{uid}`. **Esse é o seu backup da migração.** O próprio app apaga esse documento **30 dias depois** da migração, porque ele usa a criptografia antiga, que é mais fraca. A subcoleção `vault` não é afetada.

## Etapa 5: abrir os outros aparelhos

Em cada aparelho (celular, outro navegador etc.):

1. Feche o app completamente e abra de novo (pode precisar de duas vezes).
2. Se o aparelho já estava logado, ele entra no cofre novo sozinho e junta os dados dele com os da nuvem. Tarefas, notas, hábitos e mensagens que estavam só nesse aparelho **não se perdem**. A exceção é o saldo de ouro, XP e itens: nesse caso vale o da nuvem, como já acontecia antes.
3. Se o aparelho pedir login: entre com o Google e digite a Chave Mestra. Nessa versão, a entrada demora 1 ou 2 segundos a mais, porque a proteção da chave ficou mais forte.

**Se algum aparelho ficou com a versão antiga aberta:** as alterações feitas nele depois da migração não sobem para a nuvem (as regras bloqueiam), mas ficam guardadas nele. Quando ele atualizar, essas alterações são incorporadas automaticamente.

## Etapa 6: conferir que está tudo certo

1. Crie uma tarefa no aparelho A. Em poucos segundos ela deve aparecer no aparelho B.
2. Marque e desmarque um hábito no B. O A deve acompanhar.
3. Em **Configurações → Backup e Restauração → Exportar**, salve um backup novo. **Faça isso dentro dos 30 dias**, enquanto o documento antigo ainda existe na nuvem.

---

## O que muda no uso do dia a dia

- **A Chave Mestra não fica mais salva no aparelho.** Se você limpar os dados do navegador, o app vai pedir login e a Chave de novo. Os dados estão na nuvem.
- **Colar imagens nas notas** não é mais permitido; só o texto é colado. As imagens ocupavam espaço demais no cofre.
- Na tela de conectar a conta Google, a opção **"Forçar envio local"** agora **apaga o cofre da nuvem** e cria outro, com a nova Chave Mestra, usando os dados do aparelho. A opção **"Baixar da Nuvem"** junta os dois.
- Itens apagados deixam um registro que é guardado por **180 dias**. Um aparelho que ficar mais de 180 dias sem sincronizar pode trazer de volta itens apagados nesse período.
- **"Apagar todos os dados"** apaga o cofre da nuvem e os dados *deste* aparelho. Os outros aparelhos param de sincronizar e pedem login de novo, mas **mantêm os dados locais**. Se você entrar de novo neles, esses dados voltam para a nuvem. Para apagar tudo de verdade, use a opção em cada aparelho.
- **Sair da conta** agora tenta enviar antes o que estiver pendente. Se não conseguir (por exemplo, offline), o app avisa e pergunta se você quer sair mesmo assim.
- A **economia** (ouro, XP, vouchers, itens) passou a somar o que cada aparelho ganhou ou gastou. Uma punição por tarefa falhada conta uma vez só, mesmo que dois aparelhos processem o mesmo dia.

## Consumo do Firestore (plano gratuito)

| | Limite gratuito | Uso esperado |
|---|---|---|
| Gravações | 20.000/dia | cada sincronização grava só os pedaços alterados + 1 (o índice); uso pesado ≈ algumas centenas/dia |
| Leituras | 50.000/dia | 1 por alteração vinda de outro aparelho + os pedaços que mudaram |
| Tamanho por documento | 1 MB | cada pedaço tem um mês de tarefas. No teste, 500 tarefas/mês ocuparam 226 KB |

O app avisa (faixa amarela) se algum pedaço chegar perto de 1 MB.

---

## Se algo der errado

| Aviso | O que fazer |
|---|---|
| Faixa vermelha falando em **"regras do Firestore"** | As regras da Etapa 2 não foram publicadas ou ainda não valem. Publique, espere 1 minuto e feche e abra o app. |
| "Não foi possível migrar o cofre... tentaremos de novo" | Provavelmente sem internet. O app tenta de novo quando a conexão voltar. |
| "Não foi possível abrir o cofre com a Chave Mestra salva" | Saia da conta (Configurações → Sair) e entre de novo com a Chave Mestra. |
| Um aparelho não recebe as alterações | Ele provavelmente ainda está na versão antiga. Feche o app por completo e abra de novo. |

**Seus dados ficam guardados em três lugares durante a migração:** no IndexedDB de cada aparelho, no cofre novo e no documento antigo, que fica congelado. Se algo estranho acontecer, **não volte a versão do app**: anote a mensagem de erro e me mande. Voltar a versão exigiria restaurar as regras antigas, e o que for feito depois da migração não aparece no app antigo.

**Não apague o documento `users/{uid}` pelo console.** O Firebase Console oferece apagar junto as subcoleções, e isso inclui o cofre novo. O app já cuida disso sozinho depois de 30 dias.

---

## Arquivos desta mudança

Novos:
- `firestore.rules`: as regras da Etapa 2
- `src/lib/vaultCrypto.ts`: criptografia (Web Crypto)
- `src/lib/shards.ts`: divisão do cofre em pedaços e regras de merge
- `src/lib/economyLedger.ts`: economia em registro por aparelho
- `src/lib/idb.ts`, `src/lib/storage.ts`: IndexedDB
- `src/lib/boot.ts`: carregamento dos dados locais antes de abrir o app

Alterados: `src/lib/cloudSync.ts` (reescrito), `src/lib/firebase.ts`, `src/lib/snapshot.ts`, `src/main.tsx`, `src/App.tsx`, as stores em `src/store/`, as telas de login, conexão com o Google, configurações, perfil e notas, `README.md` e `CHANGELOG.md`.
