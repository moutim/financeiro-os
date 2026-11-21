'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useFinanceStore, CURRENT_MONTH_KEY } from '@/lib/store';
import {
  analyzeGoal, contributionCalendar, goalInsights, summarizeGoals, summarizePending,
  type GoalAnalysis, type GoalInsight, type PersonContext,
} from '@/lib/goalPlanning';
import type { ContributionPlan, SavingsGoal, Transaction } from '@/lib/types';

export interface GoalRow {
  goal: SavingsGoal;
  analysis: GoalAnalysis<Transaction>;
  ctx: PersonContext;
  plans: ContributionPlan[];
}

const CALENDAR_MONTHS = 12;
const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Tudo que a tela de Metas mostra, calculado em um lugar só (lib/goalPlanning).
 *
 * Quais transações compõem o saldo de uma meta: lançamentos de Investimentos vinculados a ela.
 * Meta de outra conta lê os aportes da planilha do dono (que já recebe a cópia dos feitos aqui),
 * então os lançamentos locais vinculados a ela saem para não contar duas vezes. Nas minhas metas,
 * os aportes de convidados (sharedGoalCopies) somam junto com os meus.
 */
export function useGoalsAnalysis() {
  const { goals, transactions, sharedGoalCopies, plans, pending } = useFinanceStore();
  const { data: session } = useSession();
  const myName = session?.user?.name || session?.user?.email || null;

  return useMemo(() => {
    const syncedShared = new Set(goals.filter((g) => g.isShared && g.sharedContributions).map((g) => g.id));
    const investmentTxs: Transaction[] = [
      ...[...transactions, ...sharedGoalCopies].filter((t) => t.category === 'Investimentos' && !(t.goalId && syncedShared.has(t.goalId))),
      ...goals.flatMap((g) => (syncedShared.has(g.id) ? g.sharedContributions ?? [] : [])),
    ];

    // Metas com mais de uma pessoa: as compartilhadas comigo e as minhas que já receberam aporte de convidado
    const collaborative = new Set([
      ...syncedShared,
      ...investmentTxs.flatMap((t) => (t.parentId === 'SHARED' && t.goalId ? [t.goalId] : [])),
    ]);

    const plansByGoal = new Map<string, ContributionPlan[]>();
    for (const p of plans) plansByGoal.set(p.goalId, [...(plansByGoal.get(p.goalId) ?? []), p]);

    const rows: GoalRow[] = goals.map((goal) => {
      const ctx: PersonContext = { myName, collaborative: collaborative.has(goal.id) };
      const goalPlans = plansByGoal.get(goal.id) ?? [];
      const analysis = analyzeGoal(
        { id: goal.id, name: goal.name, current: goal.current, target: goal.target, monthlyPrediction: goal.monthlyPrediction, deadline: goal.deadline, monthlyRate: goal.monthlyRate, paused: goal.paused, planStartMonth: goal.planStartMonth },
        investmentTxs.filter((t) => t.goalId === goal.id),
        goalPlans, ctx, CURRENT_MONTH_KEY,
      );
      return { goal, analysis, ctx, plans: goalPlans };
    });

    const goalIds = new Set(goals.map((g) => g.id));
    /** Investimentos que não pertencem a nenhuma meta (entram no histórico geral, sem saldo de meta) */
    const unlinked = investmentTxs.filter((t) => !t.goalId || !goalIds.has(t.goalId));

    const analyses = rows.map((r) => r.analysis);
    const active = rows.filter((r) => r.analysis.status !== 'completed' && r.analysis.status !== 'paused');
    const insights: GoalInsight[] = rows
      .flatMap((r) => goalInsights(r.analysis, CURRENT_MONTH_KEY))
      .sort((a, b) => b.weight - a.weight);

    return {
      currentMonth: CURRENT_MONTH_KEY,
      rows,
      unlinked,
      summary: summarizeGoals(analyses),
      calendar: contributionCalendar(
        active.map((r) => ({ id: r.goal.id, monthlyPrediction: 0 })),
        new Map(active.map((r) => [r.goal.id, r.analysis.plans])), CURRENT_MONTH_KEY, CALENDAR_MONTHS,
      ),
      pendingSummary: summarizePending(pending, todayIso()),
      insights,
      plansByGoal,
      myName,
    };
  }, [goals, transactions, sharedGoalCopies, plans, pending, myName]);
}
