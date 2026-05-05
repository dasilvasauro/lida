# Lida

O Lida é uma aplicação PWA para gestão de tarefas, hábitos e metas de longo prazo. Focado em produtividade intencional, o aplicativo centraliza o planejamento diário e a estruturação de objetivos. Utiliza criptografia de ponta a ponta (E2EE).

## Conceito

O objetivo do Lida é ser um hub de gestão pessoal de produtividade, incorporando recursos gameficados à rotina do usuário, como a progressão por níveis e a obtenção de "power-ups" que entrega uma maneira divertida de se lidar com as tarefas do dia a dia.

## Principais Recursos

* **Módulo Visão:** Estruturação de metas de longo prazo. Permite registrar características a serem desenvolvidas ou abandonadas e classificar grandes objetivos em estados de maturidade (de Inativo a Consistente);
* **Offline-First e Criptografia (E2EE):** A aplicação funciona integralmente sem conexão com a internet (uma vez que carregada previamente), utilizando armazenamento local (`localStorage`). Na opção de sincronização em nuvem via conta Google, os dados são criptografados localmente com uma Chave Mestra definida pelo usuário antes de serem enviados ao banco de dados, garantindo *zero-knowledge*;
* **Foco e Priorização Estrita:** Sistema de prioridades hierárquicas (P0 a P4) com travas sistêmicas que limitam a criação de tarefas P0 e P1 no mesmo dia;
* **Tipos diversos de tarefas:** Tarefas de Tempo (com timer integrado), Sprints para projetos de curto prazo;
* **Gestão de Hábitos e Histórico Analítico:** Rastreamento de execução diária (visualização em grid de contribuições). Possui mecânicas de manutenção de histórico, como a aplicação de pausas programadas ("Congelamentos" ou "Dias de Folga"), para gerenciamento realista da rotina;
* **Reflexões (Micro-Journaling):** Sistema de anotações em formato de cards, para axiomas e lembretes diários importantes;
* **Portabilidade de Dados:** Ferramenta nativa para exportação e importação de todo o banco de dados do usuário em formato `.json`, útil para backups manuais ou transições entre dispositivos offline.

## O que foi usado para construí-la?

A aplicação foi construída com foco em performance e fluidez, permitindo instalação nativa em dispositivos móveis e desktops via navegador.

* **Frontend:** React + TypeScript (Vite)
* **Gerenciamento de Estado:** Zustand (com middlewares de persistência)
* **Estilização:** Tailwind CSS v4
* **Animações e UI:** Framer Motion
* **Backend e Sincronização:** Firebase (Auth e Firestore)
* **Segurança:** Crypto-JS (Padrão AES)

## Instalação e Execução Local

### Pré-requisitos
* Node.js (versão 18 ou superior)
* NPM ou Yarn

### Passos

1. Clone o repositório:
```bash
git clone [https://github.com/SEU_USUARIO/lida.git](https://github.com/SEU_USUARIO/lida.git)
```

2. Acesse a pasta do projeto:
```bash
cd lida
```

3. Instale as dependências:
```bash
npm install
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`. Por utilizar a arquitetura Offline-First, é possível iniciar o uso e testes locais imediatamente, sem necessidade de configurar chaves de ambiente ou banco de dados externo num primeiro momento.

## Deploy e PWA
O projeto é compilado utilizando o `vite-plugin-pwa` para geração do Service Worker e manifesto, e pode ser publicado automaticamente através do GitHub Actions (GitHub Pages). Uma vez em produção, a aplicação lida nativamente com o cache de recursos e ações de navegação (como a interceptação do botão "Voltar" do Android).