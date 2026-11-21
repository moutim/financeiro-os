/**
 * Insights automáticos: regras sobre a projeção. Cada insight cita o número que o fundamenta;
 * nenhum texto é gerado sem dado por trás (sem salário de referência, a regra simplesmente não dispara).
 */
import type { CreditCard } from '@/lib/types';
import {
  addMonthsToKey,
  classifyCommitment,
  DEFAULT_BANDS,
  releaseSchedule,
  summarizeHistory,
  type CommitmentBands,
  type InstallmentPlan,
  type MonthProjection,
} from './engine.ts';

export type InsightRelevance = 'alta' | 'média' | 'baixa';
export type InsightTone = 'risk' | 'positive' | 'info';

export interface Insight {
  id: string;
  title: string;
  description: string;
  /** Período a que se refere ("Nov/26" ou "Dez/26 – Mar/27") */
  period: string;
  /** Valor ou percentual que sustenta a análise, já formatado */
  metric: string;
  relevance: InsightRelevance;
  tone: InsightTone;
  recommendation?: string;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const FULL_MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const shortMonth = (monthKey: string) => {
  const [y, m] = monthKey.split('-');
  return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`;
};
const longMonth = (monthKey: string) => FULL_MONTHS[Number(monthKey.split('-')[1]) - 1];

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const pct = (v: number) => `${v.toFixed(1).replace('.', ',')}%`;
const pp = (v: number) => `${Math.abs(v).toFixed(1).replace('.', ',')} p.p.`;

export interface InsightInput {
  /** Do primeiro mês com dados até o fim do horizonte (idealmente 12 meses à frente) */
  months: MonthProjection[];
  plans: InstallmentPlan[];
  cards: Pick<CreditCard, 'id' | 'name'>[];
  currentMonthKey: string;
  bands?: CommitmentBands;
}

const RELEVANCE_ORDER: Record<InsightRelevance, number> = { alta: 0, média: 1, baixa: 2 };

export function generateInsights(input: InsightInput): Insight[] {
  const { months, plans, cards, currentMonthKey, bands = DEFAULT_BANDS } = input;
  const insights: Insight[] = [];
  const current = months.find((m) => m.monthKey === currentMonthKey);
  const future = months.filter((m) => m.phase === 'future');
  const history = summarizeHistory(months);

  // 1. Comprometimento do mês atual
  if (current?.committedPct != null) {
    const level = classifyCommitment(current.committedPct, bands);
    if (level === 'high' || level === 'critical') {
      insights.push({
        id: 'current-commitment',
        title: 'Comprometimento elevado neste mês',
        description: `${pct(current.committedPct)} da renda líquida está comprometida em ${longMonth(current.monthKey)}. Restam ${brl(current.free ?? 0)} antes das despesas ainda não lançadas.`,
        period: shortMonth(current.monthKey),
        metric: pct(current.committedPct),
        relevance: level === 'critical' ? 'alta' : 'média',
        tone: 'risk',
        recommendation: 'Evite novos parcelamentos neste mês e reserve o valor livre para gastos variáveis.',
      });
    }
  }

  // 2. Liberação futura (encerramento de parcelas) — o mês com maior liberação nos próximos 12 meses
  const releases = releaseSchedule(plans, addMonthsToKey(currentMonthKey, 1), addMonthsToKey(currentMonthKey, 12));
  if (releases.length > 0) {
    const best = releases.reduce((a, b) => (b.monthlyRelease > a.monthlyRelease ? b : a));
    const n = best.plans.length;
    insights.push({
      id: 'release',
      title: 'Liberação futura de renda',
      description: `Em ${shortMonth(addMonthsToKey(best.monthKey, -1))}, ${n === 1 ? `a compra "${best.plans[0].name}" termina` : `${n} compras parceladas terminam`}, liberando ${brl(best.monthlyRelease)} por mês a partir de ${shortMonth(best.monthKey)}.`,
      period: shortMonth(best.monthKey),
      metric: brl(best.monthlyRelease),
      relevance: 'média',
      tone: 'positive',
      recommendation: 'Considere direcionar esse valor para reserva ou investimento assim que ele for liberado.',
    });
  }

  // 3. Concentração por cartão (faturas em aberto do mês atual em diante)
  const exposure = new Map<string, number>();
  for (const m of months) {
    if (m.phase === 'past') continue;
    for (const item of m.items) {
      if (item.cardId && !item.isPaid && item.source === 'recorded') exposure.set(item.cardId, (exposure.get(item.cardId) ?? 0) + item.amount);
    }
  }
  const totalExposure = [...exposure.values()].reduce((s, v) => s + v, 0);
  if (exposure.size > 1 && totalExposure > 0) {
    const [topId, topValue] = [...exposure.entries()].sort((a, b) => b[1] - a[1])[0];
    const share = (topValue / totalExposure) * 100;
    const name = cards.find((c) => c.id === topId)?.name;
    if (name && share >= 40) {
      insights.push({
        id: 'card-concentration',
        title: 'Concentração em um cartão',
        description: `O cartão ${name} representa ${pct(share)} das faturas em aberto (${brl(topValue)} de ${brl(totalExposure)}).`,
        period: 'Faturas em aberto',
        metric: pct(share),
        relevance: share >= 60 ? 'média' : 'baixa',
        tone: 'info',
        recommendation: 'Avalie distribuir novas compras entre os cartões para equilibrar fechamentos e limites.',
      });
    }
  }

  // 4. Evolução do comprometimento: histórico recente e projeção
  if (history.sufficient) {
    const pts = history.points;
    const recent = pts[pts.length - 1];
    const before = pts[Math.max(0, pts.length - 3)];
    const delta = (recent.committedPct ?? 0) - (before.committedPct ?? 0);
    if (Math.abs(delta) >= 3 && recent.monthKey !== before.monthKey) {
      const down = delta < 0;
      insights.push({
        id: 'history-trend',
        title: down ? 'Comprometimento em queda' : 'Comprometimento em alta',
        description: `O comprometimento ${down ? 'caiu' : 'subiu'} ${pp(delta)} entre ${shortMonth(before.monthKey)} (${pct(before.committedPct ?? 0)}) e ${shortMonth(recent.monthKey)} (${pct(recent.committedPct ?? 0)}).`,
        period: `${shortMonth(before.monthKey)} – ${shortMonth(recent.monthKey)}`,
        metric: `${down ? '−' : '+'}${pp(delta)}`,
        relevance: down ? 'baixa' : 'média',
        tone: down ? 'positive' : 'risk',
        recommendation: down ? undefined : 'Revise as compras parceladas recentes para entender o que puxou o aumento.',
      });
    }
  }
  const nowPct = current?.committedPct;
  const in3 = months.find((m) => m.monthKey === addMonthsToKey(currentMonthKey, 3));
  if (nowPct != null && in3?.committedPct != null && nowPct - in3.committedPct >= 3) {
    insights.push({
      id: 'projected-drop',
      title: 'Comprometimento projetado em queda',
      description: `Com os compromissos já lançados, o comprometimento cai ${pp(nowPct - in3.committedPct)} até ${shortMonth(in3.monthKey)} (de ${pct(nowPct)} para ${pct(in3.committedPct)}), porque parcelas antigas terminam.`,
      period: `${shortMonth(currentMonthKey)} – ${shortMonth(in3.monthKey)}`,
      metric: `−${pp(nowPct - in3.committedPct)}`,
      relevance: 'média',
      tone: 'positive',
    });
  }

  // 5. Risco futuro: mês acima da média histórica
  if (history.sufficient && history.averages.last6 != null) {
    const avg = history.averages.last6;
    const worst = future
      .filter((m) => m.committedPct != null && m.committedPct > avg + 5)
      .sort((a, b) => (b.committedPct ?? 0) - (a.committedPct ?? 0))[0];
    if (worst?.committedPct != null) {
      const level = classifyCommitment(worst.committedPct, bands);
      insights.push({
        id: 'future-risk',
        title: `${longMonth(worst.monthKey).replace(/^./, (c) => c.toUpperCase())} acima da sua média`,
        description: `${shortMonth(worst.monthKey)} tem comprometimento de ${pct(worst.committedPct)}, acima da sua média dos últimos meses (${pct(avg)}).`,
        period: shortMonth(worst.monthKey),
        metric: pct(worst.committedPct),
        relevance: level === 'critical' ? 'alta' : level === 'high' ? 'média' : 'baixa',
        tone: 'risk',
        recommendation: 'Evite concentrar novas compras parceladas nesse mês.',
      });
    }
  }

  // 6. Oportunidade: mês com a maior renda livre frente ao mês atual
  if (current?.free != null) {
    const best = future
      .filter((m) => m.free != null)
      .sort((a, b) => (b.free ?? 0) - (a.free ?? 0))[0];
    if (best?.free != null) {
      const gain = best.free - current.free;
      if (gain >= 100 && gain >= Math.abs(current.free) * 0.1) {
        insights.push({
          id: 'opportunity',
          title: 'Oportunidade de planejamento',
          description: `Em ${shortMonth(best.monthKey)}, sua renda livre estimada será ${brl(gain)} maior do que em ${shortMonth(current.monthKey)} (${brl(best.free)} contra ${brl(current.free)}).`,
          period: shortMonth(best.monthKey),
          metric: `+${brl(gain)}`,
          relevance: 'média',
          tone: 'positive',
          recommendation: 'É um bom período para planejar uma compra maior ou reforçar a poupança. Teste no simulador.',
        });
      }
    }
  }

  // 7. Transparência: o que a projeção não sabe
  const estimated = future.filter((m) => m.basis === 'estimated');
  const insufficient = future.filter((m) => m.basis === 'insufficient');
  if (estimated.length > 0) {
    insights.push({
      id: 'estimate-note',
      title: 'Parte da projeção usa recorrência',
      description: `${estimated.length} ${estimated.length === 1 ? 'mês usa' : 'meses usam'} o salário e as despesas fixas do último mês lançado como referência. Gastos variáveis ainda não lançados não estão incluídos, então a renda livre real tende a ser menor.`,
      period: `${shortMonth(estimated[0].monthKey)} – ${shortMonth(estimated[estimated.length - 1].monthKey)}`,
      metric: `${estimated.length} ${estimated.length === 1 ? 'mês' : 'meses'}`,
      relevance: 'baixa',
      tone: 'info',
    });
  }
  if (insufficient.length > 0 && estimated.length === 0 && !current?.income) {
    insights.push({
      id: 'no-salary',
      title: 'Sem salário de referência',
      description: 'Nenhum salário (renda recorrente) foi lançado, então percentuais e renda livre não podem ser calculados.',
      period: shortMonth(currentMonthKey),
      metric: '—',
      relevance: 'média',
      tone: 'info',
      recommendation: 'Lance seu salário como renda recorrente para habilitar a análise.',
    });
  }

  return insights.sort((a, b) => RELEVANCE_ORDER[a.relevance] - RELEVANCE_ORDER[b.relevance]);
}
