'use client';

import { useState } from 'react';
import { Plus, Target, Users } from 'lucide-react';

import Sidebar from '@/components/layout/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PendingEditModal from '@/components/transactions/PendingEditModal';
import GoalFormModal, { GoalData, type GoalParticipant } from '@/components/goals/GoalFormModal';
import ShareGoalModal from '@/components/goals/ShareGoalModal';
import JoinGoalModal from '@/components/goals/JoinGoalModal';
import GoalBox from '@/components/goals/GoalBox';
import GoalsSummaryStrip from '@/components/goals/GoalsSummaryStrip';
import GoalDetailModal from '@/components/goals/GoalDetailModal';
import UpcomingContributions from '@/components/goals/UpcomingContributions';
import MovementsFeed from '@/components/goals/MovementsFeed';
import PendingPanel from '@/components/goals/PendingPanel';
import { useFinanceStore } from '@/lib/store';
import { useGoalsAnalysis } from '@/hooks/useGoalsAnalysis';
import type { Pending, SavingsGoal } from '@/lib/types';

/**
 * Metas como caixinhas: cada objetivo é um card com sua cor, o quanto já foi guardado e o plano.
 * Clicar numa caixinha abre o detalhamento (evolução, aportes, planejamento e simulador). Histórico,
 * próximos aportes e pendências ficam abaixo, em painéis menores. Os cálculos vivem em
 * lib/goalPlanning e chegam por useGoalsAnalysis.
 */
export default function MetasPage() {
  const { pending, goals, addGoal, updateGoal, deleteGoal, addPlan, reconnectSharedGoal, loadingState } = useFinanceStore();
  const analysis = useGoalsAnalysis();

  const [openGoalId, setOpenGoalId] = useState<string | null>(null);
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

  const handleSaveGoal = async (goal: GoalData, participants: GoalParticipant[]) => {
    try {
      if (goalToEdit || goals.find(g => g.id === goal.id)) {
        await updateGoal(goal.id, goal);
      } else {
        await addGoal(goal);
        // cada participante entra no plano com o aporte mensal que informou
        for (const p of participants) {
          await addPlan({ goalId: goal.id, person: p.person, kind: 'recorrente', amount: p.amount, fromMonth: goal.planStartMonth || analysis.currentMonth, toMonth: null });
        }
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
      setOpenGoalId((current) => (current === id ? null : current));
    } catch (err) {
      alert(String(err));
    }
  };

  const openNewGoal = () => { setGoalToEdit(null); setShowGoalModal(true); };

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

  const hasGoals = analysis.rows.length > 0;
  const openRow = analysis.rows.find((r) => r.goal.id === openGoalId) ?? null;
  const hasSecondary = hasGoals || analysis.unlinked.length > 0 || pending.length > 0;

  return (
    <>
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 2 }}>
              Objetivos e Pendências
            </p>
            <h1 className="text-title-1">Metas</h1>
          </div>
        </div>

        {hasGoals && <GoalsSummaryStrip summary={analysis.summary} />}

        {/* As caixinhas: o centro da página */}
        <section className="gb-grid" aria-label="Caixinhas de objetivos">
          {analysis.rows.map((row) => (
            <GoalBox key={row.goal.id} row={row} currentMonth={analysis.currentMonth} onOpen={() => setOpenGoalId(row.goal.id)} />
          ))}
          <button type="button" className={`gb-new${hasGoals ? '' : ' is-first'}`} onClick={openNewGoal}>
            <span><Plus size={22} strokeWidth={2.5} /></span>
            <b>{hasGoals ? 'Nova caixinha' : 'Crie sua primeira caixinha'}</b>
            {!hasGoals && <small>Uma viagem, uma reserva, a troca de carro… cada objetivo ganha o seu espaço para você acompanhar o quanto já guardou.</small>}
          </button>
        </section>

        <PendingPanel
          pending={pending}
          goals={goals}
          summary={analysis.pendingSummary}
          onAdd={() => { setPendingToEdit(null); setShowPendingModal(true); }}
          onEdit={(p) => { setPendingToEdit(p); setShowPendingModal(true); }}
        />

        {hasSecondary && (
          <div className="gb-secondary">
            <div className="gb-col-main">
              <MovementsFeed rows={analysis.rows} unlinked={analysis.unlinked} />
            </div>
            <div className="gb-col-side">
              {hasGoals && <UpcomingContributions calendar={analysis.calendar} rows={analysis.rows} />}
            </div>
          </div>
        )}
      </main>

      {openRow && (
        <GoalDetailModal
          row={openRow}
          currentMonth={analysis.currentMonth}
          onClose={() => setOpenGoalId(null)}
          onEditGoal={(goal) => { setGoalToEdit(goal); setShowGoalModal(true); }}
          onShareGoal={(goal) => { setGoalToShare(goal); setShowShareModal(true); }}
          onReconnect={handleReconnectGoal}
          reconnecting={reconnectingGoalId === openRow.goal.id}
        />
      )}

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
