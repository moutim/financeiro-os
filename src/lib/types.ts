export type ExpenseMacro =
  | 'Moradia'
  | 'Alimentação'
  | 'Transporte'
  | 'Saúde'
  | 'Educação'
  | 'Cuidados pessoais'
  | 'Lazer'
  | 'Viagens'
  | 'Compras e bens'
  | 'Serviços e assinaturas'
  | 'Família e presentes'
  | 'Terceiros'
  | 'Pets'
  | 'Impostos e obrigações'
  | 'Financeiro';

// Categorias são strings livres: o modo simples usa as legadas (Comida, Casa…)
// e o modo detalhado usa as macros acima. Ver src/lib/taxonomy.ts.
export type Category = string;

export type TransactionType = 'expense' | 'income' | 'investment' | 'transfer';
export type TransactionNature = 'Essencial' | 'Discricionário';
export type TransactionRecurrency = 'Fixo' | 'Variável' | 'Pontual';
export type PaymentMethod = 'Crédito' | 'Débito' | 'Pix' | 'Dinheiro' | 'Boleto' | 'Outro';

export interface SubTransaction {
  id?: string;
  name: string;
  amount: number;
  installments?: string | null;
  isPaid?: boolean;
  // Categoria própria do item (despesas). Vazia: o item fica na categoria da transação
  category?: Category | null;
  subcategory?: string | null;
}

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  category: Category; // Macro no modo detalhado (ex: "Alimentação") ou categoria legada (ex: "Comida")
  subcategory?: string | null; // Micro (ex: "Delivery") — preenchida apenas pelo modo detalhado
  transactionType?: TransactionType;
  nature?: TransactionNature | null;
  recurrency?: TransactionRecurrency | null;
  paymentMethod?: PaymentMethod | null;
  monthKey: string; // "YYYY-MM"
  installments?: string | null;
  date?: string | null; // ISO date string
  goalId?: string | null;
  cardId?: string | null; // vínculo opcional com um cartão
  parentId?: string | null; // ID da transação macro
  subTransactions?: SubTransaction[] | null;
  isPaid?: boolean;
  author?: string | null; // nome de quem fez o aporte — gravado nas cópias para a meta compartilhada
}

export interface MonthSummary {
  monthKey: string; // "YYYY-MM"
  label: string;    // "Fevereiro 2025"
  totalExpenses: number;
  totalInvestments: number;
  totalFixed: number;
  totalFood: number;
  totalPurchases: number;
  balance: number; // sobra do mês
  income: number;
}

export interface Income {
  id: string;
  name: string;
  amount: number;
  monthKey: string;
  isRecurring?: boolean; // renda fixa mensal
  parentId?: string | null;
  installments?: string | null; // For sub-transactions or even regular incomes spread over months
  subTransactions?: SubTransaction[] | null;
  isPaid?: boolean;
}

export interface Pending {
  id: string;
  name: string;
  amount: number;
  dueDate?: string | null; // data de vencimento opcional
  notes?: string | null;   // observações
}

export interface SavingsGoal {
  id: string;
  name: string;
  current: number;
  target: number;
  monthlyPrediction: number;
  deadline?: string | null; // "YYYY-MM" alvo para atingir a meta
  notes?: string | null;
  isShared?: boolean;
  ownerSpreadsheetId?: string | null;
  icon?: string | null; // chave de ícone (ver src/lib/goalIcons.ts)
  // Meta de outra conta: aportes lidos da planilha do dono (só na resposta da API, não é gravado)
  sharedContributions?: Transaction[] | null;
  // Meta de outra conta sem acesso à planilha do dono: a pessoa precisa escolhê-la no seletor do Google (só na resposta da API)
  ownerAccessDenied?: boolean;
}

// ─── Cartões de Crédito ───────────────────────────────────────────────────────
export type CardBrand = 'Visa' | 'Mastercard' | 'Elo' | 'Amex' | 'Outro';

export interface CreditCard {
  id: string;
  name: string;         // ex: "Nubank", "Itaú Platinum"
  limit: number;
  used: number;
  color: string;        // hex para UI
  colorLight: string;   // hex claro para background
  brand: CardBrand;
  dueDay?: number | null;    // dia do vencimento da fatura
  closeDay?: number | null;  // dia do fechamento da fatura
  notes?: string | null;
  freedMonthKey?: string | null; // "YYYY-MM" de quando o limite será totalmente liberado
  lastDigits?: string | null; // últimos 4 dígitos do cartão
  bankId?: string | null; // ID do banco para buscar logo
  priority?: number | null; // Prioridade de exibição (1 = mais prioritário)
}

// ─── Faturas de Cartão ────────────────────────────────────────────────────────
export interface CardStatement {
  id: string;
  cardId: string;    // referência ao CreditCard.id
  monthKey: string;  // "YYYY-MM"
  amount: number;    // valor total da fatura
  isPaid: boolean;
  paidAt?: string | null; // ISO date string de quando foi pago
}

// ─── Config Global ────────────────────────────────────────────────────────────
export interface AppConfig {
  key: string;   // chave única, ex: "user_name", "currency"
  value: string; // valor em string (parse no client)
}

import type { ElementType } from 'react';

export interface CategoryConfig {
  label: Category;
  color: string;
  bgColor: string;
  icon: ElementType;
}
