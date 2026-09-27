import type {
  Transaction, Income, Pending, SavingsGoal,
  CreditCard, CardStatement, AppConfig,
  Category, CardBrand,
} from '@/lib/types';

// ─── Transacoes ───────────────────────────────────────────────────────────────
// Columns: ID | Nome | Valor | Categoria | MesKey | Parcelas | Data | GoalId | CardId | ParentId
export function rowToTransaction(row: string[]): Transaction {
  return {
    id:           row[0] ?? '',
    name:         row[1] ?? '',
    amount:       parseFloat(row[2] ?? '0') || 0,
    category:     (row[3] ?? 'Outros') as Category,
    monthKey:     row[4] ?? '',
    installments: row[5] || null,
    date:         row[6] || null,
    goalId:       row[7] || null,
    cardId:       row[8] || null,
    parentId:     row[9] || null,
  };
}

export function transactionToRow(t: Transaction): (string | number | null)[] {
  return [t.id, t.name, t.amount, t.category, t.monthKey, t.installments ?? '', t.date ?? '', t.goalId ?? '', t.cardId ?? '', t.parentId ?? ''];
}

// ─── Receitas ─────────────────────────────────────────────────────────────────
// Columns: ID | Nome | Valor | MesKey | IsRecurring | ParentId | Parcelas
export function rowToIncome(row: string[]): Income {
  return {
    id:          row[0] ?? '',
    name:        row[1] ?? '',
    amount:      parseFloat(row[2] ?? '0') || 0,
    monthKey:    row[3] ?? '',
    isRecurring: String(row[4]).toLowerCase() === 'true',
    parentId:    row[5] || null,
    installments: row[6] || null,
  };
}

export function incomeToRow(i: Income): (string | number | null)[] {
  return [i.id, i.name, i.amount, i.monthKey, i.isRecurring ? 'true' : 'false', i.parentId ?? '', i.installments ?? ''];
}

// ─── Pendencias ───────────────────────────────────────────────────────────────
// Columns: ID | Nome | Valor | DueDate | Notes
export function rowToPending(row: string[]): Pending {
  return {
    id:      row[0] ?? '',
    name:    row[1] ?? '',
    amount:  parseFloat(row[2] ?? '0') || 0,
    dueDate: row[3] || null,
    notes:   row[4] || null,
  };
}

export function pendingToRow(p: Pending): (string | number | null)[] {
  return [p.id, p.name, p.amount, p.dueDate ?? '', p.notes ?? ''];
}

// ─── Metas ────────────────────────────────────────────────────────────────────
// Columns: ID | Nome | Atual | Meta | Previsao | Deadline | Notes
export function rowToGoal(row: string[]): SavingsGoal {
  return {
    id:                row[0] || `g-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name:              row[1] ?? '',
    current:           parseFloat(row[2] ?? '0') || 0,
    target:            parseFloat(row[3] ?? '0') || 0,
    monthlyPrediction: parseFloat(row[4] ?? '0') || 0,
    deadline:          row[5] || null,
    notes:             row[6] || null,
  };
}

export function goalToRow(g: SavingsGoal): (string | number | null)[] {
  return [g.id, g.name, g.current, g.target, g.monthlyPrediction, g.deadline ?? '', g.notes ?? ''];
}

// ─── Cartões ──────────────────────────────────────────────────────────────────
// Columns: ID | Nome | Limite | Usado | Cor | CorClara | Bandeira | DiaPagamento | DiaFechamento | Notes | FreedMonthKey | LastDigits
export function rowToCard(row: string[]): CreditCard {
  return {
    id:         row[0] ?? '',
    name:       row[1] ?? '',
    limit:      parseFloat(row[2] ?? '0') || 0,
    used:       parseFloat(row[3] ?? '0') || 0,
    color:      row[4] ?? '#000000',
    colorLight: row[5] ?? '#f0f0f0',
    brand:      (row[6] ?? 'Outro') as CardBrand,
    dueDay:     row[7] ? parseInt(row[7]) : null,
    closeDay:   row[8] ? parseInt(row[8]) : null,
    notes:      row[9] || null,
    freedMonthKey: row[10] || null,
    lastDigits: row[11] || null,
  };
}

export function cardToRow(c: CreditCard): (string | number | null)[] {
  return [c.id, c.name, c.limit, c.used, c.color, c.colorLight, c.brand, c.dueDay ?? '', c.closeDay ?? '', c.notes ?? '', c.freedMonthKey ?? '', c.lastDigits ?? ''];
}

// ─── Faturas de Cartão ────────────────────────────────────────────────────────
// Columns: ID | CardId | MesKey | Valor | IsPaid | PaidAt
export function rowToCardStatement(row: string[]): CardStatement {
  return {
    id:       row[0] ?? '',
    cardId:   row[1] ?? '',
    monthKey: row[2] ?? '',
    amount:   parseFloat(row[3] ?? '0') || 0,
    isPaid:   row[4] === 'true',
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
