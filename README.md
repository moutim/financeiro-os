<div align="center">
  <h1>Financeiro OS</h1>
  <p><strong>Sistema de Controle Financeiro Pessoal — Design Apple, Liquid Glass & Banco de Dados 100% no seu Google Drive</strong></p>
</div>

<br />

O **Financeiro OS** é um ecossistema completo de gestão financeira pessoal desenvolvido com foco absoluto em usabilidade, privacidade e design de nível mundial. Inspirado nas diretrizes de design de software da **Apple** e na estética *Liquid Glass* (materiais translúcidos, micro-interações táteis e profundidade visual), a aplicação transforma o controle financeiro em uma experiência elegante, fluida e intuitiva.

O maior diferencial do sistema é sua arquitetura de **Privacidade Absoluta**: **o seu banco de dados é a sua própria conta do Google Sheets**. Todos os dados de transações, receitas, faturas de cartão de crédito e metas são lidos e gravados diretamente na sua planilha pessoal. Nenhum dado financeiro fica armazenado em servidores de terceiros.

---

## ✨ Destaques & Diferenciais

- 🎨 **Apple Design System & Liquid Glass**: Superfícies translúcidas com efeito *blur*, sombras suaves multicamadas, tipografia refinada e transições fluidas com aceleração por hardware.
- 🔒 **Privacidade Total (Google Drive como Database)**: Acesso via OAuth 2.0 com permissões granulares. Seus dados pertencem unicamente a você.
- 🏷️ **Arquitetura Hierárquica Macro › Micro**: Fim das categorias confusas. Divisão clara entre grandes áreas da vida financeira (Macros) e onde o dinheiro foi exatamente gasto (Micros opcionais).
- 💳 **Gestão Realista de Cartões de Crédito**: Cartões visuais 3D com chip EMV metálico, onda contactless, bandeiras oficiais (Mastercard, Visa, Elo, Amex) e favicons em alta definição das instituições bancárias.
- 📊 **Análises de Comprometimento de Renda**: Cálculo automático do impacto das faturas e dívidas de cartão contra a renda líquida e salário mensal.
- 🎯 **Metas com Ícones Personalizados**: Catálogo visual de ícones para objetivos (Carro, Casa, Cirurgia, Viagem, Estudos, Reserva, Casamento, Tech, etc.) com detecção inteligente por palavra-chave.
- ⚡ **Dados de Teste em 1-Clique**: Ambiente de demonstração integrado para popular o sistema com dados realistas de 2026 e testar instantaneamente todos os recursos.

---

## 🧭 Visão Detalhada por Página e Containers

### 1. Dashboard (`/dashboard`)
A central de comando do seu mês financeiro:
- **Cabeçalho & Seletor de Data (`MonthSelector`)**: Carrossel horizontal de **cardzinhos brancos** exibindo o mês abreviado e ano (ex: `Set 26`). Conta com rolagem suave automática para o mês ativo e botões `+` para voltar ou avançar meses cronologicamente.
- **Faixa de KPIs do Mês (`StatGrid`)**:
  - **Renda do Mês**: Soma de todas as entradas fixas (salários) e receitas extras.
  - **Total de Gastos**: Total de despesas de consumo e fixos do mês selecionado.
  - **Investimentos**: Total aportado no mês em metas e patrimônio.
  - **Sobra do Mês**: Saldo líquido com badge de status (verde para superávit, vermelho para déficit).
- **Assistente de Início de Mês (`StartMonthWizard`)**: Detecta automaticamente quando um mês ainda não possui despesas fixas ou salários cadastrados e oferece a cópia em 1-clique dos dados recorrentes do mês anterior.
- **Gráfico de Rosca por Categoria (`SpendingDonut`)**: Gráfico circular translúcido com fatias por macro-categoria e percentuais de participação.
- **Recebimentos & Extras**: Lista detalhada de rendimentos pontuais (dividendos, bônus semestral, restituição) com controle de status (Pendente / Recebido).
- **Lista Cronológica de Transações (`TransactionList`)**: Extrato diário detalhado com badges de categoria, identificação do cartão de crédito, parcelamento (`ex: 2/10`) e modal de edição rápida.
- **Análise Hierárquica do Mês**: Árvore com conectores visuais (`├──`, `└──`) mostrando exatamente a divisão de micro-categorias dentro de cada macro no mês.
- **Gráfico de Evolução Financeira (`MonthlyBar`)**: Barras comparativas de gastos, investimentos e saldo ao longo dos últimos meses.

