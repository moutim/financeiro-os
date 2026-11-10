import type { CategoryBudget, Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/currency';
import { DETAILED_TAXONOMY, groupByCategory, isSpending, splitBySubCategory } from '@/lib/taxonomy';

/**
 * Orçamento mensal por categoria macro (modo detalhado).
 *
 * Cada linha da aba Orcamentos é uma versão do limite de uma categoria, válida do
 * `fromMonth` dela até a próxima versão. O limite de um mês é a versão mais recente
 * com `fromMonth <= mês`: os meses seguintes herdam o limite sem gravar nada, e mudar
 * o limite num mês cria uma versão nova, sem tocar no resultado dos meses anteriores.
 *
 * O gasto vem sempre das transações (nada é gravado), então incluir, editar ou
 * excluir uma transação já muda os indicadores.
 */

// ─── Versões ──────────────────────────────────────────────────────────────────

/** Versão em vigor da categoria no mês (null se nunca teve orçamento até lá) */
export function versionForMonth(budgets: CategoryBudget[], category: string, monthKey: string): CategoryBudget | null {
  let current: CategoryBudget | null = null;
  for (const b of budgets) {
    if (b.category !== category || b.fromMonth > monthKey) continue;
    if (!current || b.fromMonth > current.fromMonth) current = b;
  }
  return current;
}

/** Limite de cada categoria com orçamento ativo no mês */
export function budgetsForMonth(budgets: CategoryBudget[], monthKey: string): Map<string, CategoryBudget> {
  const result = new Map<string, CategoryBudget>();
  for (const category of new Set(budgets.map((b) => b.category))) {
    const version = versionForMonth(budgets, category, monthKey);
    if (version?.active && version.limit > 0) result.set(category, version);
  }
  return result;
}

/** O que gravar na planilha para uma mudança de orçamento */
export interface BudgetChangePlan {
  create: Omit<CategoryBudget, 'id'>[];
  update: CategoryBudget[];
  remove: string[];
}

/**
 * Definir o limite de `category` a partir de `monthKey`. Se já existe versão nesse mês,
 * ela é atualizada; senão entra uma versão nova (os meses anteriores ficam como estavam).
 */
export function planSetBudget(budgets: CategoryBudget[], category: string, limit: number, monthKey: string): BudgetChangePlan {
  const exact = budgets.find((b) => b.category === category && b.fromMonth === monthKey);
  if (exact) return { create: [], update: [{ ...exact, limit, active: true }], remove: [] };

  const current = versionForMonth(budgets, category, monthKey);
  if (current?.active && current.limit === limit) return { create: [], update: [], remove: [] };
  return { create: [{ category, limit, fromMonth: monthKey, active: true }], update: [], remove: [] };
}

/**
 * Desativar o orçamento de `category` a partir de `monthKey`: os meses anteriores
 * continuam com o limite que tinham. Versões futuras (agendadas depois desse mês) saem,
 * senão o orçamento voltaria sozinho mais adiante.
 */
export function planDeactivateBudget(budgets: CategoryBudget[], category: string, monthKey: string): BudgetChangePlan {
  const ofCategory = budgets.filter((b) => b.category === category);
  const remove = ofCategory.filter((b) => b.fromMonth > monthKey).map((b) => b.id);
  const exact = ofCategory.find((b) => b.fromMonth === monthKey);
  const previous = versionForMonth(ofCategory.filter((b) => b.fromMonth < monthKey), category, monthKey);
  const activeBefore = !!previous?.active;

  if (exact) {
    // sem orçamento antes deste mês: a versão deste mês simplesmente deixa de existir
    if (!activeBefore) return { create: [], update: [], remove: [...remove, exact.id] };
    return { create: [], update: [{ ...exact, limit: 0, active: false }], remove };
  }
  if (!activeBefore) return { create: [], update: [], remove };
  return { create: [{ category, limit: 0, fromMonth: monthKey, active: false }], update: [], remove };
}

// ─── Gastos ───────────────────────────────────────────────────────────────────

export interface CategorySpending {
  total: number;
  count: number;
}

/**
 * Gasto por categoria macro no mês, pelas transações reais. Mesmo caminho do Analytics
 * (sub-transações divididas pela categoria delas, categorias legadas convertidas para
 * macro), então cada real entra uma única vez. Receitas, transferências e aportes em
 * investimentos ficam de fora: não consomem orçamento de despesa.
 *
 * Compras parceladas: cada parcela já é uma linha própria na planilha, com o valor da
 * parcela, o mês dela e a categoria da compra (ver TransactionForm* e splitInstallments).
 * Filtrar pelo mês conta só a parcela daquela competência — nunca o total da compra, nem
 * parcelas futuras. Pagar a fatura do cartão só marca as parcelas como pagas (isPaid), sem
 * lançamento novo, então o gasto não entra duas vezes.
 */
export function spendingByMacro(transactions: Transaction[], monthKey: string): Map<string, CategorySpending> {
  const spending = transactions
    .filter((t) => t.monthKey === monthKey)
    .flatMap(splitBySubCategory)
    .map(DETAILED_TAXONOMY.normalize)
    .filter((t) => isSpending(t) && t.transactionType !== 'investment' && t.category !== 'Investimentos');

  return new Map(groupByCategory(spending).map((g) => [g.category, { total: g.total, count: g.count }]));
}

// ─── Situação ─────────────────────────────────────────────────────────────────

export type BudgetStatus = 'normal' | 'attention' | 'alert' | 'critical' | 'reached' | 'over';

interface BudgetStatusInfo {
  label: string;
  color: string;
  bg: string;
}

export const BUDGET_STATUS: Record<BudgetStatus, BudgetStatusInfo> = {
  normal:    { label: 'No controle',          color: 'var(--green)',  bg: 'var(--green-light)' },
  attention: { label: 'Atenção',              color: 'var(--yellow)', bg: 'var(--yellow-light)' },
  alert:     { label: 'Perto do limite',      color: 'var(--orange)', bg: 'var(--orange-light)' },
  critical:  { label: 'Quase esgotado',       color: 'var(--red)',    bg: 'var(--red-light)' },
  reached:   { label: 'Limite atingido',      color: 'var(--red)',    bg: 'var(--red-light)' },
  over:      { label: 'Ultrapassado',         color: 'var(--red)',    bg: 'var(--red-light)' },
};

/** Ordem de gravidade, para destacar primeiro o que precisa de atenção */
export const STATUS_SEVERITY: Record<BudgetStatus, number> = {
  normal: 0, attention: 1, alert: 2, critical: 3, reached: 4, over: 5,
};

/**
 * Faixas: até 50% normal · 51–75% atenção · 76–90% perto do limite ·
 * 91–99% quase esgotado · 100% limite atingido · acima de 100% ultrapassado.
 * Compara em centavos para "atingido" valer só quando o gasto bate o limite.
 */
export function budgetStatus(spent: number, limit: number): BudgetStatus {
  const spentCents = Math.round(spent * 100);
  const limitCents = Math.round(limit * 100);
  if (limitCents <= 0) return spentCents > 0 ? 'over' : 'normal';
  if (spentCents > limitCents) return 'over';
  if (spentCents === limitCents) return 'reached';
  const pct = (spentCents / limitCents) * 100;
  if (pct > 90) return 'critical';
  if (pct > 75) return 'alert';
  if (pct > 50) return 'attention';
  return 'normal';
}

/** Percentual para exibir: arredondado, mas sem mostrar 100% antes de bater o limite */
export function displayPct(spent: number, limit: number): number {
  if (limit <= 0) return 0;
  const pct = (spent / limit) * 100;
  const rounded = Math.round(pct);
  if (rounded >= 100 && budgetStatus(spent, limit) !== 'reached' && pct < 100) return 99;
  return rounded;
}

/** Mensagem contextual do card. `isPast`: o mês já acabou (fala no passado) */
export function budgetMessage(category: string, spent: number, limit: number, isPast: boolean): string {
  const status = budgetStatus(spent, limit);
  const pct = displayPct(spent, limit);
  const remaining = formatCurrency(Math.max(limit - spent, 0));

  if (isPast) {
    switch (status) {
      case 'over':    return `${category} passou ${formatCurrency(spent - limit)} do orçamento (${pct}%).`;
      case 'reached': return `${category} fechou o mês exatamente no limite.`;
      default:        return `${category} fechou o mês com ${pct}% do orçamento usado. Sobraram ${remaining}.`;
    }
  }

  switch (status) {
    case 'normal':    return `Você usou ${pct}% do orçamento de ${category}. Ainda há ${remaining} disponíveis.`;
    case 'attention': return `Atenção: você já utilizou ${pct}% do seu orçamento de ${category}. Restam ${remaining} para o restante do mês.`;
    case 'alert':     return `Você já utilizou ${pct}% do seu orçamento de ${category}. Restam ${remaining} para o restante do mês.`;
    case 'critical':  return `Orçamento de ${category} praticamente esgotado: restam apenas ${remaining}.`;
    case 'reached':   return `Você atingiu o limite de ${category}. Novos gastos vão ultrapassar o orçamento.`;
    case 'over':      return `Orçamento de ${category} ultrapassado em ${formatCurrency(spent - limit)} (${pct}% do limite).`;
  }
}
