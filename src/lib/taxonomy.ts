import type { CategoryConfig, Transaction } from '@/lib/types';
import { useAppMode, type AppMode } from '@/lib/appConfigStore';
import {
  CATEGORY_CONFIG as SIMPLE_CONFIG,
  getCategoryConfig as getSimpleConfig,
} from '@/lib/categories';
import {
  EXPENSE_MACROS,
  getCategoryConfig as getDetailedConfig,
  isValidMicroForMacro,
  migrateTransactionCategory,
} from '@/lib/detailedCategories';

/**
 * Taxonomia de categorias por modo.
 *
 * A planilha guarda a categoria do jeito que foi lançada: categorias legadas
 * (Comida, Casa…) pelo modo simples, macros + micro (Alimentação › Delivery)
 * pelo modo detalhado. Cada modo converte na hora de exibir via `normalize`,
 * então os dois modos enxergam todas as transações sem reescrever dados.
 *
 * Regra: `normalize` serve só para exibição. Nunca envie o resultado para
 * addTransaction/updateTransaction — use a transação original.
 */
export interface CategoryTaxonomy {
  mode: AppMode;
  /** Categorias de topo para filtros e seletores, na ordem de exibição */
  categories: readonly string[];
  /** Reescreve category/subcategory (e o tipo inferido) para este modo */
  normalize: (t: Transaction) => Transaction;
  /** Cor, ícone e rótulo da categoria neste modo */
  getConfig: (category: string) => CategoryConfig;
}

// ─── Modo simples ────────────────────────────────────────────────────────────

const DETAILED_TO_SIMPLE: Record<string, string> = {
  Moradia: 'Casa',
  Alimentação: 'Comida',
  Transporte: 'Transporte',
  Saúde: 'Saúde',
  Educação: 'Estudos',
  'Cuidados pessoais': 'Compras',
  Lazer: 'Lazer',
  Viagens: 'Lazer',
  'Compras e bens': 'Compras',
  'Serviços e assinaturas': 'Assinaturas',
  'Família e presentes': 'Ajuda Financeira',
  Pets: 'Outros',
  'Impostos e obrigações': 'Outros',
  Financeiro: 'Outros',
};

function toSimpleCategory(t: Transaction): string {
  if (t.recurrency === 'Fixo') return 'Fixos';
  if (t.category in SIMPLE_CONFIG) return t.category;
  return DETAILED_TO_SIMPLE[t.category] ?? 'Outros';
}

export const SIMPLE_TAXONOMY: CategoryTaxonomy = {
  mode: 'simple',
  categories: Object.keys(SIMPLE_CONFIG),
  normalize: (t) => ({ ...t, category: toSimpleCategory(t), subcategory: null }),
  getConfig: getSimpleConfig,
};

// ─── Modo detalhado ──────────────────────────────────────────────────────────

/** Categorias de topo que já pertencem ao modo detalhado e não precisam de migração */
const DETAILED_TOP_LEVEL = new Set<string>([
  ...EXPENSE_MACROS,
  'Investimentos',
  'Receitas',
  'Transferências',
  'Outros',
]);

function toDetailed(t: Transaction): Transaction {
  const isLegacyInvestment = t.category === 'Investimentos' && !t.subcategory;
  if (DETAILED_TOP_LEVEL.has(t.category) && !isLegacyInvestment) {
    return {
      ...t,
      transactionType: t.transactionType ?? (t.category === 'Investimentos' ? 'investment' : 'expense'),
    };
  }

  // Categoria legada: infere Macro › Micro pelo nome, mas preserva uma micro
  // válida que já tenha sido escolhida (ex: editada pelo modo simples).
  const migrated = migrateTransactionCategory(t.category, t.subcategory, t.name);
  const keepSub = !!t.subcategory && isValidMicroForMacro(migrated.macro, t.subcategory);

  return {
    ...t,
    category: migrated.macro,
    subcategory: keepSub ? t.subcategory : migrated.micro,
    transactionType: t.transactionType ?? migrated.transactionType ?? 'expense',
    recurrency: t.recurrency ?? migrated.recurrency ?? null,
  };
}

export const DETAILED_TAXONOMY: CategoryTaxonomy = {
  mode: 'detailed',
  categories: [...EXPENSE_MACROS, 'Investimentos'],
  normalize: toDetailed,
  getConfig: getDetailedConfig,
};

// ─── API ─────────────────────────────────────────────────────────────────────

export function getTaxonomy(mode: AppMode): CategoryTaxonomy {
  return mode === 'detailed' ? DETAILED_TAXONOMY : SIMPLE_TAXONOMY;
}

/** Taxonomia do modo atual — use em qualquer tela que mostre categorias */
export function useCategoryTaxonomy(): CategoryTaxonomy {
  return getTaxonomy(useAppMode());
}

/** Gastos de consumo e aportes: exclui receitas e transferências entre contas */
export function isSpending(t: Transaction): boolean {
  return t.transactionType !== 'income'
    && t.transactionType !== 'transfer'
    && t.category !== 'Transferências';
}

export interface CategoryGroup {
  category: string;
  total: number;
  count: number;
  /** Totais por subcategoria (vazio no modo simples) */
  subcategories: Record<string, number>;
}

/**
 * Agrupa transações já normalizadas por categoria (e subcategoria),
 * ordenando do maior para o menor total.
 *
 * `fallbackSubcategory` agrupa os itens sem subcategoria sob esse nome;
 * sem ele, esses itens entram só no total da categoria.
 */
export function groupByCategory(
  transactions: Transaction[],
  { fallbackSubcategory }: { fallbackSubcategory?: string } = {},
): CategoryGroup[] {
  const groups: Record<string, CategoryGroup> = {};
  for (const t of transactions) {
    const category = t.category || 'Outros';
    const group = (groups[category] ??= { category, total: 0, count: 0, subcategories: {} });
    group.total += t.amount;
    group.count += 1;
    const explicitSub = t.subcategory?.trim();
    const sub = explicitSub && explicitSub !== category ? explicitSub : fallbackSubcategory;
    if (sub) {
      group.subcategories[sub] = (group.subcategories[sub] ?? 0) + t.amount;
    }
  }
  return Object.values(groups).sort((a, b) => b.total - a.total);
}
