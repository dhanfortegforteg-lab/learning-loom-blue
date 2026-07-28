# Urstudy — Plano de construção

Um ecossistema de estudos inspirado no Teachy AI, com identidade azul, mascote lobo (igual à imagem enviada), fundo escuro/claro à escolha, manchas azuis animadas e IA para gerar todos os materiais. Dada a enorme superfície do produto, proponho entregar em **fases**. Você aprova o escopo da Fase 1 e seguimos; as próximas fases entram em iterações seguintes.

## Design system (aplica a tudo)

- Paleta azul profunda (#0b1a3a, #12234d, #1e40af, #3b82f6, #60a5fa) com destaques claros.
- Dois temas: **escuro** (padrão) e **claro**, alternável no header.
- Manchas azuis animadas (blobs SVG com blur, animação suave) no fundo do app e do menu lateral.
- Tipografia: Space Grotesk (títulos) + Inter (corpo).
- Mascote lobo: SVG estilizado seguindo a arte enviada, usado como avatar do tutor, em vazios de estado e conquistas.
- Componentes: cards com borda gradiente sutil, glow azul em foco, micro-animações (Framer Motion).

## Fase 1 — Fundação + materiais principais (esta entrega)

Backend: **Lovable Cloud** (auth, banco, storage) + **Lovable AI Gateway** (google/gemini-3.6-flash) para geração dos materiais.

### Autenticação e perfil
- Login/cadastro por e-mail e senha.
- Perfil do aluno: nome, avatar, tema preferido, XP, nível, ofensiva.

### Shell do app
- Sidebar com: Home, Estudar, Biblioteca, Cronograma, Desafios, Calendário, Escrita, Dúvidas, Anotações, Brasões, Sair.
- Header com busca global e toggle de tema.
- Fundo animado com blobs azuis.

### Central de Estudos (criação de material)
Formulário: Etapa (Fundamental/Médio/Superior), Disciplina, Assunto (livre), Dificuldade de leitura, Tamanho do texto.
Botão "Gerar todos" e botões individuais por material:

1. **Apostila** — blocos organizados, títulos chamativos, destaques.
2. **Flashcards** — carrossel com virada 3D (flip), marcar "sei / não sei".
3. **Questões** — múltipla escolha interativa, feedback imediato, contagem de acertos.
4. **Slides** — deck navegável, imagens geradas por IA por slide, explicação curta.
5. **Resumo** — linguagem informal com exemplos.
6. **Mapa mental** — nós em blocos com brilho/glow animado.
7. **Explicação simples** — linguagem de criança de 1º ano.
8. **Prática** — 5 seções (teoria + 2 perguntas cada), progresso por seção.
9. **Prova** — mín. 15 questões, linguagem formal, resultado com nota.
10. **Quiz** — questões teóricas mais difíceis, timer opcional, ranking pessoal.
11. **Falhas na revisão** — reagrupa erros do aluno com explicação corretiva.
12. **Simulado** — diário, avaliado até 500, registrado na média mensal.
13. **Escrita** — avalia texto do aluno (0–100) com feedback da IA.

Cada material gerado é salvo na **Biblioteca** (histórico com filtros por disciplina/etapa/data).

### Gamificação
- XP + níveis com brasões (Carvão → Cobre → Prata → Ouro → Diamante).
- Ofensiva diária (streak) com ícone de fogo.
- Desafios diários (4/dia): estudo no cronômetro + escrita + 2 aleatórios.
- Ranking pessoal com troféus e estrelas.

### Cronograma (Pomodoro/estudo)
- Escolhe disciplina + meta (min).
- Cronômetro persistente (continua ao trocar de aba) via `localStorage` + timestamp.
- Ao concluir, confirma estudo → gera XP e conta para o desafio.

### Home
- Saudação + mascote lobo.
- Cards: nível, ofensiva, materiais gerados, questões respondidas, % acertos, tempo de estudo.
- Média geral, média de escrita, brasões.
- Desafios do dia.

### Sistemas transversais
- Progresso do aluno (persistência de erros, histórico, variáveis).
- Notificações diárias (toasts + centro de notificações).
- Mascote tutor (bolha flutuante com dicas contextuais).
- Busca global e "Tirar dúvidas" (chat com IA).

## Fase 2 (próxima iteração, após aprovação)
- Calendário completo com eventos e lembretes.
- Anotações ricas + upload/leitura de PDF.
- Guia de técnicas de estudo (Feynman, Pomodoro, Cornell, etc.).
- Registro mensal do simulado com gráfico de evolução.
- Ranking global entre usuários.
- Sistema de tarefas com mascote (produtividade).
- Estudo engraçado (modo humor do tutor).

## Detalhes técnicos

- **Stack**: TanStack Start + React 19 + Tailwind v4 + shadcn.
- **Backend**: Lovable Cloud (Supabase gerenciado) — tabelas: `profiles`, `user_roles`, `materials`, `material_items`, `study_sessions`, `answers`, `daily_challenges`, `writings`, `exams`, `notes`, `events`, `notifications`. RLS por `auth.uid()`, roles em tabela separada com `has_role()`.
- **IA**: `createServerFn` chamando Lovable AI Gateway com `google/gemini-3.6-flash`; imagens dos slides via `google/gemini-3-pro-image`. Prompts especializados por tipo de material com saída JSON estruturada.
- **Cronômetro persistente**: estado global (Zustand) + timestamp em `localStorage`, resistente a troca de aba.
- **Animações**: Framer Motion + SVG blobs animados via CSS.
- **Verificação final**: após build, testes manuais das rotas principais + inspeção de console/network para garantir que nada esteja travado.

## Confirmação necessária

O escopo da Fase 1 já é muito grande (vai levar várias mensagens de implementação). Confirma que posso começar por ela? Se quiser cortar/priorizar algo dentro da Fase 1 (ex.: entregar primeiro só Apostila+Flashcards+Questões+Resumo e deixar Prova/Simulado/Escrita para depois), me diz agora.
