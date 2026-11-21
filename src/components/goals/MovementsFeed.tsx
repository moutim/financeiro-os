'use client';

import { useMemo, useState } from 'react';
import ToolbarSelect from '@/components/ui/ToolbarSelect';
import ScrollArea from '@/components/ui/ScrollArea';
import { useAppConfigStore } from '@/lib/appConfigStore';
import { formatCurrency, monthKeyToLabel } from '@/lib/currency';
import { contributorOf, movementKind, signedAmount, type MovementKind } from '@/lib/goalPlanning';
import type { GoalRow } from '@/hooks/useGoalsAnalysis';
import type { Transaction } from '@/lib/types';
import { goalColor, shortDate } from './format';

const KIND_LABEL: Record<MovementKind, string> = { aporte: 'Aporte', resgate: 'Resgate', rendimento: 'Rendimento' };
const KIND_COLOR: Record<MovementKind, string> = { aporte: 'var(--green)', resgate: 'var(--red)', rendimento: 'var(--teal)' };
const NO_GOAL = '__none__';

interface Item {
  tx: Transaction;
  goalId: string | null;
  goalName: string;
  color: string;
  person: string;
  kind: MovementKind;
  signed: number;
  extra: boolean;
}

/**
 * Histórico de aportes em lista cronológica, agrupada por mês. Filtra por meta, participante e pelo
 * mês inicial (preferência salva na planilha). Cada linha traz data, valor, responsável, meta e tipo.
 */
export default function MovementsFeed({ rows, unlinked }: { rows: GoalRow[]; unlinked: Transaction[] }) {
  const startMonth = useAppConfigStore((s) => s.goalsHistoryStartMonth);
  const setStartMonth = useAppConfigStore((s) => s.setGoalsHistoryStartMonth);
  const [goalFilter, setGoalFilter] = useState('all');
  const [person, setPerson] = useState('all');

  const all: Item[] = useMemo(() => [
    ...rows.flatMap((r) => r.analysis.entries.map((e): Item => ({
      tx: e.tx, goalId: r.goal.id, goalName: r.goal.name, color: goalColor(r.goal), person: e.person, kind: e.kind, signed: e.signed, extra: e.tx.recurrency === 'Pontual',
    }))),
    ...unlinked.map((tx): Item => ({
      tx, goalId: null, goalName: 'Sem meta', color: 'var(--text-tertiary)', person: contributorOf(tx, { collaborative: false }), kind: movementKind(tx), signed: signedAmount(tx), extra: false,
    })),
  ].sort((a, b) => `${b.tx.date ?? b.tx.monthKey}|${b.tx.id}`.localeCompare(`${a.tx.date ?? a.tx.monthKey}|${a.tx.id}`)), [rows, unlinked]);

  const people = useMemo(() => [...new Set(all.map((m) => m.person))], [all]);
  const months = useMemo(() => [...new Set(all.map((m) => m.tx.monthKey))].sort(), [all]);
  const filtered = useMemo(() => all.filter((m) =>
    (!startMonth || m.tx.monthKey >= startMonth)
    && (goalFilter === 'all' || (goalFilter === NO_GOAL ? m.goalId === null : m.goalId === goalFilter))
    && (person === 'all' || m.person === person)), [all, startMonth, goalFilter, person]);

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const m of filtered) map.set(m.tx.monthKey, [...(map.get(m.tx.monthKey) ?? []), m]);
    return [...map.entries()];
  }, [filtered]);
  const total = filtered.reduce((s, m) => s + m.signed, 0);

  return (
    <section className="gb-panel" aria-label="Histórico de aportes">
      <header className="gb-panel-head">
        <div><h2>Histórico de aportes</h2><p>Aportes, rendimentos e resgates, do mais recente para o mais antigo.</p></div>
        <div className="gb-filters">
          <ToolbarSelect aria-label="Filtrar por meta" value={goalFilter} onChange={(e) => setGoalFilter(e.target.value)}>
            <option value="all">Todas as metas</option>
            {rows.map((r) => <option key={r.goal.id} value={r.goal.id}>{r.goal.name}</option>)}
            {unlinked.length > 0 && <option value={NO_GOAL}>Sem meta</option>}
          </ToolbarSelect>
          {people.length > 1 && (
            <ToolbarSelect aria-label="Filtrar por participante" value={person} onChange={(e) => setPerson(e.target.value)}>
              <option value="all">Todos</option>
              {people.map((p) => <option key={p} value={p}>{p}</option>)}
            </ToolbarSelect>
          )}
          <ToolbarSelect aria-label="Período do histórico" value={startMonth} onChange={(e) => setStartMonth(e.target.value)}>
            <option value="">Desde o início</option>
            {months.map((m) => <option key={m} value={m}>A partir de {monthKeyToLabel(m)}</option>)}
          </ToolbarSelect>
        </div>
      </header>

      {filtered.length === 0 ? (
        <p className="gb-empty-line">{all.length === 0 ? 'Nenhum aporte registrado ainda.' : 'Nenhum lançamento com esses filtros.'}</p>
      ) : (
        <>
          <ScrollArea maxHeight={440}>
            <div className="gb-feed">
              {groups.map(([monthKey, list]) => (
                <section key={monthKey}>
                  <h4><span>{monthKeyToLabel(monthKey)}</span><b>{formatCurrency(list.reduce((s, m) => s + m.signed, 0))}</b></h4>
                  <ul>
                    {list.map((m) => (
                      <li key={m.tx.id}>
                        <i className="gb-dot" style={{ background: m.color }} aria-hidden />
                        <span className="gb-feed-main">
                          <b>{m.goalName}</b>
                          <small>
                            {shortDate(m.tx.date)}{m.tx.date ? ' · ' : ''}{m.person} · <span style={{ color: m.extra ? 'var(--purple)' : KIND_COLOR[m.kind], fontWeight: 600 }}>{m.extra ? 'Extraordinário' : KIND_LABEL[m.kind]}</span>
                          </small>
                        </span>
                        <b className="gb-feed-amount" style={{ color: m.signed < 0 ? 'var(--red)' : undefined }}>{m.signed < 0 ? '−' : '+'}{formatCurrency(Math.abs(m.signed))}</b>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </ScrollArea>
          <p className="gb-panel-foot-note">Total exibido <b>{formatCurrency(total)}</b></p>
        </>
      )}
    </section>
  );
}
