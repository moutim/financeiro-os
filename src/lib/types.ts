export type Category =
  | 'Compras'
  | 'Fixos'
  | 'Comida'
  | 'Investimentos'
  | 'Saúde'
  | 'Estudos'
  | 'Ajuda Financeira'
  | 'Dividendos'
  | 'Outros';

export interface SubTransaction {
  id?: string;
  name: string;
  amount: number;
  installments?: string | null;
  isPaid?: boolean;
}

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  category: Category;
  monthKey: string; // "YYYY-MM"
  installments?: string | null;
  date?: string | null; // ISO date string
  goalId?: string | null;
  cardId?: string | null; // vínculo opcional com um cartão
  parentId?: string | null; // ID da transação macro
  subTransactions?: SubTransaction[] | null;
  isPaid?: boolean;
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
