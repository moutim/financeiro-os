'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import ToolbarSelect from '@/components/ui/ToolbarSelect';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency, monthKeyToLabel } from '@/lib/currency';
import type { LedgerEntry } from '@/lib/goalPlanning';
import type { GoalRow } from '@/hooks/useGoalsAnalysis';
import type { Transaction } from '@/lib/types';
import { pct, personColor, shortDate } from './format';

interface Props {
  row: GoalRow;
  onAdd: () => void;
  onEdit: (tx: Transaction) => void;
}

const typeLabel = (e: LedgerEntry): string => {
  if (e.kind === 'rendimento') return 'Rendimento';
  if (e.kind === 'resgate') return 'Resgate';
  if (e.tx.recurrency === 'Fixo') return 'Aporte mensal';
  if (e.tx.recurrency === 'Pontual') return 'Extraordinário';
  return 'Aporte';
};
const typeColor = (e: LedgerEntry) => (e.kind === 'rendimento' ? 'var(--teal)' : e.kind === 'resgate' ? 'var(--red)' : e.tx.recurrency === 'Pontual' ? 'var(--purple)' : 'var(--green)');

/**
 * Aportes da caixinha: quanto cada pessoa colocou e o histórico em ordem cronológica, agrupado por
 * mês. Lançamentos próprios de metas individuais podem ser editados; em meta compartilhada o saldo
 * vem da planilha de quem criou a meta, então a edição fica por lá.
 */
export default function GoalContributionsTab({ row, onAdd, onEdit }: Props) {
  const { goal, analysis: a } = row;
  const myTransactions = useFinanceStore((s) => s.transactions);
  const myIds = useMemo(() => new Set(myTransactions.map((t) => t.id)), [myTransactions]);
  const [person, setPerson] = useState('all');
  const people = a.persons.map((p) => p.person);

  const groups = useMemo(() => {
    const list = [...a.entries].reverse().filter((e) => person === 'all' || e.person === person);
    const map = new Map<string, LedgerEntry[]>();
    for (const e of list) map.set(e.tx.monthKey, [...(map.get(e.tx.monthKey) ?? []), e]);
    return [...map.entries()];
  }, [a.entries, person]);

  const canEdit = (e: LedgerEntry) => !goal.isShared && myIds.has(e.tx.id);

  return (
    <div className="gb-tab">
      {a.persons.length > 0 ? (
        <div className="gb-participants">
          <div className="gb-section-head">
            <h3>{row.ctx.collaborative ? 'Quanto cada um contribuiu' : 'Seus aportes'}</h3>
            <span className="gb-muted">Total em aportes <b>{formatCurrency(a.totals.contributed)}</b></span>
          </div>
          <ul>
            {a.persons.map((p) => (
              <li key={p.person}>
                <div className="gb-pp-top">
                  <span><i style={{ background: personColor(people, p.person) }} aria-hidden />{p.person}</span>
                  <b>{formatCurrency(p.contributed)}</b>
                </div>
                <div className="gb-bar is-slim"><span style={{ width: `${p.share * 100}%`, background: personColor(people, p.person) }} /></div>
                <small>
                  {pct(p.share * 100, 0)} dos aportes
                  {p.recurring > 0 && ` · mensal ${formatCurrency(p.recurring)}`}
                  {p.extraordinary > 0 && ` · extraordinário ${formatCurrency(p.extraordinary)}`}
                  {p.eventual > 0 && ` · avulso ${formatCurrency(p.eventual)}`}
                  {p.withdrawn > 0 && ` · resgatou ${formatCurrency(p.withdrawn)}`}
                </small>
              </li>
            ))}
          </ul>
          {!row.ctx.collaborative && <p className="gb-note">Convide alguém pelo botão Compartilhar para dividir esta meta: cada aporte guarda o nome de quem o fez.</p>}
        </div>
      ) : (
        <div className="gb-empty">
          <p>Nenhum aporte registrado nesta caixinha ainda.</p>
          <button type="button" className="btn-primary" onClick={onAdd}><Plus size={15} strokeWidth={2.5} /> Registrar o primeiro aporte</button>
        </div>
      )}

      {a.entries.length > 0 && (
        <>
          <div className="gb-section-head">
            <h3>Histórico</h3>
            {people.length > 1 && (
              <ToolbarSelect aria-label="Filtrar por pessoa" value={person} onChange={(e) => setPerson(e.target.value)}>
                <option value="all">Todos</option>
                {people.map((p) => <option key={p} value={p}>{p}</option>)}
              </ToolbarSelect>
            )}
          </div>
          {goal.isShared && <p className="gb-note" style={{ marginTop: 0 }}>Em meta compartilhada os aportes são lidos da planilha de quem criou a meta; edite por lá.</p>}
          <div className="gb-feed">
            {groups.map(([monthKey, list]) => (
              <section key={monthKey}>
                <h4><span>{monthKeyToLabel(monthKey)}</span><b>{formatCurrency(list.reduce((s, e) => s + e.signed, 0))}</b></h4>
                <ul>
                  {list.map((e) => (
                    <li key={e.tx.id}>
                      <span className="gb-feed-main">
                        <b>{e.tx.name}</b>
                        <small>{shortDate(e.tx.date)}{e.tx.date ? ' · ' : ''}{row.ctx.collaborative ? `${e.person} · ` : ''}<span style={{ color: typeColor(e), fontWeight: 600 }}>{typeLabel(e)}</span></small>
                      </span>
                      <span className="gb-feed-values">
                        <b style={{ color: e.signed < 0 ? 'var(--red)' : undefined }}>{e.signed < 0 ? '−' : '+'}{formatCurrency(Math.abs(e.signed))}</b>
                        <small>saldo {formatCurrency(e.balanceAfter)}</small>
                      </span>
                      {canEdit(e) && (
                        <button type="button" className="gb-icon-btn" onClick={() => onEdit(e.tx as Transaction)} aria-label="Editar lançamento"><Pencil size={14} /></button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {a.totals.initial > 0 && person === 'all' && (
              <p className="gb-feed-initial">Saldo inicial da meta <b>{formatCurrency(a.totals.initial)}</b></p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
