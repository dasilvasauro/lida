# **Guia de Fluxo de Trabalho Definitivo \- Projeto Lida**

Este documento estabelece o processo de desenvolvimento, versionamento e integração de código para o projeto **Lida**.

## **1\. O Início: Clonando o Repositório**

Antes de qualquer coisa, [instale o git](https://git-scm.com/install/windows).

O primeiro passo para contribuir com o projeto é obter uma cópia local do código-fonte que está hospedado no GitHub. Isso é feito através do processo de clonagem.  
A clonagem baixa todo o histórico do projeto, todas as branches públicas e todos os arquivos para a sua máquina local, estabelecendo uma conexão (origin) entre o seu repositório local e o remoto.

`git clone [URL-DO-REPOSITORIO]`

Após a clonagem, é necessário navegar até a pasta do projeto recém-criada para executar os demais comandos do Git.

## **2\. Sincronização Inicial**

Antes de iniciar qualquer trabalho diário, o desenvolvedor deve garantir que sua base de código local está perfeitamente sincronizada com as últimas mudanças consolidadas no servidor remoto, para não haver conflito.

> * Sempre busque as atualizações da branch base de integração antes de iniciar novas alterações.  
> * O comando git pull baixa e mescla as alterações remotas na sua branch local atual.

## **3\. Desenvolvimento e Commits Atômicos**

Durante a codificação, as alterações devem ser salvas em pacotes lógicos e indivisíveis. Esta prática é conhecida como **Commits Atômicos**.  
Um commit atômico significa que cada commit deve conter apenas uma única unidade lógica de mudança. Se um commit for revertido, ele deve remover apenas aquela funcionalidade específica, sem quebrar o resto do sistema.

> * **Benefícios:** Facilita a revisão de código, torna o rastreamento de bugs (git bisect) muito mais eficiente e simplifica a reversão de alterações defeituosas.  
> * **Prática:** Evite trabalhar semanas a fio e fazer um commit único com a mensagem "Várias atualizações". Separe as mudanças. Um commit para o front-end de uma tela, outro para a lógica de validação, outro para a correção de um erro ortográfico.  
> * **Bibliografia Recomendada:** *Pro Git*, escrito por Scott Chacon e Ben Straub (Apress), seção sobre "Commit Guidelines". O livro enfatiza a necessidade de commits pequenos, independentes e com mensagens descritivas detalhadas.

`git add [arquivos-especificos-da-mudanca]`  
`git commit -m "Adiciona validacao de campos obrigatorios na criacao de tarefas"`

Esse é o **cenário ideal** que eu gostaria de ter utilizado, mas hoje não é a realidade. Esse padrão deve ser seguido daqui pra frente.

## **4\. Versionamento e Atualização do Changelog**

O projeto segue o padrão **Semantic Versioning (SemVer)** (MAJOR.MINOR.PATCH) para determinar o número das versões. Toda alteração funcional, correção ou adição deve ser registrada no histórico de mudanças antes do envio do código.

> 1. Abra o arquivo CHANGELOG.md na raiz do projeto.  
> 2. Registre a descrição técnica da mudança na seção \[Unreleased\].  
> 3. Categorize a mudança corretamente em: Adicionado, Modificado, Removido ou Corrigido.

Nenhuma alteração de código será aceita se o arquivo CHANGELOG.md não estiver atualizado refletindo o escopo do que foi desenvolvido.

## **5\. Integração: Pull Requests vs Merge Requests**

O código desenvolvido localmente deve ser enviado ao repositório remoto para ser avaliado. O envio da branch de trabalho é feito através do comando de push.  
Após o push, um **Pull Request (PR)** deve ser aberto no GitHub.

> * **Plataformas diferentes, mesmos conceitos:** O GitHub chama este processo de *Pull Request*. O GitLab chama de *Merge Request*. Ambos representam exatamente a mesma coisa: um pedido formal para que outros desenvolvedores revisem o seu código antes de ele ser integrado (mergeado) à branch principal.

É possível criar *pull requests* dentro do próprio terminal, para isso você precisará instalar o `gh`.
Estando na *feature branch* desejado, onde os commits, pushes e testes foram feitos, criamos um *pull request* com o comando abaixo:
`gh pr create --base develop --title "feature: permite duplicar tarefas" --body "Closes #2"`
O parametro `base` define a branch onde queremos subir as alterações feitas na feature branch, e `body` define o corpo do PR, onde é muito importante usarmos as keywords aceitas: Closes, Fixes e Resolves

> É possivel utilizar o modo interativo utilizando apenas `gh pr create`

Para visualizar os PRs abertos, utilize o comando `gh pr list` e para ver um especifico `gh pr view 2`

## **6\. O Comando Git Merge no GitHub**

Para responder à dúvida comum: **Sim, o comando por trás dos panos continua sendo git merge**.  
O Git é a ferramenta (o motor). O GitHub é apenas a plataforma de hospedagem. Independentemente de usar GitHub, GitLab ou Bitbucket, a ação de juntar o histórico de duas branches é nativa do Git e feita através do comando de merge. Quando você clica no botão verde "Merge Pull Request" no GitHub, o servidor do GitHub está essencialmente executando um git merge para unir a branch de trabalho à branch de destino.

Há uma forma de realizar o merge utilizando o comando `git`, porém vamos utilizar o `gh`
Quando você cria um pull request, o Github já sabe para onde você quer mandar aquele código e o que ele deve fazer com essa feature branch.

`gh pr merge --merge --delete-branch` 

## **7\. Revisão de Código (Code Review)**

Nenhum código deve ser integrado sem validação de outro desenvolvedor da equipe.

| Papel | Responsabilidades Exigidas na Revisão   |
| :---- | :---- |
| Autor do PR | Garantir que o código funciona localmente, que os commits são atômicos, que o Changelog está devidamente atualizado e responder de forma técnica aos comentários apontados. |
| Revisor | Inspecionar detalhadamente a qualidade da arquitetura do código, buscar possíveis gargalos de performance, validar a lógica de negócios e aprovar ou bloquear a integração solicitando mudanças. |

## **8\. Rebase vs Merge**

Durante o desenvolvimento, a branch base pode receber atualizações de outras pessoas. Você precisa trazer essas atualizações para a sua branch atual.

> * **Merge:** Cria um novo commit de união. Preserva o histórico exato, mas cria ramificações visuais no gráfico de commits.  
> * **Rebase:** Reescreve o histórico da sua branch, colocando as suas alterações no topo das alterações mais recentes da base, formando uma linha do tempo linear.  
> * **Regra Restrita:** O uso de git rebase é permitido apenas em branches de trabalho locais e individuais, antes do código ser enviado (push) para o repositório remoto. Nunca utilize rebase em branches públicas ou compartilhadas.

## **9\. Lançamento de Versão (Release)**

Quando a branch base de integração acumula um conjunto testado e estável de novas funcionalidades, a release é preparada.

> 1. O código de integração é mesclado na branch de produção.  
> 2. A seção \[Unreleased\] do CHANGELOG.md é convertida para o número da nova versão.  
> 3. Uma Tag é criada no Git apontando para o commit exato de lançamento.

`git tag -a v1.2.0 -m "Release da versao 1.2.0"`  
`git push origin v1.2.0`

## **10\. Gerenciamento e Reporte de Bugs (Issues)**

O rastreamento de defeitos deve ser feito exclusivamente pela aba "Issues" do GitHub. Relatos verbais ou mensagens informais não são aceitos. O reporte deve conter obrigatoriamente:

> * **Descrição Objetiva:** Resumo claro da falha.  
> * **Passos de Reprodução:** Caminho exato de cliques e ações até o erro.  
> * **Comportamento Esperado:** O que o sistema deveria fazer caso o bug não existisse.  
> * **Evidências:** Capturas de tela, logs de terminal ou registros de erro do navegador.

Cada issue gera um número e é importante utiliza-lo na identificação das issues.

**Exmeplos:**
*feat: permitir duplicar tarefas*
*enhancement: troca de localStorage por IndexedDB*

## **11\. Feature Branches**

Uma boa prática para lidar com features e melhorias no código é a criação de feature branches. Por mais que isso seja mais compreensível em um cenário corporativo (onde cada colaborador trabalha com uma task) mas isso é recomendável independente disso.
Dessa forma, cada coisa pode ser testada em separado, antes de tudo ser integrado em uma develop ou main.

Para criar uma feature branch, siga os passos:
`git checkout develop`
`git pull origin develop`
`git checkout -b feature/2-dupliocar-tarefas`

E depois de trabalhar e commitar coisas, sempre importante subir para a feature branch de forma explicita:
`git push origin feature/2-duplicar-tarefas`
