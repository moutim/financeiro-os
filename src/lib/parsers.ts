import type {
  Transaction, Income, Pending, SavingsGoal,
  CreditCard, CardStatement, AppConfig,
  Category, CardBrand,
  TransactionType, TransactionNature, TransactionRecurrency, PaymentMethod,
} from '@/lib/types';

export function parseSheetNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  // Se contiver R$ ou for formato PT-BR com ponto e vírgula
  let cleaned = str.replace(/[^\d.,-]/g, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  return parseFloat(cleaned) || 0;
}

// ─── Transacoes ───────────────────────────────────────────────────────────────
// Columns: ID | Nome | Valor | Categoria | MesKey | Parcelas | Data | GoalId | CardId | ParentId | IsPaid
//        | Subcategoria | Natureza | Recorrencia | MeioPagamento | TipoMovimentacao
// As colunas a partir de "Subcategoria" são preenchidas pelo modo detalhado. A categoria é
// gravada como veio (legada ou macro); a conversão entre modos acontece só na exibição
// (ver src/lib/taxonomy.ts), então a planilha nunca é reescrita ao trocar de modo.
export function rowToTransaction(row: string[]): Transaction {
  return {
    id:              row[0] ?? '',
    name:            row[1] ?? '',
    amount:          parseSheetNumber(row[2]),
    category:        (row[3] || 'Outros') as Category,
    monthKey:        row[4] ?? '',
    installments:    row[5] || null,
    date:            row[6] || null,
    goalId:          row[7] || null,
    cardId:          row[8] || null,
    parentId:        row[9] || null,
    isPaid:          String(row[10]).toLowerCase() === 'true',
    subcategory:     row[11] || null,
    nature:          (row[12] || null) as TransactionNature | null,
    recurrency:      (row[13] || null) as TransactionRecurrency | null,
    paymentMethod:   (row[14] || null) as PaymentMethod | null,
    transactionType: (row[15] || undefined) as TransactionType | undefined,
  };
}

export function transactionToRow(t: Transaction): (string | number | null)[] {
  return [
    t.id,
    t.name,
    t.amount,
    t.category,
    t.monthKey,
    t.installments ?? '',
    t.date ?? '',
    t.goalId ?? '',
    t.cardId ?? '',
    t.parentId ?? '',
    t.isPaid ? 'true' : 'false',
    t.subcategory ?? '',
    t.nature ?? '',
    t.recurrency ?? '',
    t.paymentMethod ?? '',
    t.transactionType ?? '',
  ];
}

// ─── Receitas ─────────────────────────────────────────────────────────────────
// Columns: ID | Nome | Valor | MesKey | IsRecurring | ParentId | Parcelas
export function rowToIncome(row: string[]): Income {
  return {
    id:          row[0] ?? '',
    name:        row[1] ?? '',
    amount:      parseSheetNumber(row[2]),
    monthKey:    row[3] ?? '',
    isRecurring: String(row[4]).toLowerCase() === 'true',
    parentId:    row[5] || null,
    installments: row[6] || null,
    isPaid:       String(row[7]).toLowerCase() === 'true',
  };
}

export function incomeToRow(i: Income): (string | number | null)[] {
  return [i.id, i.name, i.amount, i.monthKey, i.isRecurring ? 'true' : 'false', i.parentId ?? '', i.installments ?? '', i.isPaid ? 'true' : 'false'];
}

// ─── Pendencias ───────────────────────────────────────────────────────────────
// Columns: ID | Nome | Valor | DueDate | Notes
export function rowToPending(row: string[]): Pending {
  return {
    id:      row[0] ?? '',
    name:    row[1] ?? '',
    amount:  parseSheetNumber(row[2]),
    dueDate: row[3] || null,
    notes:   row[4] || null,
  };
}

export function pendingToRow(p: Pending): (string | number | null)[] {
  return [p.id, p.name, p.amount, p.dueDate ?? '', p.notes ?? ''];
}

// ─── Metas ────────────────────────────────────────────────────────────────────
// Columns: ID | Nome | Atual | Meta | Previsao | Deadline | Notes | IsShared | OwnerSpreadsheetId | Icon
export function rowToGoal(row: string[]): SavingsGoal {
  return {
    id:                row[0] || `g-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name:              row[1] ?? '',
    current:           parseSheetNumber(row[2]),
    target:            parseSheetNumber(row[3]),
    monthlyPrediction: parseSheetNumber(row[4]),
    deadline:          row[5] || null,
    notes:             row[6] || null,
    isShared:          String(row[7]).toLowerCase() === 'true',
    ownerSpreadsheetId: row[8] || null,
    icon:              row[9] || null,
  };
}

export function goalToRow(g: SavingsGoal): (string | number | null)[] {
  return [g.id, g.name, g.current, g.target, g.monthlyPrediction, g.deadline ?? '', g.notes ?? '', g.isShared ? 'true' : 'false', g.ownerSpreadsheetId ?? '', g.icon ?? ''];
}

// ─── Cartões ──────────────────────────────────────────────────────────────────
// Columns: ID | Nome | Limite | Usado | Cor | CorClara | Bandeira | DiaPagamento | DiaFechamento | Notes | FreedMonthKey | LastDigits | BankId | Priority
export function rowToCard(row: string[]): CreditCard {
  return {
    id:         row[0] ?? '',
    name:       row[1] ?? '',
    limit:      parseSheetNumber(row[2]),
    used:       parseSheetNumber(row[3]),
    color:      row[4] ?? '#000000',
    colorLight: row[5] ?? '#f0f0f0',
    brand:      (row[6] ?? 'Outro') as CardBrand,
    dueDay:     row[7] ? parseInt(row[7]) : null,
    closeDay:   row[8] ? parseInt(row[8]) : null,
    notes:      row[9] || null,
    freedMonthKey: row[10] || null,
    lastDigits: row[11] || null,
    bankId: row[12] || null,
    priority: row[13] ? parseInt(row[13], 10) || null : null,
  };
}

export function cardToRow(c: CreditCard): (string | number | null)[] {
  return [c.id, c.name, c.limit, c.used, c.color, c.colorLight, c.brand, c.dueDay ?? '', c.closeDay ?? '', c.notes ?? '', c.freedMonthKey ?? '', c.lastDigits ?? '', c.bankId ?? '', c.priority ?? ''];
}

// ─── Faturas de Cartão ────────────────────────────────────────────────────────
// Columns: ID | CardId | MesKey | Valor | IsPaid | PaidAt
export function rowToCardStatement(row: string[]): CardStatement {
  return {
    id:       row[0] ?? '',
    cardId:   row[1] ?? '',
    monthKey: row[2] ?? '',
    amount:   parseSheetNumber(row[3]),
    isPaid:   String(row[4]).toLowerCase() === 'true',
    paidAt:   row[5] || null,
  };
}

export function cardStatementToRow(s: CardStatement): (string | number | null)[] {
  return [s.id, s.cardId, s.monthKey, s.amount, s.isPaid ? 'true' : 'false', s.paidAt ?? ''];
}

// ─── Config ───────────────────────────────────────────────────────────────────
// Columns: Key | Value
export function rowToConfig(row: string[]): AppConfig {
  return {
    key:   row[0] ?? '',
    value: row[1] ?? '',
  };
}

export function configToRow(c: AppConfig): (string | number | null)[] {
  return [c.key, c.value];
}
