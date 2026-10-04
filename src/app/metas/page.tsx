'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Target, AlertTriangle, Plus, Pencil, Trash2, CalendarClock, Users, TrendingUp } from 'lucide-react';

import Sidebar from '@/components/layout/Sidebar';
import GlassCard from '@/components/ui/GlassCard';
import SectionCard from '@/components/ui/SectionCard';
import ScrollArea from '@/components/ui/ScrollArea';
import ToolbarSelect from '@/components/ui/ToolbarSelect';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PendingEditModal from '@/components/transactions/PendingEditModal';
import GoalFormModal, { GoalData } from '@/components/goals/GoalFormModal';
import ShareGoalModal from '@/components/goals/ShareGoalModal';
import JoinGoalModal from '@/components/goals/JoinGoalModal';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency, monthKeyToShortLabel, toCanonicalMonthKey } from '@/lib/currency';
import { getGoalIconDef } from '@/lib/goalIcons';
import type { Pending, SavingsGoal, Transaction } from '@/lib/types';

export default function MetasPage() {
  const { pending, transactions, sharedGoalCopies, goals, deletePending, addGoal, updateGoal, deleteGoal, reconnectSharedGoal, loadingState } = useFinanceStore();
  const { data: session } = useSession();
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingToEdit, setPendingToEdit] = useState<Pending | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  
  // Goals Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<GoalData | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [goalToShare, setGoalToShare] = useState<SavingsGoal | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [reconnectingGoalId, setReconnectingGoalId] = useState<string | null>(null);

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
  
  // Metas de outra conta: os aportes vêm da planilha do dono (que já recebe a cópia dos feitos aqui),
  // então os lançamentos locais vinculados a elas saem da lista para não contar duas vezes.
  // Sem sincronização (sem acesso à planilha do dono), ficam os lançamentos locais.
  // Nas minhas metas, os aportes de convidados (sharedGoalCopies) somam junto com os meus.
  const syncedSharedGoalIds = new Set(goals.filter(g => g.isShared && g.sharedContributions).map(g => g.id));
  const investmentTxs = [
    ...[...transactions, ...sharedGoalCopies]
      .filter(t => t.category === 'Investimentos' && !(t.goalId && syncedSharedGoalIds.has(t.goalId))),
    ...goals.flatMap(g => (syncedSharedGoalIds.has(g.id) ? g.sharedContributions ?? [] : [])),
  ];

  // Metas com mais de uma pessoa: as compartilhadas comigo e as minhas que já receberam aporte de convidado
  const collaborativeGoalIds = new Set([
    ...syncedSharedGoalIds,
    ...investmentTxs.flatMap(t => (t.parentId === 'SHARED' && t.goalId ? [t.goalId] : [])),
  ]);

  // Quem fez o aporte (só nas metas com mais de uma pessoa). Sem autor gravado, o lançamento da minha planilha
  // é meu; cópia de convidado anterior à coluna Autor fica como "Convidado"
  const myName = session?.user?.name || session?.user?.email;
  const getContributor = (tx: Transaction) => {
    if (!tx.goalId || !collaborativeGoalIds.has(tx.goalId)) return null;
    const author = tx.author || (tx.parentId === 'SHARED' ? 'Convidado' : myName);
    if (author === myName) return 'Você';
    // Só o primeiro nome, para caber no mobile; autor gravado como e-mail mostra a parte antes do @
    return author?.trim().split(/\s+/)[0].split('@')[0] || author;
  };

  // Extrair todos os meses disponíveis nas transações para o dropdown
  const allAvailableMonths = Array.from(new Set([...transactions, ...investmentTxs].map(t => t.monthKey))).sort((a, b) => a.localeCompare(b));

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

  // Meta de outra conta sem acesso à planilha do dono: a pessoa a escolhe no seletor do Google
  const handleReconnectGoal = async (goalId: string) => {
    setReconnectingGoalId(goalId);
    try {
      if (!await reconnectSharedGoal(goalId)) {
        alert('Selecione a planilha de quem criou a meta para voltar a sincronizar.');
      }
    } catch (err) {
      alert(`Não foi possível liberar o acesso. ${err instanceof Error ? err.message : err}`);
    } finally {
      setReconnectingGoalId(null);
    }
  };

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

  // Função para calcular o total de uma meta (nas compartilhadas, investmentTxs já traz os aportes do dono)
  const getGoalCurrent = (goalId: string, initialCurrent: number) => {
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
            const goalPct = goal.target > 0 ? Math.min((actualCurrent / goal.target) * 100, 100) : 0;
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

                {/* Sem acesso à planilha do dono: valores podem estar desatualizados até liberar */}
                {goal.ownerAccessDenied && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    marginBottom: 16,
                    borderRadius: 12,
                    background: 'var(--orange-light)',
                  }}>
                    <AlertTriangle size={18} color="var(--orange)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', minWidth: 0 }}>
                      Sem acesso à planilha de quem criou a meta. Os valores podem estar desatualizados.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleReconnectGoal(goal.id)}
                      disabled={reconnectingGoalId === goal.id}
                      style={{ background: 'none', border: 'none', color: 'var(--orange)', cursor: 'pointer', padding: 4, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      {reconnectingGoalId === goal.id ? 'Abrindo…' : 'Liberar acesso'}
                    </button>
                  </div>
                )}

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


        <div className="metas-grid stagger">
          {/* Pending "A Resolver" */}
          {/* height 100%: o card preenche a linha da grade, mesma altura do Histórico ao lado */}
          {/* metas-pending: no mobile (1 coluna) fica por último, abaixo do Histórico */}
          <SectionCard icon={AlertTriangle} iconColor="var(--red)" title="A Resolver" className="animate-fade-in-up metas-pending" style={{ height: '100%' }}>
            <ScrollArea maxHeight={320}>
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
                      gap: 12,
                      padding: '12px 0',
                      borderBottom: '1px solid var(--separator)',
                    }}
                  >
                    {/* Linha única no mobile: o nome encurta com reticências, valor e ações não quebram */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div title={p.name} style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color: amountColor, fontSize: 16, whiteSpace: 'nowrap' }}>
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
            </ScrollArea>

            <div style={{ paddingTop: 24 }}>
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
          </SectionCard>

          {/* Histórico Geral de Investimentos do App */}
          <SectionCard
            icon={TrendingUp}
            iconColor="var(--green)"
            title="Histórico de Investimentos"
            description="Aportes registrados nas transações"
            className="animate-fade-in-up"
            style={{ height: '100%' }}
            actions={
              <ToolbarSelect
                value={startMonth}
                onChange={handleMonthChange}
                style={{ maxWidth: 240 }}
                aria-label="Período do histórico"
              >
                <option value="">Desde o primeiro aporte</option>
                {allAvailableMonths.map(mk => {
                  const [year, month] = mk.split('-').map(Number);
                  const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  return <option key={mk} value={mk}>A partir de {label.charAt(0).toUpperCase() + label.slice(1)}</option>;
                })}
              </ToolbarSelect>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {dynamicMonths.length === 0 && (
                <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
                  Nenhum investimento registrado.
                </div>
              )}

              <ScrollArea maxHeight={320}>
                {dynamicMonths.map((mk) => {
                // "nov/26" (o cabeçalho capitaliza: "Nov/26"), para não confundir o mesmo mês de anos diferentes
                const monthLabel = `${monthKeyToShortLabel(mk)}/${toCanonicalMonthKey(mk).slice(2, 4)}`;
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
                        const contributor = getContributor(tx);
                        const ItemIcon = contributor ? Users : Target;
                        return (
                          <div key={tx.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: 13,
                            color: 'var(--text-secondary)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                              <ItemIcon size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                                {itemLabel}
                              </span>
                              {contributor && (
                                <span style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  · {contributor}
                                </span>
                              )}
                            </div>
                            <span style={{ flexShrink: 0 }}>+{formatCurrency(tx.amount)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              </ScrollArea>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 8px 0', marginTop: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Total Exibido</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>{formatCurrency(totalHistoryFiltered)}</span>
              </div>
            </div>
          </SectionCard>
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

      {goals.length === 0 && !showFabMenu && (
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
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.01em' }}>Comece a poupar</h4>
          <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>Crie sua primeira meta para acompanhar a evolução dos seus investimentos.</p>
        </div>
      )}

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
