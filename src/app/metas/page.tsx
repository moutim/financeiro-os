'use client';

import { useState, useEffect } from 'react';
import { Target, AlertTriangle, Plus, Pencil, Trash2, CalendarClock, Users } from 'lucide-react';

import Sidebar from '@/components/layout/Sidebar';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PendingEditModal from '@/components/transactions/PendingEditModal';
import GoalFormModal, { GoalData } from '@/components/goals/GoalFormModal';
import ShareGoalModal from '@/components/goals/ShareGoalModal';
import JoinGoalModal from '@/components/goals/JoinGoalModal';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import { getGoalIconDef } from '@/lib/goalIcons';
import type { Pending, SavingsGoal } from '@/lib/types';

export default function MetasPage() {
  const { pending, transactions, goals, deletePending, addGoal, updateGoal, deleteGoal, loadingState } = useFinanceStore();
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingToEdit, setPendingToEdit] = useState<Pending | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  
  // Goals Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<GoalData | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [goalToShare, setGoalToShare] = useState<SavingsGoal | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Filter state for Investment History
  const [startMonth, setStartMonth] = useState<string>('');
  
  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('finance-os-goals-start-month');
    if (saved) setStartMonth(saved);
  }, []);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setStartMonth(val);
    localStorage.setItem('finance-os-goals-start-month', val);
  };
  
  // Extrair todos os meses disponíveis nas transações para o dropdown
  const allAvailableMonths = Array.from(new Set(transactions.map(t => t.monthKey))).sort((a, b) => a.localeCompare(b));

  const investmentTxs = transactions.filter(t => t.category === 'Investimentos');
  const totalInvestedGlobal = investmentTxs.reduce((sum, tx) => sum + tx.amount, 0);

  // If no goals exist, we can render an empty state or a default one
  // For safety, the render below iterates over `goals`.

  async function handleDeletePending(id: string) {
    if (confirm('Tem certeza que deseja remover esta pendência?')) {
      try {
        await deletePending(id);
      } catch (e) {
        alert('Erro ao deletar');
      }
    }
  }

  const handleSaveGoal = async (goal: GoalData) => {
    try {
      if (goalToEdit || goals.find(g => g.id === goal.id)) {
        await updateGoal(goal.id, goal);
      } else {
        await addGoal(goal);
      }
      setShowGoalModal(false);
    } catch (err) {
      alert(String(err));
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteGoal(id);
      setShowGoalModal(false);
    } catch (err) {
      alert(String(err));
    }
  };

  const historyTxs = startMonth ? investmentTxs.filter(t => t.monthKey >= startMonth) : investmentTxs;

  const byMonth = historyTxs.reduce((acc, tx) => {
    acc[tx.monthKey] = (acc[tx.monthKey] || 0) + tx.amount;
    return acc;
  }, {} as Record<string, number>);
  const dynamicMonths = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));
  
  const totalHistoryFiltered = historyTxs.reduce((sum, tx) => sum + tx.amount, 0);

  // Função para calcular o total de uma meta
  const getGoalCurrent = (goalId: string, initialCurrent: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal?.isShared) {
      return initialCurrent; // Synced value is the absolute truth
    }
    const linkedTxs = investmentTxs.filter(t => t.goalId === goalId);
    const linkedSum = linkedTxs.reduce((sum, tx) => sum + tx.amount, 0);
    return initialCurrent + linkedSum;
  };

  if (loadingState === 'idle' || loadingState === 'loading') {
    return (
      <>
        <Sidebar />
        <main className="main-content">
          <LoadingSpinner message="Sincronizando com Google Sheets..." />
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 2 }}>
              Objetivos e Pendências
            </p>
            <h1 className="text-title-1">Metas</h1>
          </div>
        </div>

        {/* Goals List */}
        <div className="goals-grid">
          {goals.length === 0 && (
            <div style={{ padding: '20px', color: 'var(--text-tertiary)', background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--separator)' }}>
              Nenhuma meta cadastrada.
            </div>
          )}
          {goals.map((goal, index) => {
            const actualCurrent = getGoalCurrent(goal.id, goal.current);
            const goalPct = Math.min((actualCurrent / goal.target) * 100, 100);
            const remaining = goal.target - actualCurrent;
            
            // Predição de meses faltantes
            let predictionText = 'Sem previsão';
            if (remaining <= 0) {
              predictionText = 'Meta Concluída!';
            } else if (goal.monthlyPrediction > 0) {
              const monthsLeft = Math.ceil(remaining / goal.monthlyPrediction);
              predictionText = `Faltam ~${monthsLeft} meses guardando ${formatCurrency(goal.monthlyPrediction)}/mês`;
            }

            return (
              <GlassCard key={goal.id} className="stagger" style={{ animationDelay: `${index * 60}ms` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  {(() => {
                    const iconDef = getGoalIconDef(goal.icon, goal.name);
                    const GoalIcon = iconDef.icon;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: iconDef.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFF',
                          boxShadow: `0 4px 12px ${iconDef.bgColor}`,
                          flexShrink: 0,
                        }}>
                          <GoalIcon size={24} />
                        </div>
                        <div>
                          <h2 style={{ fontWeight: 700, fontSize: 18 }}>{goal.name}</h2>
                          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{iconDef.label}</p>
                        </div>
                      </div>
                    );
                  })()}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!goal.isShared && (
                      <button 
                        onClick={() => { setGoalToShare(goal); setShowShareModal(true); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4, fontSize: 13, fontWeight: 500 }}
                        title="Compartilhar Meta"
                      >
                        Compartilhar
                      </button>
                    )}
                    <button 
                      onClick={() => { setGoalToEdit(goal); setShowGoalModal(true); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}
                      title="Editar Meta"
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                </div>

                {/* Big Numbers */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>Guardado</p>
                    <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue)', letterSpacing: '-0.02em' }}>
                      {formatCurrency(actualCurrent)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>Meta</p>
                    <p style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em' }}>
                      {formatCurrency(goal.target)}
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: 12 }}>
                  <div className="progress-bar-track" style={{ height: 12 }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${goalPct}%`,
                        background: 'linear-gradient(90deg, var(--blue), var(--blue))',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 16 }}>
                  <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{goalPct.toFixed(1)}% concluído</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>Faltam {formatCurrency(remaining)}</span>
                </div>

                {/* Prediction Box */}
                <div style={{ 
                  background: 'var(--surface)', 
                  border: '1px solid var(--separator)', 
                  borderRadius: 12, 
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <CalendarClock size={20} color="var(--blue)" />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {predictionText}
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>


        <div className="metas-grid">
          {/* Pending "A Resolver" */}
          <GlassCard className="animate-fade-in-up" style={{ opacity: 0, animationDelay: '60ms', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'var(--red-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--red)',
              }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: 18 }}>A Resolver</h2>
              </div>
            </div>

            <div 
              style={{ 
                marginBottom: 16,
                maxHeight: 320, 
                overflowY: 'auto', 
                paddingRight: 8,
                paddingBottom: 8,
              }} 
              className="custom-scroll"
            >
              {pending.length === 0 && (
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>Nenhuma pendência.</p>
              )}
              {pending.map((p) => {
                const isPositive = p.amount > 0;
                const amountColor = isPositive ? 'var(--green)' : 'var(--red)';

                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid var(--separator)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontWeight: 700, color: amountColor, fontSize: 16 }}>
                        {isPositive ? '+' : ''}{formatCurrency(p.amount)}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => {
                            setPendingToEdit(p);
                            setShowPendingModal(true);
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeletePending(p.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>

            <div style={{ paddingTop: 8 }}>
                <button
                  onClick={() => {
                    setPendingToEdit(null);
                    setShowPendingModal(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'none',
                    border: 'none',
                    color: 'var(--blue)',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <Plus size={16} />
                  Adicionar item
                </button>
            </div>
          </GlassCard>

          {/* Histórico Geral de Investimentos do App */}
          <GlassCard className="animate-fade-in-up" style={{ opacity: 0, animationDelay: '120ms', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <h2 style={{ fontWeight: 700, fontSize: 18 }}>Histórico de Investimentos</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Aportes registrados nas transações</p>
                </div>
              </div>
              <select
                value={startMonth}
                onChange={handleMonthChange}
                className="form-select"
                style={{ 
                  padding: '8px 16px', 
                  fontSize: 13, 
                  borderRadius: 12, 
                  maxWidth: 240,
                  fontWeight: 500,
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--separator)'
                }}
              >
                <option value="">Desde o primeiro aporte</option>
                {allAvailableMonths.map(mk => {
                  const [year, month] = mk.split('-').map(Number);
                  const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  return <option key={mk} value={mk}>A partir de {label.charAt(0).toUpperCase() + label.slice(1)}</option>;
                })}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {dynamicMonths.length === 0 && (
                <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
                  Nenhum investimento registrado.
                </div>
              )}

              <div className="scroll-fade-container">
                <div 
                  style={{ 
                    maxHeight: 320, 
                    overflowY: 'auto', 
                    paddingRight: 8,
                    paddingBottom: 8,
                  }} 
                  className="custom-scroll"
                >
                {dynamicMonths.map((mk) => {
                const [year, month] = mk.split('-').map(Number);
                const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                const monthTxs = investmentTxs.filter(t => t.monthKey === mk);
                const monthTotal = byMonth[mk];

                return (
                  <div key={mk} style={{ 
                    padding: '16px 0', 
                    borderBottom: '1px solid var(--separator)' 
                  }}>
                    {/* Month Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>
                        {monthLabel}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                        {formatCurrency(monthTotal)}
                      </span>
                    </div>

                    {/* Transactions List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {monthTxs.map(tx => {
                        const goalName = tx.goalId ? goals.find(g => g.id === tx.goalId)?.name : null;
                        const itemLabel = goalName || tx.name;
                        return (
                          <div key={tx.id} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            fontSize: 13,
                            color: 'var(--text-secondary)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Target size={12} style={{ opacity: 0.5 }} />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                                {itemLabel}
                              </span>
                            </div>
                            <span>+{formatCurrency(tx.amount)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 8px 0', marginTop: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Total Exibido</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>{formatCurrency(totalHistoryFiltered)}</span>
              </div>
            </div>
          </GlassCard>
        </div>

      </main>
      
      {/* Overlay invisível para fechar o menu */}
      {showFabMenu && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 39 }}
          onClick={() => setShowFabMenu(false)}
        />
      )}

      {/* FAB Menu */}
      <div 
        className="fab-menu"
        style={{
          background: 'var(--surface)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: '1px solid var(--separator)',
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          transform: showFabMenu ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
          opacity: showFabMenu ? 1 : 0,
          pointerEvents: showFabMenu ? 'auto' : 'none',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          transformOrigin: 'bottom right'
        }}
      >
        <button
          onClick={() => {
            setShowFabMenu(false);
            setGoalToEdit(null);
            setShowGoalModal(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'none',
            border: 'none',
            padding: '12px 16px',
            textAlign: 'left',
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--text-primary)',
            borderRadius: 10,
            cursor: 'pointer',
            transition: 'background 0.2s',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'none'}
        >
          <Target size={18} color="var(--blue)" />
          Nova Meta
        </button>
        <button
          onClick={() => {
            setShowFabMenu(false);
            setShowJoinModal(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'none',
            border: 'none',
            padding: '12px 16px',
            textAlign: 'left',
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--text-primary)',
            borderRadius: 10,
            cursor: 'pointer',
            transition: 'background 0.2s',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'none'}
        >
          <Users size={18} color="var(--blue)" />
          Entrar em Meta
        </button>
      </div>

      {/* FAB - Estilo Padrão do Sistema */}
      <button 
        className="fab" 
        onClick={() => setShowFabMenu(!showFabMenu)} 
        aria-label="Opções de Meta"
        style={{
          transform: showFabMenu ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {showPendingModal && (
        <PendingEditModal
          pending={pendingToEdit}
          onClose={() => setShowPendingModal(false)}
        />
      )}

      {showGoalModal && (
        <GoalFormModal
          initialData={goalToEdit}
          onSave={handleSaveGoal}
          onClose={() => setShowGoalModal(false)}
          onDelete={handleDeleteGoal}
        />
      )}

      {showShareModal && goalToShare && (
        <ShareGoalModal
          goal={goalToShare}
          onClose={() => {
            setShowShareModal(false);
            setGoalToShare(null);
          }}
        />
      )}

      {showJoinModal && (
        <JoinGoalModal
          onClose={() => setShowJoinModal(false)}
        />
      )}
    </>
  );
}
