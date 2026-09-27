'use client';

import { AlertTriangle, Wallet, TrendingDown, TrendingUp, CheckCircle, Pencil, Trash2 } from 'lucide-react';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import StatCard from '@/components/ui/StatCard';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MonthSelector from '@/components/transactions/MonthSelector';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionForm from '@/components/transactions/TransactionForm';
import StartMonthWizard from '@/components/transactions/StartMonthWizard';
import IncomeEditModal from '@/components/transactions/IncomeEditModal';
import IncomeDeleteModal from '@/components/transactions/IncomeDeleteModal';
import SpendingDonut from '@/components/charts/SpendingDonut';
import MonthlyBar from '@/components/charts/MonthlyBar';
import CategoryBadge from '@/components/ui/CategoryBadge';
import { useFinanceStore } from '@/lib/store';
import { monthKeyToLabel, formatCurrency } from '@/lib/currency';
import { CATEGORY_CONFIG } from '@/lib/categories';
import type { Category, Income } from '@/lib/types';

const ALL_CATEGORIES = ['Todas', ...Object.keys(CATEGORY_CONFIG)] as const;

export default function DashboardPage() {
  const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingMonth, setIsDeletingMonth] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<Income | null>(null);

  const {
    selectedMonth,
    setSelectedMonth,
    getMonthSummary,
    getMonthTransactions,
    getMonthIncomes,
    loadingState,
    error,
    loadAll,
    deleteMonth,
    availableMonths,
  } = useFinanceStore();

  // ── Loading / Error states ─────────────────────────────────────────────
  if (loadingState === 'loading' || loadingState === 'idle') {
    return (
      <>
        <Sidebar />
        <main className="main-content">
          <LoadingSpinner message="Sincronizando com Google Sheets..." />
        </main>
      </>
    );
  }

  if (loadingState === 'error') {
    return (
      <>
        <Sidebar />
        <main className="main-content">
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--orange)' }}><AlertTriangle size={48} /></div>
            <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Erro ao carregar dados</h2>
            <p style={{ color: 'var(--text-tertiary)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
              {error ?? 'Não foi possível conectar ao Google Sheets.'}
            </p>
            <button className="btn-primary" onClick={() => loadAll()}>Tentar novamente</button>
          </div>
        </main>
      </>
    );
  }

  // ── Data ───────────────────────────────────────────────────────────────
  const summary = getMonthSummary(selectedMonth);
  const allTransactions = getMonthTransactions(selectedMonth);
  const allIncomes = getMonthIncomes(selectedMonth).sort((a, b) => b.amount - a.amount);
  const salarios: typeof allIncomes = [];
  const dividendos: typeof allIncomes = [];

  allIncomes.forEach(inc => {
    if (inc.isRecurring) {
      salarios.push(inc);
    } else {
      dividendos.push(inc);
    }
  });
  const isBalancePositive = summary.balance >= 0;
  // Consideramos que o mês precisa de configuração (exibir o banner) se ele não tem NENHUMA entrada recorrente E nenhuma despesa Fixa.
  // Isso permite que o banner apareça mesmo que o mês já tenha recebido algumas parcelas de compras do passado!
  const hasNoRecurring = salarios.length === 0;
  const hasNoFixed = allTransactions.filter(t => t.category === 'Fixos').length === 0;
  const isMonthMissingSetup = hasNoRecurring && hasNoFixed;
  const isCompletelyEmpty = allTransactions.length === 0 && allIncomes.length === 0;

  const chartData = availableMonths.map((mk) => {
    const s = getMonthSummary(mk);
    const [year, month] = mk.split('-').map(Number);
    const label = new Date(year, month - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return {
      month: label,
      expenses: Math.max(0, s.totalExpenses - s.totalInvestments),
      investments: s.totalInvestments,
      balance: s.balance,
    };
  });

  return (
    <>
      <Sidebar />
      <main className="main-content">

        {/* ── Top Header ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 2 }}>
              Controle Financeiro
            </p>
            <h1 className="text-title-1" style={{ textTransform: 'capitalize' }}>
              {monthKeyToLabel(selectedMonth)}
            </h1>
          </div>
        </div>

        {/* ── Month Selector ── */}
        <div style={{ marginBottom: 20 }}>
          <MonthSelector />
        </div>

        {/* ── KPI Cards ── */}
        <div className="stat-grid stagger" style={{ marginBottom: 20 }}>
          <StatCard icon={<Wallet size={24} />} label="Renda do mês"    value={summary.income}          color="var(--blue)"   bgColor="var(--blue-light)"   delay={0}   />
          <StatCard icon={<TrendingDown size={24} />} label="Total de gastos" value={summary.totalExpenses}   color="var(--orange)" bgColor="var(--orange-light)" delay={60}  />
          <StatCard icon={<TrendingUp size={24} />} label="Investimentos"   value={summary.totalInvestments} color="var(--green)"  bgColor="var(--green-light)"  delay={120} />
          <StatCard
            icon={isBalancePositive ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
            label="Sobra do mês"
            value={summary.balance}
            isNegative={!isBalancePositive}
            delay={180}
          />
        </div>

        {/* ── Mês Vazio CTA ── */}
        {isMonthMissingSetup && (
          <div className="animate-fade-in" style={{ background: 'var(--blue)', color: 'white', padding: 24, borderRadius: 16, marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'white' }}>Iniciando um novo mês?</h2>
            <p style={{ fontSize: 15, marginBottom: 16, opacity: 0.9, color: 'white' }}>
              Percebemos que <strong>{monthKeyToLabel(selectedMonth)}</strong> ainda não possui as suas despesas fixas ou salário. 
              Deseja importar as suas entradas e gastos fixos do mês anterior?
            </p>
            <button 
              className="btn-primary" 
              style={{ background: 'white', color: 'var(--blue)' }}
              onClick={() => setShowWizard(true)}
            >
              Copiar dados do mês anterior
            </button>
          </div>
        )}

        {/* ── Main 2-column layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>

          {/* ── LEFT COLUMN: Charts ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Donut chart */}
            <GlassCard>
              <h2 className="section-title" style={{ marginBottom: 16, fontSize: 17 }}>
                Por Categoria
              </h2>
              <SpendingDonut transactions={allTransactions} />
            </GlassCard>

            {/* Recebimentos & Extras */}
            <GlassCard>
              <h2 className="section-title" style={{ marginBottom: 16, fontSize: 17 }}>
                Recebimentos & Extras
              </h2>
              {dividendos.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Nenhum recebimento registrado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {dividendos.map((inc) => (
                    <div key={inc.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{inc.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>
                            +{formatCurrency(inc.amount)}
                          </span>
                          <button 
                            onClick={() => setEditingIncome(inc)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
                            title="Editar valor"
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            onClick={() => setDeletingIncome(inc)}
                            style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6, opacity: 0.7 }}
                            title="Remover"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {inc.subTransactions && inc.subTransactions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2, gap: 1 }}>
                          {inc.subTransactions.map((st, idx) => (
                            <span key={idx} style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              ↳ {st.name} • {formatCurrency(st.amount)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--separator)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600 }}>Total</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                      +{formatCurrency(dividendos.reduce((acc, curr) => acc + curr.amount, 0))}
                    </span>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Salário do Mês */}
            <GlassCard>
              <h2 className="section-title" style={{ marginBottom: 16, fontSize: 17 }}>
                Salário do Mês
              </h2>
              {salarios.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Nenhum salário registrado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {salarios.map((inc) => (
                    <div key={inc.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{inc.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>
                            +{formatCurrency(inc.amount)}
                          </span>
                          <button 
                            onClick={() => setEditingIncome(inc)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
                            title="Editar valor"
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            onClick={() => setDeletingIncome(inc)}
                            style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6, opacity: 0.7 }}
                            title="Remover"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {inc.subTransactions && inc.subTransactions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2, gap: 1 }}>
                          {inc.subTransactions.map((st, idx) => (
                            <span key={idx} style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              ↳ {st.name} • {formatCurrency(st.amount)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--separator)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 600 }}>Total Fixo</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                      +{formatCurrency(salarios.reduce((acc, curr) => acc + curr.amount, 0))}
                    </span>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>

          {/* ── RIGHT COLUMN: Transactions ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>


            {/* Transaction list card */}
            <GlassCard padding="0">
              {/* Sticky header inside card */}
              <div style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--separator)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <h2 style={{ fontSize: 17, fontWeight: 700 }}>Transações</h2>
              </div>
              <div style={{ padding: '0 20px' }}>
                <TransactionList transactions={allTransactions} showDelete />
              </div>
            </GlassCard>

            {/* Mini category breakdown */}
            <GlassCard padding="16px">
              <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>
                Resumo do Mês
              </h2>
              {(() => {
                const activeCategories = Object.keys(CATEGORY_CONFIG).map((catKey) => {
                  const config = CATEGORY_CONFIG[catKey];
                  const value = allTransactions
                    .filter(t => t.category === catKey)
                    .reduce((acc, t) => acc + t.amount, 0);
                  return { key: catKey, config, value };
                }).filter(cat => cat.value > 0);

                if (activeCategories.length === 0) {
                  return <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Nenhum gasto registrado neste mês.</p>;
                }

                return activeCategories.map((cat, index) => {
                  const isLast = index === activeCategories.length - 1;
                  return (
                    <div key={cat.key} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: isLast ? 'none' : '1px solid var(--separator)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ display: 'flex', alignItems: 'center', color: cat.config.color }}><cat.config.icon size={18} /></span>
                        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{cat.config.label}</span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: cat.config.color }}>{formatCurrency(cat.value)}</span>
                    </div>
                  );
                });
              })()}
            </GlassCard>
          </div>
        </div>

        {!isCompletelyEmpty && (
          <div style={{ marginTop: 40, paddingBottom: 40, textAlign: 'center' }}>
            <button 
              className="btn-ghost" 
              style={{ color: 'var(--red)', fontSize: 13, padding: '8px 16px', background: 'var(--red-light)' }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Apagar todos os registros deste mês
            </button>
          </div>
        )}
      </main>

      {/* FAB */}
      <button className="fab" onClick={() => setShowForm(true)} aria-label="Nova transação">+</button>

      {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
      {showWizard && <StartMonthWizard targetMonth={selectedMonth} onClose={() => setShowWizard(false)} />}
      {editingIncome && <IncomeEditModal income={editingIncome} onClose={() => setEditingIncome(null)} />}
      {deletingIncome && <IncomeDeleteModal income={deletingIncome} onClose={() => setDeletingIncome(null)} />}

      {showDeleteConfirm && (
        <div className="modal-overlay animate-fade-in" onClick={!isDeletingMonth ? () => setShowDeleteConfirm(false) : undefined}>
          <div
            className="modal-sheet animate-slide-in-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              padding: '32px 24px', 
              textAlign: 'center', 
              maxWidth: 360, 
              width: '90%', 
              margin: 'auto', 
              borderRadius: 24,
              marginTop: '30vh' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--red)', marginBottom: 16 }}>
              <AlertTriangle size={48} strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Excluir Mês?</h2>
            <p style={{ fontSize: 15, color: 'var(--text-tertiary)', marginBottom: 24, lineHeight: 1.4 }}>
              Você está prestes a apagar permanentemente todos os registros de <strong>{monthKeyToLabel(selectedMonth)}</strong>. Essa ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                className="btn-ghost" 
                onClick={() => setShowDeleteConfirm(false)} 
                disabled={isDeletingMonth}
                style={{ flex: 1, padding: '14px', opacity: isDeletingMonth ? 0.5 : 1 }}
              >
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                disabled={isDeletingMonth}
                onClick={async () => {
                  setIsDeletingMonth(true);
                  try {
                    await deleteMonth(selectedMonth);
                    setShowDeleteConfirm(false);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsDeletingMonth(false);
                  }
                }} 
                style={{ flex: 1, padding: '14px', background: 'var(--red)', color: 'white', opacity: isDeletingMonth ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {isDeletingMonth && <div className="btn-spinner" />}
                {isDeletingMonth ? 'Apagando...' : 'Apagar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
