'use client';

import { create } from 'zustand';
import type { Transaction, Income, Pending, SavingsGoal, Category, CreditCard } from '@/lib/types';

const now = new Date();
export const CURRENT_MONTH_KEY =`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const INITIAL_MONTHS = [CURRENT_MONTH_KEY];

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface FinanceStore {
  // Data
  transactions: Transaction[];
  incomes: Income[];
  pending: Pending[];
  goals: SavingsGoal[];
  cards: CreditCard[];

  // UI State
  selectedMonth: string;
  availableMonths: string[];
  filterCategory: Category | 'Todas' | null;
  loadingState: LoadingState;
  error: string | null;

  // Actions
  loadAll: () => Promise<void>;
  setSelectedMonth: (month: string) => void;
  addAvailableMonth: (month: string) => void;
  setFilterCategory: (cat: Category | 'Todas' | null) => void;
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id'>>) => Promise<void>;
  /** Marca várias transações como pagas numa única gravação */
  markTransactionsPaid: (ids: string[]) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addIncome: (income: Omit<Income, 'id'>) => Promise<Income>;
  /** Vários lançamentos numa única gravação (parcelas, cópias para meses futuros) */
  addEntriesBatch: (batch: {
    transactions?: Omit<Transaction, 'id'>[];
    incomes?: Omit<Income, 'id'>[];
  }) => Promise<{ transactions: Transaction[]; incomes: Income[] }>;
  updateIncome: (id: string, updates: Partial<Omit<Income, 'id'>>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addPending: (pending: Omit<Pending, 'id'>) => Promise<Pending>;
  updatePending: (id: string, updates: Partial<Omit<Pending, 'id'>>) => Promise<void>;
  deletePending: (id: string) => Promise<void>;
  addGoal: (goal: SavingsGoal) => Promise<void>;
  updateGoal: (id: string, updates: Partial<SavingsGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  /** Recarrega só as metas (saldo das compartilhadas vem da planilha do dono) */
  refreshGoals: () => Promise<void>;
  /** Aporte vinculado a meta de outra conta: grava a cópia na planilha do dono. Não faz nada se a meta não for compartilhada */
  contributeToSharedGoal: (goalId: string, transaction: Omit<Transaction, 'id'>) => Promise<void>;
  deleteMonth: (monthKey: string) => Promise<void>;
  
  addCard: (card: Omit<CreditCard, 'id'>) => Promise<CreditCard>;
  updateCard: (id: string, updates: Partial<Omit<CreditCard, 'id'>>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;

  // Computed
  getMonthTransactions: (monthKey: string) => Transaction[];
  getMonthIncomes: (monthKey: string) => Income[];
  getMonthSummary: (monthKey: string) => {
    income: number;
    totalExpenses: number;
    totalInvestments: number;
    totalFixed: number;
    totalFood: number;
    totalPurchases: number;
    balance: number;
  };
}

export const useFinanceStore = create<FinanceStore>()((set, get) => ({
  transactions: [],
  incomes: [],
  pending: [],
  goals: [],
  cards: [],
  availableMonths: INITIAL_MONTHS,
  selectedMonth: CURRENT_MONTH_KEY,
  filterCategory: null,
  loadingState: 'idle',
  error: null,

  // ─── Load all data from Google Sheets via API routes ─────────────────────
  loadAll: async () => {
    set({ loadingState: 'loading', error: null });
    try {
      const [txRes, incRes, pendRes, goalsRes, cardsRes] = await Promise.all([
        fetch('/api/transacoes', { cache: 'no-store' }),
        fetch('/api/receitas', { cache: 'no-store' }),
        fetch('/api/pendencias', { cache: 'no-store' }),
        fetch('/api/metas', { cache: 'no-store' }),
        fetch('/api/cartoes', { cache: 'no-store' }),
      ]);

      if (!txRes.ok || !incRes.ok || !pendRes.ok || !goalsRes.ok || !cardsRes.ok) {
        const errBody = await (!txRes.ok ? txRes : !incRes.ok ? incRes : !pendRes.ok ? pendRes : !goalsRes.ok ? goalsRes : cardsRes).json();
        throw new Error(errBody.error ?? 'Erro ao carregar dados');
      }

      const [transactions, incomes, pending, goals, cards] = await Promise.all([
        txRes.json() as Promise<Transaction[]>,
        incRes.json() as Promise<Income[]>,
        pendRes.json() as Promise<Pending[]>,
        goalsRes.json() as Promise<SavingsGoal[]>,
        cardsRes.json() as Promise<CreditCard[]>,
      ]);

      const uniqueMonths = new Set<string>();
      transactions.forEach(t => uniqueMonths.add(t.monthKey));
      incomes.forEach(i => uniqueMonths.add(i.monthKey));
      const loadedMonths = Array.from(uniqueMonths).sort();
      const finalMonths = loadedMonths.length > 0 ? loadedMonths : [get().selectedMonth];

      let newSelectedMonth = get().selectedMonth;
      if (loadedMonths.length > 0 && !loadedMonths.includes(newSelectedMonth)) {
        newSelectedMonth = loadedMonths[loadedMonths.length - 1];
      }

      set({ 
        transactions, 
        incomes, 
        pending, 
        goals, 
        cards,
        availableMonths: finalMonths,
        selectedMonth: newSelectedMonth,
        loadingState: 'success' 
      });
    } catch (err) {
      console.error('[loadAll]', err);
      set({ loadingState: 'error', error: String(err) });
    }
  },

  setSelectedMonth: (month) => set({ selectedMonth: month }),
  addAvailableMonth: (month) => set((state) => {
    if (!state.availableMonths.includes(month)) {
      return { availableMonths: [...state.availableMonths, month].sort() };
    }
    return state;
  }),
  setFilterCategory: (cat) => set({ filterCategory: cat }),

  // ─── Add transaction ──────────────────────────────────────────────────────
  addTransaction: async (t) => {
    const res = await fetch('/api/transacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(t),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao adicionar transação');
    }
    const created = await res.json() as Transaction;
    set((state) => ({ transactions: [...state.transactions, created] }));
    return created;
  },

  // ─── Delete transaction ───────────────────────────────────────────────────
  deleteTransaction: async (id) => {
    // Optimistic update
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
    const res = await fetch(`/api/transacoes/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      // Rollback on failure — reload from server
      await get().loadAll();
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao deletar transação');
    }
  },

  // ─── Mark many as paid ────────────────────────────────────────────────────
  markTransactionsPaid: async (ids) => {
    if (ids.length === 0) return;
    const targets = new Set(ids);
    // Optimistic update
    set((state) => ({
      transactions: state.transactions.map((t) => (targets.has(t.id) ? { ...t, isPaid: true } : t)),
    }));
    const res = await fetch('/api/transacoes/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      // Rollback on failure — reload from server
      await get().loadAll();
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao marcar as transações como pagas');
    }
  },

  // ─── Update transaction ───────────────────────────────────────────────────
  updateTransaction: async (id, updates) => {
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    const updated = get().transactions.find((t) => t.id === id);
    if (!updated) return;
    const res = await fetch(`/api/transacoes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      await get().loadAll();
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao atualizar transação');
    }
  },

  // ─── Add income ───────────────────────────────────────────────────────────
  addIncome: async (income) => {
    const res = await fetch('/api/receitas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(income),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao adicionar receita');
    }
    const created = await res.json() as Income;
    set((state) => ({ incomes: [...state.incomes, created] }));
    return created;
  },

  // ─── Batch: um único POST em vez de vários em paralelo ───────────────────
  // Gravações paralelas na mesma aba da planilha podiam se sobrescrever (uma
  // parcela sumia); a rota de lote grava tudo de uma vez.
  addEntriesBatch: async ({ transactions = [], incomes = [] }) => {
    if (transactions.length === 0 && incomes.length === 0) return { transactions: [], incomes: [] };
    const res = await fetch('/api/transacoes/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions, incomes }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao salvar os lançamentos');
    }
    const created = await res.json() as { transactions: Transaction[]; incomes: Income[] };
    set((state) => {
      // meses novos (ex: parcelas futuras) já aparecem no seletor, sem recarregar
      const months = new Set(state.availableMonths);
      [...created.transactions, ...created.incomes].forEach((entry) => months.add(entry.monthKey));
      return {
        transactions: [...state.transactions, ...created.transactions],
        incomes: [...state.incomes, ...created.incomes],
        availableMonths: [...months].sort(),
      };
    });
    return created;
  },

  // ─── Add pending ───────────────────────────────────────────────────────────
  addPending: async (pending) => {
    const res = await fetch('/api/pendencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao adicionar pendência');
    }
    const created = await res.json() as Pending;
    set((state) => ({ pending: [...state.pending, created] }));
    return created;
  },

  updatePending: async (id, updates) => {
    set((state) => ({
      pending: state.pending.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    const updated = get().pending.find((p) => p.id === id);
    if (!updated) return;

    const res = await fetch(`/api/pendencias/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      await get().loadAll();
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao atualizar pendência');
    }
  },

  deletePending: async (id) => {
    set((state) => ({ pending: state.pending.filter((p) => p.id !== id) }));
    const res = await fetch(`/api/pendencias/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      await get().loadAll();
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao excluir pendência');
    }
  },

  // ─── Update income ───────────────────────────────────────────────────────────
  updateIncome: async (id, updates) => {
    // Optimistic update
    set((state) => ({
      incomes: state.incomes.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    }));
    const updatedIncome = get().incomes.find((i) => i.id === id);
    if (!updatedIncome) return;

    const res = await fetch(`/api/receitas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedIncome),
    });
    if (!res.ok) {
      await get().loadAll();
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao atualizar receita');
    }
  },

  // ─── Delete income ───────────────────────────────────────────────────────────
  deleteIncome: async (id) => {
    set((state) => ({ incomes: state.incomes.filter((i) => i.id !== id) }));
    const res = await fetch(`/api/receitas/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      await get().loadAll();
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao deletar receita');
    }
  },

  // ─── Goals Actions ──────────────────────────────────────────────────────────
  addGoal: async (goal) => {
    const res = await fetch('/api/metas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao adicionar meta');
    }
    const created = await res.json() as SavingsGoal;
    set((state) => ({ goals: [...state.goals, created] }));
  },

  updateGoal: async (id, updates) => {
    set((state) => ({
      goals: state.goals.map((g) => g.id === id ? { ...g, ...updates } : g)
    }));
    const updated = get().goals.find((g) => g.id === id);
    if (!updated) return;
    
    const res = await fetch(`/api/metas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      await get().loadAll();
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao atualizar meta');
    }
  },

  deleteGoal: async (id) => {
    const res = await fetch(`/api/metas?id=${id}`, { method: 'DELETE' }); 
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao excluir meta');
    }
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }));
  },

  refreshGoals: async () => {
    const res = await fetch('/api/metas', { cache: 'no-store' });
    if (!res.ok) {
      console.error('[refreshGoals]', await res.json());
      return;
    }
    set({ goals: await res.json() as SavingsGoal[] });
  },

  // O saldo da meta compartilhada é lido da planilha do dono, então o aporte também precisa ser gravado lá
  contributeToSharedGoal: async (goalId, transaction) => {
    const goal = get().goals.find((g) => g.id === goalId);
    if (!goal?.isShared || !goal.ownerSpreadsheetId) return;

    const res = await fetch('/api/transacoes/shared', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerSpreadsheetId: goal.ownerSpreadsheetId,
        transaction: { ...transaction, name: `${transaction.name} (Compartilhado)` },
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao registrar o aporte na meta compartilhada');
    }
    await get().refreshGoals();
  },

  // ─── Cards Actions ──────────────────────────────────────────────────────────
  addCard: async (card) => {
    const res = await fetch('/api/cartoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao adicionar cartão');
    }
    const created = await res.json() as CreditCard;
    set((state) => ({ cards: [...state.cards, created] }));
    return created;
  },

  updateCard: async (id, updates) => {
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
    const updated = get().cards.find((c) => c.id === id);
    if (!updated) return;

    const res = await fetch(`/api/cartoes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      await get().loadAll();
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao atualizar cartão');
    }
  },

  deleteCard: async (id) => {
    set((state) => ({ cards: state.cards.filter((c) => c.id !== id) }));
    const res = await fetch(`/api/cartoes/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      await get().loadAll();
      const err = await res.json();
      throw new Error(err.error ?? 'Erro ao deletar cartão');
    }
  },

  deleteMonth: async (monthKey) => {
    try {
      const txs = get().transactions.filter(t => t.monthKey === monthKey).map(t => t.id);
      const incs = get().incomes.filter(i => i.monthKey === monthKey).map(i => i.id);
      
      if (txs.length > 0 || incs.length > 0) {
        const res = await fetch(`/api/mes/${monthKey}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionIds: txs, incomeIds: incs })
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? 'Erro ao apagar mês');
        }
      }
      
      set((state) => {
        const newAvailable = state.availableMonths.filter(m => m !== monthKey);
        const newSelected = state.selectedMonth === monthKey
          ? (newAvailable[newAvailable.length - 1] || state.selectedMonth)
          : state.selectedMonth;

        return {
          transactions: state.transactions.filter(t => t.monthKey !== monthKey),
          incomes: state.incomes.filter(i => i.monthKey !== monthKey),
          availableMonths: newAvailable,
          selectedMonth: newSelected,
          loadingState: 'success'
        };
      });
    } catch (err) {
      console.error('[deleteMonth]', err);
      set({ loadingState: 'error', error: String(err) });
      await get().loadAll();
    }
  },

  // ─── Computed ─────────────────────────────────────────────────────────────
  getMonthTransactions: (monthKey) =>
    get().transactions.filter((t) => t.monthKey === monthKey),

  getMonthIncomes: (monthKey) => {
    return get().incomes.filter((i) => i.monthKey === monthKey);
  },

  getMonthSummary: (monthKey) => {
    const transactions = get().getMonthTransactions(monthKey).filter(t => t.parentId !== 'SHARED');
    const incomes = get().getMonthIncomes(monthKey);

    const income = incomes.reduce((s, i) => s + i.amount, 0);
    // Cada filtro reconhece a categoria legada (modo simples) e a equivalente do modo detalhado
    const totalInvestments = transactions
      .filter((t) => t.category === 'Investimentos' || t.transactionType === 'investment')
      .reduce((s, t) => s + t.amount, 0);
    const totalFixed = transactions
      .filter((t) => t.category === 'Fixos' || t.recurrency === 'Fixo')
      .reduce((s, t) => s + t.amount, 0);
    const totalFood = transactions
      .filter((t) => t.category === 'Comida' || t.category === 'Alimentação')
      .reduce((s, t) => s + t.amount, 0);
    const totalPurchases = transactions
      .filter((t) => t.category === 'Compras' || t.category === 'Compras e bens')
      .reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.reduce((s, t) => s + t.amount, 0);
    const balance = income - totalExpenses;

    return { income, totalExpenses, totalInvestments, totalFixed, totalFood, totalPurchases, balance };
  },
}));