---

### 2. Categorias & Análise Avançada (`/categorias`)
Página analítica dedicada ao raio-X do seu consumo:
- **Faixa Superior de Métricas**:
  - **Total de Gastos**: Valor consolidado e quantidade de transações analisadas.
  - **Maior Macro Categoria**: A área que mais consumiu dinheiro e seu percentual no total.
  - **Maior Micro-Gasto**: O destino específico mais custoso do mês (ex: *Supermercado*, *Aluguel* ou *Combustível*).
  - **Ticket Médio**: Gasto médio por transação registrada.
- **Painel de Gráficos Analíticos (`CategoryCharts`)**:
  - 🍩 **Aba Distribuição**: Rosca interativa em SVG onde passar o cursor sobre as fatias exibe os dados consolidados no centro do gráfico, acompanhado de ranking lateral com barras de proporção.
  - ✨ **Aba Top Micros**: Ranking horizontal das 10 maiores micro-categorias com tags da macro pai e peso percentual.
  - 🗂️ **Aba Macro › Micro**: Matriz hierárquica em cards com barras de proporção interna demonstrando a composição de cada macro.
  - 📊 **Aba Evolução**: Histórico temporal comparativo mês a mês das principais categorias.
- **Grid de Cards de Categoria**:
  - Barra de busca instantânea e ordenação dinâmica (*Maior valor*, *Menor valor*, *Qtd de itens*, *A-Z*).
  - Cada card exibe: ícone e cor oficial, valor total, porcentagem do orçamento, barra de progresso, mini-gráfico de tendência temporal e árvore de micro-categorias associadas.

---

### 3. Cartões de Crédito & Limites (`/cartoes`)
Gestão completa de crédito, faturas e projeção de dívidas:
- **Painel Analítico de Crédito (`CreditAnalytics`)**:
  - 💳 **Composição de Limite**: Limite Total, Limite Usado e Limite Livre disponível em barra segmentada estilo Apple Wallet.
  - 💼 **Comprometimento da Renda / Salário**: Cálculo exato de quanto as faturas do mês consomem da sua renda mensal, com badges inteligentes:
    - 🟢 *Comprometimento Saudável* (até 30% da renda)
    - 🟡 *Comprometimento Moderado* (30% a 50% da renda)
    - 🔴 *Comprometimento Elevado* (> 50% da renda)
  - 🏷️ **Peso de Cada Cartão no Salário**: Tabela comparativa indicando a fatura de cada cartão e o percentual correspondente do salário.
  - 🛍️ **Onde o Crédito Foi Utilizado**: Distribuição dos gastos de cartão por categoria no mês.
- **Seletor de Ordenação**: Exibição dos cartões por *Prioridade (1º Principal, 2º...)*, *Maior Limite*, *Maior Disponível*, *Mais Utilizado* ou *Ordem Alfabética*.
- **Cards Físicos Realistas**:
  - Layout com textura, degradê dinâmico, chip EMV em relevo, ondas de pagamento por aproximação, 4 últimos dígitos (`•••• 8492`), bandeiras (Mastercard, Visa, Elo, Amex) e logos bancários.
  - Barra de utilização do limite com alerta automático caso ultrapasse 80% de ocupação.
  - Rodapé com valor da fatura do mês, percentual da renda consumida, badge de fatura paga e botão de quitação (*Pagar Fatura*).
- **Projeção de Liberação de Crédito (`CreditProjectionChart`)**: Gráfico projetando a curva de liberação de limite para os próximos 6 meses conforme as compras parceladas são quitadas.

