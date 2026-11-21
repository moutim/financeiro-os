'use client';

import { AlertTriangle, Info, Lightbulb, Sparkles, TrendingUp } from 'lucide-react';
import SectionCard from '@/components/ui/SectionCard';
import type { Insight, InsightTone } from '@/lib/projection/insights';
import { EmptyNote } from './shared';

const TONE: Record<InsightTone, { color: string; bg: string; icon: React.ReactNode }> = {
  risk: { color: 'var(--orange)', bg: 'var(--orange-light)', icon: <AlertTriangle size={16} /> },
  positive: { color: 'var(--green)', bg: 'var(--green-light)', icon: <TrendingUp size={16} /> },
  info: { color: 'var(--blue)', bg: 'var(--blue-light)', icon: <Info size={16} /> },
};

/** Insights calculados por regras sobre a projeção. Cada um mostra o número que o sustenta */
export default function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <SectionCard
      icon={Sparkles}
      title="Inteligência financeira"
      description="Leituras automáticas dos seus dados. Os números são calculados pelo app, sem estimativas inventadas"
    >
      {insights.length === 0 ? (
        <EmptyNote>Ainda não há dados suficientes para gerar insights. Lance salário, despesas e parcelas para começar.</EmptyNote>
      ) : (
        <div className="planning-insights">
          {insights.map((i) => {
            const tone = TONE[i.tone];
            return (
              <article key={i.id} className="planning-insight" style={{ '--tone': tone.color } as React.CSSProperties}>
                <header>
                  <span className="planning-insight-icon" style={{ background: tone.bg, color: tone.color }}>{tone.icon}</span>
                  <h3>{i.title}</h3>
                  <span className={`planning-badge is-${i.relevance === 'alta' ? 'high' : i.relevance === 'média' ? 'mid' : 'low'}`}>{i.relevance}</span>
                </header>
                <p>{i.description}</p>
                <footer>
                  <span>{i.period}</span>
                  <strong>{i.metric}</strong>
                </footer>
                {i.recommendation && (
                  <p className="planning-reco"><Lightbulb size={13} /> {i.recommendation}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
