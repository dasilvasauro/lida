# **Lida: Arquitetura e Documentação Técnica**

Este documento descreve o funcionamento interno do Lida, abordando sua lógica de negócios, fluxo de dados e infraestrutura técnica. O objetivo é fornecer uma visão clara de como a aplicação foi construída e como as peças se conectam.

## **1\. O Conceito Base**

O Lida é um motor de produtividade gamificado construído sob a premissa de que a inércia deve ter consequências. Eu me baseei principalmente na minha experiência com o Habitica para a criação da economia e loja. A aplicação conta  com um índice, um score, gerado para o usuário baseado em sua assiduidade em hábitos e realização de tarefas. (LPI \- Lida Productivity Index).

A ideia é permitir não somente o gerenciamento de tarefas em um nível superficial e de curto prazo, mas também a definição de metas a longo prazo, se tornando para o usuário um hub de produtividade.

O sistema pune omissões (tarefas expiradas ou hábitos ignorados) com a perda de recursos virtuais (XP e Ouro) e recompensa a conclusão de tarefas difíceis (Prioridades P0 e P1). Há também a "Zona de Desapego" (Quitter), um espaço desenhado para o rastreamento e abandono de vícios, onde recaídas geram punições severas no progresso do usuário.

Os dados sincronizados com a conta do Google são criptografados.Por ser um web-app, dizer que ele é "Offline First" pode soar equivocado, mas o app possui sim mecanismos para tratar os cenários onde não há conexão.

## **2\. Recursos e Possibilidades**

A aplicação é dividida em módulos independentes que interagem entre si:

* **Tarefas e Rotinas:** Suporta prioridades (P0 a P4), tarefas recorrentes, "Sprints" (projetos com data de início e fim) e tarefas de tempo (foco imersivo com cronômetro).  
* **Hábitos e Vícios:** Rastreamento diário de hábitos positivos e monitoramento de abstinência de hábitos negativos, com sistema de ciclos de recompensa de 7 dias.  
* **Economia e Loja:** Ouro e XP acumulados são usados para comprar vantagens (congelamento de hábitos, dias de folga, extensões de prazo) ou temas visuais.  
* **Base de Conhecimento:** Sistema de Notas e Feeds (estilo microblogging pessoal), permitindo vinculação de notas a tarefas e hábitos para contexto rápido.  
* **Visão de Vida:** Área para definição de identidade e grandes objetivos, que norteiam as ações diárias, inspirado por [esse artigo](https://letters.thedankoe.com/p/how-to-fix-your-entire-life-in-1).

## **3\. A Arquitetura em Camadas**

A estrutura do Lida é dividida em três camadas lógicas distintas. Essa separação garante que a interface gráfica não precise conhecer os cálculos matemáticos complexos e que o banco de dados seja apenas um repositório passivo.

### **Camada de Apresentação (Visual)**

É a superfície da aplicação, responsável por tudo o que o usuário vê e interage. Construída com React e estilizada com Tailwind CSS. As animações de transição e feedback visual são gerenciadas pelo Framer Motion. Esta camada é "burra", ela apenas lê os dados disponíveis e envia comandos de ação para a camada inferior quando botões são clicados.

### **Camada de Regras de Negócio (Lógica)**

É o cérebro da aplicação. Aqui residem os cálculos do LPI, a distribuição de XP, a verificação de prazos e as penalidades. Esta camada é construída inteiramente com Zustand (um gerenciador de estado global). O processamento ocorre na memória RAM do dispositivo do usuário.

### **Camada de Persistência (Dados)**

Responsável por garantir que os dados não se percam quando o navegador é fechado. É composta por um banco de dados local no navegador do usuário e um espelho criptografado na nuvem.

## **4\. Fluxo de Dados e Armazenamento**

O Lida não utiliza o padrão tradicional onde cada ação do usuário dispara uma requisição de leitura ou gravação em um servidor remoto. A abordagem escolhida é radicalmente focada no processamento local.

### **O Banco de Dados**

A aplicação utiliza o Firebase Firestore como infraestrutura de nuvem, mas o utiliza como um "cofre de armazenamento em massa" (Blob Storage) em vez de um banco de dados relacional ou de documentos individualizados.

### **Como é feita a Gravação e Leitura**

Quando o usuário cria uma tarefa, a camada de regras (Zustand) atualiza a memória RAM instantaneamente. Essa alteração na memória é copiada de forma automática para o armazenamento local do navegador do usuário. A interface reflete a mudança em milissegundos, sem depender de internet.

Em segundo plano, um mecanismo de sincronização agrupa todas as informações do aplicativo (tarefas, notas, hábitos, economia) em um único pacote (um objeto JSON grande).

Este pacote passa por um processo de criptografia AES usando a Chave Mestra (PIN) do usuário. Somente após ser transformado em um bloco de texto ilegível, esse documento único é enviado ao Firebase.

Para a leitura (quando o usuário acessa de outro dispositivo), o processo é inverso. O aplicativo baixa este documento único do Firebase, pede a Chave Mestra para descriptografar e injeta os dados de volta na memória RAM.

### **Resolução de Conflitos e Lápides (Tombstones)**

Como a aplicação funciona offline, o usuário pode deletar um item sem internet. Para que a nuvem saiba que aquele item foi apagado e não o traga de volta na próxima sincronização, o Lida usa o conceito de "Tombstones" (Lápides).

Quando algo é excluído, seu ID é guardado em um registro de lápides junto com o horário da exclusão. Durante a mesclagem dos dados locais com os dados da nuvem, se o sistema encontra um item cujo ID possui uma lápide mais recente, ele descarta a versão da nuvem e mantém o item morto.

## **5\. Gerenciamento de Estado (As Stores)**

O Zustand divide o estado global em fatias menores e gerenciáveis, chamadas de "Stores". Cada store cuida do seu próprio domínio, mas elas podem consultar umas às outras.

* **useTaskStore:** Mantém o vetor de tarefas, as pastas e o cronômetro do Modo Foco. Contém a função crítica processNewDay, que analisa se o usuário deixou tarefas expirarem e calcula as punições retroativas caso o aplicativo fique fechado por vários dias.  
* **useEconomyStore:** Gerencia o Ouro, XP, Nível e o inventário de itens. Recebe comandos da useTaskStore e useHabitStore para adicionar ou subtrair recursos com base nas ações do usuário.  
* **useHabitStore:** Controla o rastreamento diário de hábitos e o sistema Quitter.  
* **useConfigStore:** Guarda preferências de tema, fonte, filosofias de trabalho (Modus Operandi) e o dicionário de Tombstones.

## **6\. Particularidades do TypeScript**

O código é fortemente tipado utilizando TypeScript, o que atua como uma barreira de segurança estrutural.

Em vez de permitir que uma tarefa receba qualquer texto como prioridade, o TypeScript utiliza tipos literais estritos. A propriedade priority de uma tarefa só aceita os valores exatos 'P0', 'P1', 'P2', 'P3' ou 'P4'.

O mesmo princípio é aplicado a itens da loja, estados de humor e configurações de tema. Se o desenvolvedor tentar atribuir um valor não previsto ou esquecer de enviar uma propriedade obrigatória (como o id ou a data de criação) na hora de forjar uma nova tarefa, o código sequer compila.

As interfaces (como Task, Habit, Note) definem o formato exato que os dados devem ter, garantindo que as fatias do estado global do Zustand permaneçam consistentes e previsíveis durante os cálculos pesados de mesclagem de dados e sincronização na nuvem.