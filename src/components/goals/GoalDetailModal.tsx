'use client';

import { useState } from 'react';
import { AlertTriangle, ListChecks, Pencil, Plus, Receipt, Share2, SlidersHorizontal, Wallet, X } from 'lucide-react';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { formatCurrency } from '@/lib/currency';
import { getGoalIconDef } from '@/lib/goalIcons';
import { monthLong } from '@/lib/goalPlanning';
import type { GoalRow } from '@/hooks/useGoalsAnalysis';
import type { SavingsGoal } from '@/lib/types';
import ContributionModal from './ContributionModal';
import GoalContributionsTab from './GoalContributionsTab';
import GoalOverviewTab from './GoalOverviewTab';
import GoalPlanTab from './GoalPlanTab';
import GoalSimulatorTab from './GoalSimulatorTab';
import { GOAL_STATE_LABEL, goalColor, goalState, pct, shortMonth } from './format';

const TABS = [
  { id: 'overview', label: 'Visão geral', icon: Wallet },
  { id: 'contributions', label: 'Aportes', icon: Receipt },
  { id: 'plan', label: 'Planejamento', icon: ListChecks },
  { id: 'simulator', label: 'Simulador', icon: SlidersHorizontal },
] as const;
type TabId = (typeof TABS)[number]['id'];

interface Props {
  row: GoalRow;
  currentMonth: string;
  onClose: () => void;
  onEditGoal: (goal: SavingsGoal) => void;
  onShareGoal: (goal: SavingsGoal) => void;
  onReconnect: (goalId: string) => void;
  reconnecting: boolean;
}

/**
 * Detalhamento de uma caixinha em um modal amplo: identidade e progresso no topo, e abas com
 * visão geral (evolução), aportes (registrar, editar, participação), planejamento e simulador.
 */
export default function GoalDetailModal({ row, currentMonth, onClose, onEditGoal, onShareGoal, onReconnect, reconnecting }: Props) {
  const { goal, analysis: a } = row;
  const [tab, setTab] = useState<TabId>('overview');
  const [contribution, setContribution] = useState<{ existing: import('@/lib/types').Transaction | null } | null>(null);
  const swipeToClose = useSwipeToClose(onClose);
  const color = goalColor(goal);
  const def = getGoalIconDef(goal.icon, goal.name);
  const Icon = def.icon;
  const state = goalState(a.status);

  return (
    <>
      <div className="modal-overlay animate-fade-in" onClick={onClose}>
        <div
          className="modal-sheet gb-modal animate-slide-in-sheet"
          style={{ ...swipeToClose.style, '--gc': color } as React.CSSProperties}
          onClick={(e) => e.stopPropagation()}
          role="dialog" aria-modal="true" aria-label={`Meta ${goal.name}`}
        >
          {/* Identidade e progresso */}
          <div className="gb-modal-top" {...swipeToClose.handlers} style={{ touchAction: 'none' }}>
            <div className="modal-handle" />
            <div className="gb-modal-title">
              <span className="gb-icon" aria-hidden><Icon size={24} /></span>
              <div>
                <h2>{goal.name}</h2>
                <p>{goal.category || def.label} · <span className={`gb-state is-${state}`}>{GOAL_STATE_LABEL[state]}</span></p>
              </div>
              <button type="button" className="gb-close" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
            </div>
            {goal.notes && <p className="gb-notes">{goal.notes}</p>}

            <div className="gb-modal-money">
              <strong>{formatCurrency(a.totals.balance)}</strong>
              <span>de {formatCurrency(goal.target)} · {pct(a.pct, a.pct >= 10 ? 0 : 1)}</span>
            </div>
            <div className="gb-bar is-thick" role="progressbar" aria-valuenow={Math.round(a.pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso">
              <span style={{ width: `${a.pct}%` }} />
            </div>
            <dl className="gb-modal-facts">
              <div><dt>Falta</dt><dd>{a.remaining > 0 ? formatCurrency(a.remaining) : 'Atingida'}</dd></div>
              <div><dt>Prazo</dt><dd>{goal.deadline ? shortMonth(goal.deadline) : 'sem prazo'}</dd></div>
              <div><dt>Previsão</dt><dd>{state === 'completed' ? 'Concluída' : state === 'paused' ? 'Pausada' : a.projection.reachedMonth ? monthLong(a.projection.reachedMonth) : 'sem previsão'}</dd></div>
            </dl>
          </div>

          {goal.ownerAccessDenied && (
            <div className="gx-warning" role="alert">
              <AlertTriangle size={16} aria-hidden />
              <span>Sem acesso à planilha de quem criou a meta. Os valores podem estar desatualizados.</span>
              <button type="button" onClick={() => onReconnect(goal.id)} disabled={reconnecting}>{reconnecting ? 'Abrindo…' : 'Liberar acesso'}</button>
            </div>
          )}

          <div className="gb-modal-bar">
            <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />
            <div className="gb-modal-actions">
              <button type="button" className="btn-primary" onClick={() => setContribution({ existing: null })}><Plus size={15} strokeWidth={2.5} /> Novo aporte</button>
              {!goal.isShared && <button type="button" className="btn-ghost" onClick={() => onShareGoal(goal)}><Share2 size={14} /> Compartilhar</button>}
              <button type="button" className="btn-ghost" onClick={() => onEditGoal(goal)}><Pencil size={14} /> Editar</button>
            </div>
          </div>

          <div className="gb-modal-body">
            {tab === 'overview' && <GoalOverviewTab row={row} currentMonth={currentMonth} />}
            {tab === 'contributions' && <GoalContributionsTab row={row} onAdd={() => setContribution({ existing: null })} onEdit={(tx) => setContribution({ existing: tx })} />}
            {tab === 'plan' && <GoalPlanTab row={row} currentMonth={currentMonth} />}
            {tab === 'simulator' && <GoalSimulatorTab row={row} currentMonth={currentMonth} />}
          </div>
        </div>
      </div>

      {contribution && <ContributionModal goal={goal} existing={contribution.existing} onClose={() => setContribution(null)} />}
    </>
  );
}