---

### 4. Transações (`/transacoes`)
Extrato geral e lançamento de movimentações:
- **Filtros Dinâmicos**: Filtragem por Macro Categoria, status de pagamento (*Todas*, *Pagas*, *Pendentes*) e busca textual por descrição.
- **Modal de Lançamento (`TransactionForm`)**:
  - **Abas de Movimentação**: *Despesa*, *Receita*, *Investimento*.
  - **Seletor de Data**: Dois campos limpos de formulário (*Ano* e *Mês*).
  - **Categorização em Dois Níveis**: Seleção da Macro Categoria e Micro Categoria opcional (*com opção "Nenhuma / Geral"*).
  - **Cartão & Parcelamento**: Vinculação a cartão de crédito com parcelamento retroativo inteligente (ex: cadastrar parcela `3/3` retroage automaticamente as parcelas anteriores nos meses devidos).
- **Modal de Edição (`TransactionEditModal`)**: Edição ágil de valores, datas, categorias e status de pagamento.

---

### 5. Metas & Objetivos (`/metas`)
Planejamento financeiro de curto, médio e longo prazo:
- **Cards de Metas com Ícones Temáticos**:
  - Catálogo de ícones: 🚗 Carro, 🏠 Casa, 🩺 Cirurgia/Saúde, ✈️ Viagem, 🎓 Estudos, 🛡️ Reserva, ✨ Casamento, 💻 Tech/Notebook, 📱 Celular, 📈 Investimentos, 🛍️ Compras, 👶 Família, 🌴 Aposentadoria, 🎁 Presente, 🎯 Meta Geral.
  - **Sugestão Inteligente**: O modal sugere automaticamente o ícone com base no que você digita no título da meta.
  - Barra de progresso com porcentagem concluída, valor guardado vs valor alvo e estimativa de meses restantes baseada no aporte mensal planejado.
  - **Metas Compartilhadas**: Compartilhamento seguro entre cônjuges ou parceiros via ID da meta.
- **Container "A Resolver" (Pendências)**: Gestão de pendências financeiras avulsas (reembolsos a receber, devoluções, empréstimos ou contas fora do fluxo).
- **Histórico de Aportes**: Registro temporal de todas as transações vinculadas a investimentos e metas.

---

### 6. Configurações (`/settings`)
Personalização, segurança e gestão de dados:
- **Perfil do Usuário**: Informações da conta Google autenticada e avatar.
- **Personalização de Cores & Aparência**:
  - Alternância entre Modo Claro (*Light*) e Modo Escuro (*Dark*).
  - Seletor de Cor de Destaque (*Accent Color*): Cores predefinidas da paleta Apple ou código **HEX livre** (ex: `#10B981`, `#8B5CF6`, `#FF6B6B`) com preview instantâneo em todo o sistema.
- **Ambiente de Testes & Demonstração**: Botão de **1-clique para popular a aplicação com dados mockados completos de 2026** para demonstração de todos os recursos.
- **Gerenciamento e Limpeza de Dados (`ClearDataModal`)**: Exclusão seletiva por aba da planilha (*Transações*, *Receitas*, *Metas*, *Cartões*, *Pendências*), mantendo a estrutura de colunas e cabeçalhos 100% íntegra.
- **Link Direto**: Atalho para abrir a planilha base diretamente no Google Sheets.

---

## 🏗️ Estrutura de Pastas

