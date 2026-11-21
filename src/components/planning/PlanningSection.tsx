'use client';

import { useMemo, useState } from 'react';
import { addMonthsToKey, compareScenario, type PurchaseSimulation } from '@/lib/projection/engine';
import { generateInsights } from '@/lib/projection/insights';
import CommitmentCalendar from './CommitmentCalendar';
import CommitmentChart from './CommitmentChart';
import FreeIncomeChart from './FreeIncomeChart';
import HistoryChart from './HistoryChart';
import InsightsPanel from './InsightsPanel';
import InstallmentTimeline from './InstallmentTimeline';
import PurchaseSimulator from './PurchaseSimulator';
import SummaryStrip from './SummaryStrip';
import { useBands, useProjectionData, type Horizon } from './shared';
import type { TransactionFormPrefill } from '@/components/transactions/formPrefill';

interface Props {
  /** Abre o cadastro de transações já existente com a compra preenchida */
  onConfirmPurchase: (prefill: TransactionFormPrefill) => void;
}

/**
 * Planejamento financeiro do Dashboard: projeção temporal da renda comprometida.
 * Concentra o estado de tela (horizontes, mês selecionado, simulação); os cálculos
 * vivem em lib/projection e os dados vêm do store, sem persistir nada novo.
 */
export default function PlanningSection({ onConfirmPurchase }: Props) {
  const { input, months, plans, cards, currentMonthKey } = useProjectionData();
  const [bands, setBands] = useBands();
  const [commitHorizon, setCommitHorizon] = useState<Horizon>(12);
  const [freeHorizon, setFreeHorizon] = useState<Horizon>(12);
  const [selected, setSelected] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<PurchaseSimulation | null>(null);

  // Cenário com a compra simulada: só em memória, nunca vai para a planilha
  const scenario = useMemo(() => (simulation ? compareScenario(input, simulation) : null), [input, simulation]);
  const scenarioMonths = useMemo(() => scenario?.months.map((m) => m.withPurchase) ?? null, [scenario]);
  const shownMonths = scenarioMonths ?? months;
  const baseMonths = scenario ? scenario.months.map((m) => m.base) : null;

  const current = shownMonths.find((m) => m.monthKey === currentMonthKey);
  const futureInstallments = useMemo(
    () => plans.flatMap((p) => p.rows).filter((r) => r.monthKey > currentMonthKey && !r.isPaid).reduce((s, r) => s + r.amount, 0),
    [plans, currentMonthKey],
  );
  const insights = useMemo(
    () => generateInsights({ months: shownMonths.filter((m) => m.monthKey <= addMonthsToKey(currentMonthKey, 12)), plans, cards, currentMonthKey, bands }),
    [shownMonths, plans, cards, currentMonthKey, bands],
  );

  const hasData = input.transactions.length > 0 || input.incomes.length > 0;
  if (!hasData) return null;

  const toggle = (monthKey: string) => setSelected((prev) => (prev === monthKey ? null : monthKey));

  return (
    <div className="planning" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
      <SummaryStrip current={current} currentMonthKey={currentMonthKey} futureInstallments={futureInstallments} bands={bands} />

      <CommitmentChart
        months={shownMonths} currentMonthKey={currentMonthKey} horizon={commitHorizon} onHorizon={setCommitHorizon}
        selected={selected} onSelect={toggle} bands={bands} cards={cards} simulating={!!simulation}
      />

      <HistoryChart months={months} />

      <FreeIncomeChart
        months={shownMonths} baseMonths={baseMonths} plans={plans} currentMonthKey={currentMonthKey}
        horizon={freeHorizon} onHorizon={setFreeHorizon} selected={selected} onSelect={toggle}
      />

      <InstallmentTimeline plans={plans} cards={cards} currentMonthKey={currentMonthKey} />

      <PurchaseSimulator
        input={input} cards={cards} currentMonthKey={currentMonthKey}
        applied={simulation} onApply={setSimulation}
        onConfirm={(sim) => onConfirmPurchase({
          name: sim.name === 'Nova compra' ? '' : sim.name,
          amount: sim.total, installments: sim.installments, cardId: sim.cardId, monthKey: sim.firstMonthKey,
        })}
      />

      <CommitmentCalendar months={shownMonths} currentMonthKey={currentMonthKey} bands={bands} onBands={setBands} cards={cards} />

      <InsightsPanel insights={insights} />
    </div>
  );
}
