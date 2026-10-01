# Especificação: Implementação do Modo Detalhado (Baseado no Commit 93344b9 e Design Specs)

## Contexto

A plataforma financeira "Financeiro OS" agora possui um sistema de **"Modo de Uso"**, permitindo aos usuários alternar entre um **Modo Simples** (minimalista, direto ao ponto) e um **Modo Detalhado** (com visualizações analíticas, gráficos avançados, hierarquia de categorias e opções expandidas).

A lógica global já está sendo estruturada para fornecer um estado booleano (ex: `isDetailedMode`). O objetivo desta tarefa é pegar as funcionalidades do antigo commit `93344b927937c6c0bde5bc5e02be1a478b2ae37e` e as novas referências visuais, e reintroduzi-las na plataforma **EXCLUSIVAMENTE** para quando o Modo Detalhado estiver ativado.

---

## Funcionalidades a serem integradas no Modo Detalhado

As quatro frentes de trabalho abaixo devem ser recuperadas e condicionalmente renderizadas (ou comportar-se de maneira avançada) com base na ativação do Modo Detalhado:

### 1. Analytics Avançado para Cartões de Crédito
A aba de visualização e gerenciamento de cartões de crédito ganha um painel profundo de estatísticas que deve ser ativado apenas no modo detalhado.

- **Componentes Avançados:** 
  - Restabelecer o `src/components/cards/CreditAnalytics.tsx` (que lida com os relatórios analíticos usando os dados de limite e fatura).
  - Restabelecer a integração robusta com `src/components/charts/CreditProjectionChart.tsx` (gráfico de projeção do limite e faturas).
- **Comportamento Esperado:** No *Modo Simples*, a tela apresenta apenas os visuais físicos dos cartões e saldos. Quando o *Modo Detalhado* é ativo, a UI expande e passa a renderizar os componentes analíticos de fatura abaixo dos cartões.

### 2. Nova Experiência e Analytics na Página de Categorias
A gestão de categorias no modo detalhado abandona uma lista simples e vira um **Dashboard Analítico** completo de despesas focado na hierarquia "Macro > Micro".

- **Componentes e Visões Adicionais:**
  - **KPIs Avançados:** Exibição de cards no topo com "Total de Gastos", "Maior Macro", "Maior Micro-Gasto (Poupança/Meta)" e "Ticket Médio".
  - **Análise Gráfica:** Gráfico de Pizza interativo (Composição macro) e gráficos de barras com evolução percentual.
  - **Abertura por Categoria (Macro > Micro):** A listagem agora apresenta a quebra em árvore (ex: *Alimentação* subdividida em *Fast food, Mercado, Delivery*), com valores sumarizados por nível.
- **Lógica e Dados:**
  - A estrutura massiva de subcategorias presente em `src/lib/categories.ts` alimenta esse sistema, permitindo que os gráficos de `CategoryCharts.tsx` cruzem dados de forma hierárquica.

### 3. Formulário de Transação Refatorado (Sub-transações)
O preenchimento de despesas e receitas ganha o layout robusto "Power User".

- **Mudanças na Interface (UI/UX):**
  - **Hierarquia de Categorização:** Adição dos campos divididos "CATEGORIA MACRO" e "CATEGORIA MICRO".
  - **Sub-Transações:** Inclusão da opção "SUB-TRANSAÇÕES (+ Adicionar)" para quebrar um único lançamento em várias fatias menores de classificação.
  - **Detalhamento Opcional:** Associação forte com "Cartão de Crédito" no momento do cadastro e parcelamentos avançados em `TransactionForm.tsx`.
- **Comportamento Esperado:**
  - No *Modo Simples*, o modal é minimalista (Valor, Título, Categoria única).
  - Com o *Modo Detalhado*, a tela estica e revela esses selects avançados (Macro/Micro) e a capacidade de destrinchar faturas e compras complexas.

### 4. Visão Avançada no Dashboard (Página Inicial)
A tela de início (`src/app/dashboard/page.tsx`) altera seus cartões de resumo baseados na ativação do modo detalhado.

- **Mudança Implementada pela Camile (Commit `93344b9`):** 
  - A antiga estrutura genérica de "Resumo do Mês" foi desativada e substituída pelo painel **"Análise de Gastos (Macro › Micro)"**.
  - O código do commit implementa uma árvore elegante de subdivisões hierárquicas dentro desse card (com indicadores visuais `├──` e `└──`), mapeando dinamicamente cada transação com sua respectiva subcategoria (ex: *Alimentação* -> `├── Fast food`, `└── Mercado`).
- **Comportamento Esperado:**
  - O *Modo Simples* mantém a visão aglomerada sem subcategorias.
  - O *Modo Detalhado* ativa a injeção da lógica de `macroMap` na dashboard, cruzando totais parciais e replicando fielmente a visão detalhada elaborada pela Camile no print 2 enviado como anexo.

---

## Diretrizes de Implementação

1. **Gatekeeping (Condicional):** Envolva os imports pesados e as renderizações avançadas em validações de estado (`if (isDetailedMode)`).
2. **Separação de Preocupações:** Se o formulário de transações divergir demais entre os modos, isole-os em `TransactionFormSimple` vs `TransactionFormDetailed`.
3. **Não remova o que já foi ajustado:** Melhorias genéricas de responsividade, como o refatoramento visual do cartão físico (aspect ratio dinâmico, embosse) e layouts clean, já foram consolidados na branch principal e devem operar independentemente do modo escolhido. Reimporte apenas as features vitais e lógicas do commit antigo.
