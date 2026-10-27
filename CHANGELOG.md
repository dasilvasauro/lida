# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]
### Alterado — Cofre v2 (requer novas regras do Firestore, veja `MIGRACAO-COFRE-V2.md`)
- **Nuvem em pedaços**: o cofre deixa de ser um documento único (limite de 1 MB) e passa a ser `users/{uid}/vault/*` — config, economia, hábitos, etc., e tarefas/notas/mensagens divididas por mês. Cada aparelho escuta só o índice (`_meta`) e baixa/envia apenas os pedaços que mudaram.
- **Criptografia**: Web Crypto (PBKDF2-SHA256 com 600 mil iterações + AES-GCM 256) no lugar do CryptoJS. A Chave Mestra não fica mais salva em texto puro; o aparelho guarda só a chave derivada, não-exportável.
- **Migração automática** do cofre antigo na primeira abertura; o documento antigo fica preservado e bloqueado para gravação.
- **Armazenamento local em IndexedDB** (sem o limite de ~5 MB do localStorage), com migração automática dos dados antigos.
- **Economia em registro por aparelho**: ouro, XP, vouchers e itens ganhos/gastos em aparelhos diferentes ao mesmo tempo não se perdem mais.
- **Hábitos**: desmarcar um registro agora sincroniza.
- **Exclusões**: apagar mensagens/feeds/canais registra lápides para tudo que foi apagado em cascata; lápides com mais de 180 dias são descartadas.
- **Notas**: colar imagens é bloqueado (apenas o texto é colado).
- "Forçar envio local" (ao conectar uma conta que já tem cofre) apaga o cofre da nuvem e cria um novo com a nova Chave Mestra.
- **Proteções de concorrência**: gravações em transação conferem a revisão de cada pedaço; aparelhos param de sincronizar se o cofre for apagado/recriado em outro lugar; punições por tarefa falhada contam uma vez só entre aparelhos; preferências seguem "a mais recente vence".
- **Backup**: restaurar traz de volta, em todos os aparelhos, itens apagados depois do backup.
- **Sair da conta**: tenta enviar pendências antes e avisa se algo ainda não subiu.
- O documento do cofre antigo é apagado automaticamente 30 dias após a migração.
- **Dependências**: `vite-plugin-pwa` 1.3.0 (compatível com Vite 8): `npm install` volta a funcionar sem `--legacy-peer-deps`. Correções de segurança aplicadas com `npm audit fix`.
- **Deploy**: GitHub Actions usa Node 22 e `npm ci`.

### Corrigido
- **Sincronização**: fim do "ping-pong" de gravações entre dispositivos abertos ao mesmo tempo; o app só grava na nuvem quando há dados novos (abrir modais não gera mais gravações). Debounce com tempo máximo de 10s.
- **Sincronização**: Visão de Vida e histórico de humor agora são baixados e mesclados entre dispositivos.
- **Sincronização**: regras de merge determinísticas (empate favorece a nuvem); conflito "concluída x falhada" favorece a concluída; modificadores de hábitos mesclados por data; meses arquivados do LPI não voltam.
- **Sincronização**: aviso quando o cofre se aproxima do limite de 1 MB do Firestore e erro visível quando a gravação falha.
- **Backup**: exportação inclui todas as áreas; importação aceita o formato novo e o antigo e restaura de fato os dados.
- **Pomodoro**: store própria com tempo calculado por horário de término; continua certo em segundo plano e não regrava as tarefas a cada segundo.
- **Virada do dia**: ausências maiores que 30 dias processam os últimos 30 dias; todos os meses pendentes são arquivados; o processamento espera o primeiro sync com a nuvem.
- **Humor do dia**: passa a vir do histórico do dia atual.
- **Feeds**: corrigida injeção de HTML via URLs com aspas; links com # ou @ não são mais quebrados.
- Estado de interface (modais abertos) deixa de ser persistido.

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
