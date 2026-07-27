# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]
### Adicionado
- Sem adições recentes

## [1.0.0] - 2026-07-27
### Adicionado
- **Núcleo de Tarefas**: Gestão de tarefas com prioridades (P0 a P4), diferentes tipos (Desafio Diário, Sprint, Bônus, Rotinas) e visualização compacta.
- **Núcleo de Hábitos**: Rastreamento de hábitos diários com suporte a modificadores (Congelamento, Folga).
- **Zona de Desapego (Quitter)**: Sistema para acompanhamento de renúncia de vícios, com ciclo de 7 dias e recompensas dinâmicas.
- **Inventário e Loja**: Suporte a itens compráveis como "Dado Mágico", "Congelamento", "Folga Extra" e "Modus Operandi".
- **LPI (Lida Productivity Index)**: Algoritmo de nota diária e mensal baseado em consistência, penalidades e assiduidade.
- **Feeds e Canais**: Base de conhecimento interativa utilizando sintaxe `@Feed` e `#Canal`, com suporte a formatação markdown e menções.
- **Sistema de Notas e Atalhos**: Cadernos bloqueáveis por senha, categorização de notas e painel de atalhos em ping-pong (Marquee).
- **Temporizador Pomodoro**: Motor global de foco com sintetizador de áudio nativo integrado (`AudioContext`) para alarmes.
- **Visão de Vida e Reflexões**: Flashcards para aprendizados profundos e sistema de projeção de objetivos e checkpoints.
- **Sincronização em Nuvem**: Integração com Firebase Firestore e autenticação Google.
- **Sistema de Temas e UI**: Múltiplas paletas de cores nativas (AMOLED, Navy, Darcula) e premium desbloqueáveis.
- **Modus Operandi**: Filosofias de produtividade selecionáveis (Multitarefa, Minimalista, Pontual, Ambicioso) que alteram os multiplicadores de recompensa.
- **Navegação Nativa**: Interceptador de eventos `popstate` para gerenciar a tecla/gesto "Voltar" do navegador de forma inteligente sem fechar o app prematuramente.
