'use client';

import {
  AlertTriangle, Wallet, TrendingDown, TrendingUp, CheckCircle, Pencil, Trash2, Check,
  ChartPie, HandCoins, Banknote, ReceiptText, ListTree, ClipboardList,
} from 'lucide-react';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import StatCard from '@/components/ui/StatCard';
import SectionCard from '@/components/ui/SectionCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MonthSelector from '@/components/transactions/MonthSelector';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionForm from '@/components/transactions/TransactionForm';
import StartMonthWizard from '@/components/transactions/StartMonthWizard';
import IncomeEditModal from '@/components/transactions/IncomeEditModal';
import IncomeDeleteModal from '@/components/transactions/IncomeDeleteModal';
import WelcomeTourModal from '@/components/ui/WelcomeTourModal';
import SpendingDonut from '@/components/charts/SpendingDonut';
import MonthlyBar from '@/components/charts/MonthlyBar';
import CategoryBadge from '@/components/ui/CategoryBadge';
import MonthSummaryList from '@/components/dashboard/MonthSummaryList';
import SpendingTree from '@/components/dashboard/SpendingTree';
import { useFinanceStore } from '@/lib/store';
import { useIsDetailedMode } from '@/lib/appConfigStore';
import { monthKeyToLabel, formatCurrency } from '@/lib/currency';
import type { Category, Income } from '@/lib/types';