```text
src/
├── app/
│   ├── api/                    # Rotas de API e integrações com o Google Sheets
│   │   ├── auth/               # Handlers do NextAuth (Google OAuth)
│   │   ├── cartoes/            # CRUD de cartões de crédito
│   │   ├── categorias/         # Endpoints de categorização
│   │   ├── metas/              # CRUD e compartilhamento de metas
│   │   ├── seed-mock/          # População instantânea de dados de demonstração
│   │   ├── settings/           # Limpeza de dados e preferências
│   │   └── transacoes/         # CRUD de receitas e despesas
│   ├── cartoes/                # Página de gestão de crédito e cartões
│   ├── categorias/             # Página de análise macro/micro e gráficos
│   ├── dashboard/              # Página inicial com KPIs e extrato do mês
│   ├── login/                  # Tela de autenticação Google com design translúcido
│   ├── metas/                  # Página de objetivos, pendências e aportes
│   ├── settings/               # Configurações de tema, conta e limpeza
│   ├── transacoes/             # Página de extrato geral com filtros
│   ├── globals.css             # Design Tokens, Apple CSS e micro-animações
│   └── layout.tsx              # Shell da aplicação com ThemeProvider
├── components/
│   ├── cards/                  # Componentes de cartões (físicos, formulários e analytics)
│   ├── categories/             # Gráficos de rosca, barras e matriz hierárquica
│   ├── charts/                 # Componentes SVG de projeção e histórico
│   ├── goals/                  # Modais de cadastro e compartilhamento de metas
│   ├── layout/                 # Sidebar desktop e navegação flutuante mobile (Pill)
│   ├── settings/               # Modais de limpeza de dados e preferências
│   ├── transactions/           # Seletor de data em cards brancos, formulários e extrato
│   └── ui/                     # GlassCards, CategoryBadges, Spinners e StatCards
├── hooks/                      # Hooks customizados (useSwipeToClose, animações)
└── lib/
    ├── auth.ts                 # Configuração do NextAuth e scopes do Google
    ├── banks.ts                # Catálogo de bancos brasileiros, cores e domínios
    ├── categories.ts           # Estrutura oficial de Macros e Micros
    ├── currency.ts             # Formatação de moedas (BRL) e ordenação cronológica
    ├── goalIcons.ts            # Catálogo e inferência de ícones de metas
    ├── parsers.ts              # Conversores bidirecionais entre Sheets e TypeScript
    ├── seed.ts                 # Dataset mock completo de 2026
    ├── sheets.ts               # Estrutura canônica de abas e cabeçalhos
    ├── store.ts                # Gerenciamento global de estado (Zustand)
    └── types.ts                # Modelos de dados e tipagens TypeScript
```

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/) (Strict typing em todas as camadas)
- **Autenticação**: [NextAuth.js](https://next-auth.js.org/) (Google OAuth 2.0 com scopes de Spreadsheets e Drive)
- **Base de Dados**: [Google Sheets API v4](https://developers.google.com/sheets/api)
- **Estado Global**: [Zustand](https://github.com/pmndrs/zustand) com sincronização em memória
- **Estilização**: Vanilla CSS com variáveis de design Apple (*Design Tokens*), Tailwind CSS e suporte a tema escuro
- **Ícones**: [Lucide React](https://lucide.dev/)

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js 18.17+ instalado
- Conta Google com projeto configurado no [Google Cloud Console](https://console.cloud.google.com/) (para Google Sheets API e OAuth)

### 1. Clonar o Repositório e Instalar Dependências
```bash
git clone https://github.com/moutim/financeiro-os.git
cd financeiro-os
npm install
```

### 2. Configurar as Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto com o seguinte conteúdo:
```env
# Google OAuth (Credenciais obtidas no Google Cloud Console)
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=sua_chave_secreta_aleatoria
```

### 3. Executar o Servidor de Desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

### 4. Executar em Produção
```bash
npm run build
npm run start
```

---

## 🧪 Como Testar com Dados Mockados
Para testar imediatamente a aplicação com todos os gráficos, 4 cartões de crédito configurados, metas com ícones e transações completas de 2026:
1. Acesse o menu **Configurações** (`/settings`).
2. Localize o container **"Ambiente de Testes & Demonstração"**.
3. Clique em **"Carregar Dados Mockados de Teste"**.
4. Navegue pelo **Dashboard**, **Categorias**, **Cartões** e **Metas** para explorar todas as visões analíticas!

---

<div align="center">
  <p><strong>Financeiro OS</strong> &bull; Construído para quem busca clareza financeira com estética premium.</p>
</div>