export default function DashboardPage() {
  const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingMonth, setIsDeletingMonth] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<Income | null>(null);
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [showFabTooltip, setShowFabTooltip] = useState(false);

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
  const isDetailed = useIsDetailedMode();

  // Evaluate conditions for the welcome tour
  const allTx = getMonthTransactions(selectedMonth);
  const allInc = getMonthIncomes(selectedMonth);
  const isMonthEmpty = allTx.length === 0 && allInc.length === 0;
  const hasPastMonths = availableMonths.some(m => m < selectedMonth);

  // Tour para novos usuários
  useEffect(() => {
    if (loadingState === 'success' && isMonthEmpty && !hasPastMonths) {
      const hasSeenTour = localStorage.getItem('@financeiro-os:hasSeenWelcomeTour');
      
      if (!hasSeenTour) {
        setShowWelcomeTour(true);
      } else {
        setShowFabTooltip(true);
      }
    } else {
      setShowFabTooltip(false);
    }
  }, [loadingState, isMonthEmpty, hasPastMonths]);

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
  const hasNoFixed = allTransactions.filter(t => t.category === 'Fixos' || t.recurrency === 'Fixo').length === 0;
  const hasPreviousMonths = availableMonths.some(m => m < selectedMonth);
  const isMonthMissingSetup = hasNoRecurring && hasNoFixed && hasPreviousMonths;
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
          <StatCard 
            icon={<Wallet size={18} />} 
            label="Renda do mês"    
            value={summary.income}          
            delay={0}
          />
          <StatCard 
            icon={<TrendingDown size={18} />} 
            label="Total de gastos" 
            value={summary.totalExpenses}   
            delay={60}  
          />
          <StatCard 
            icon={<TrendingUp size={18} />} 
            label="Investimentos"   
            value={summary.totalInvestments} 
            delay={120} 
          />
          <StatCard
            icon={isBalancePositive ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
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
        <div className="dashboard-grid">

          {/* ── LEFT COLUMN: Charts ── */}
          <div className="dashboard-col" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Donut chart */}
            <SectionCard icon={ChartPie} title="Por Categoria" className="order-1">
              <SpendingDonut transactions={allTransactions} />
            </SectionCard>

            {/* Recebimentos & Extras */}
            <SectionCard icon={HandCoins} title="Recebimentos & Extras" className="order-3">
              {dividendos.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Nenhum recebimento registrado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {dividendos.map((inc, idx) => (
                    <div key={inc.id} className="transaction-item" style={{ 
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: 0,
                      filter: inc.isPaid ? 'opacity(0.8)' : 'none',
                      background: inc.isPaid ? 'var(--green-light)' : 'transparent',
                      padding: inc.isPaid ? '8px 12px' : '8px 0',
                      margin: inc.isPaid ? '2px -12px' : '0',
                      borderRadius: inc.isPaid ? 8 : 0,
                      borderBottom: inc.isPaid || idx === dividendos.length - 1 ? 'none' : undefined,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inc.name}</span>
                          {inc.isPaid && <Check size={14} color="var(--green)" style={{ marginLeft: 6, flexShrink: 0 }} />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
            </SectionCard>

            {/* Salário do Mês */}
            <SectionCard icon={Banknote} title="Salário do Mês" className="order-4">
              {salarios.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Nenhum salário registrado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {salarios.map((inc, idx) => (
                    <div key={inc.id} className="transaction-item" style={{ 
                      flexDirection: 'column', 
                      alignItems: 'stretch',
                      gap: 0,
                      filter: inc.isPaid ? 'opacity(0.8)' : 'none',
                      background: inc.isPaid ? 'var(--green-light)' : 'transparent',
                      padding: inc.isPaid ? '8px 12px' : '8px 0',
                      margin: inc.isPaid ? '0 -12px' : '0',
                      borderRadius: inc.isPaid ? 8 : 0,
                      borderBottom: inc.isPaid || idx === salarios.length - 1 ? 'none' : undefined,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inc.name}</span>
                          {inc.isPaid && <Check size={14} color="var(--green)" style={{ marginLeft: 6, flexShrink: 0 }} />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
            </SectionCard>
          </div>

          {/* ── RIGHT COLUMN: Transactions ── */}
          <div className="dashboard-col" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>


            {/* Transaction list card */}
            <SectionCard icon={ReceiptText} title="Transações" className="order-2">
              <TransactionList transactions={allTransactions} showDelete />
            </SectionCard>

            {/* Resumo do mês: lista por categoria (simples) ou árvore Macro › Micro (detalhado) */}
            <SectionCard
              icon={isDetailed ? ListTree : ClipboardList}
              title={isDetailed ? 'Análise de Gastos (Macro › Micro)' : 'Resumo do Mês'}
              className="order-5"
            >
              {isDetailed
                ? <SpendingTree transactions={allTransactions} />
                : <MonthSummaryList transactions={allTransactions} />}
            </SectionCard>
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

      {/* FAB and Tooltip */}
      <button 
        className="fab" 
        onClick={() => setShowForm(true)} 
        aria-label="Nova transação"
      >
        +
      </button>

      {showFabTooltip && (
        <div 
          className="fab-menu animate-fade-in-up" 
          style={{
            background: 'var(--blue)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: 14,
            boxShadow: 'var(--shadow-lg)',
            width: '240px',
            pointerEvents: 'none',
            animationDelay: '500ms',
            animationFillMode: 'both'
          }}
        >
          {/* Seta apontando pro botão */}
          <div style={{ position: 'absolute', bottom: -5, right: 22, width: 12, height: 12, background: 'var(--blue)', transform: 'rotate(45deg)', borderRadius: 2 }} />
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.01em' }}>Comece por aqui</h4>
          <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>Adicione seu salário ou saldo inicial para começar o mês com o pé direito.</p>
        </div>
      )}

      {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
      {showWizard && <StartMonthWizard targetMonth={selectedMonth} onClose={() => setShowWizard(false)} />}
      {editingIncome && <IncomeEditModal income={editingIncome} onClose={() => setEditingIncome(null)} />}
      {deletingIncome && <IncomeDeleteModal income={deletingIncome} onClose={() => setDeletingIncome(null)} />}
      
      {showWelcomeTour && (
        <WelcomeTourModal onClose={() => {
          localStorage.setItem('@financeiro-os:hasSeenWelcomeTour', 'true');
          setShowWelcomeTour(false);
          setTimeout(() => setShowFabTooltip(true), 1000);
        }} />
      )}

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
