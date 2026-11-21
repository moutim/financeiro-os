'use client';

import { useState } from 'react';
import { Check, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import type { PendingSummary } from '@/lib/goalPlanning';
import type { Pending, SavingsGoal } from '@/lib/types';
import { shortDate } from './format';

interface Props {
  pending: Pending[];
  goals: SavingsGoal[];
  summary: PendingSummary;
  onAdd: () => void;
  onEdit: (p: Pending) => void;
}

/**
 * Valores a receber e a pagar ligados às metas. São só um controle: marcar como pago ou
 * recebido não muda o saldo de nenhuma meta. O saldo muda quando o aporte ou o resgate é lançado.
 */
export default function PendingPanel({ pending, goals, summary, onAdd, onEdit }: Props) {
  const { updatePending, deletePending } = useFinanceStore();
  const [showDone, setShowDone] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const visible = pending.filter((p) => showDone || p.status !== 'done');
  const toReceive = visible.filter((p) => p.amount > 0).sort(byDue);
  const toPay = visible.filter((p) => p.amount <= 0).sort(byDue);

  const toggle = async (p: Pending) => {
    try { await updatePending(p.id, { status: p.status === 'done' ? 'open' : 'done' }); } catch { alert('Erro ao atualizar.'); }
  };
  const remove = async (p: Pending) => {
    if (!confirm('Tem certeza que deseja remover esta pendência?')) return;
    try { await deletePending(p.id); } catch { alert('Erro ao deletar'); }
  };

  const renderGroup = (title: string, color: string, total: number, list: Pending[], paidWord: string) => (
    <div className="gx-pending-group">
      <h3 style={{ color }}>{title}<strong>{formatCurrency(total)}</strong></h3>
      {list.length === 0 ? <p className="cx-muted gx-pending-empty">Nada {title.toLowerCase() === 'a receber' ? 'a receber' : 'a pagar'}.</p> : (
        <ul>
          {list.map((p) => {
            const done = p.status === 'done';
            const overdue = !done && !!p.dueDate && p.dueDate.slice(0, 10) < today;
            const goalName = p.goalId ? goals.find((g) => g.id === p.goalId)?.name : null;
            const meta = [p.person, p.dueDate ? `${overdue ? 'venceu em' : 'previsto para'} ${shortDate(p.dueDate)}` : null, goalName ? `meta ${goalName}` : null].filter(Boolean).join(' · ');
            return (
              <li key={p.id} className={done ? 'is-done' : undefined}>
                <button type="button" className="gx-check" onClick={() => toggle(p)} aria-label={done ? 'Reabrir' : `Marcar como ${paidWord}`} title={done ? 'Reabrir' : `Marcar como ${paidWord}`}>
                  {done ? <RotateCcw size={14} /> : <Check size={14} />}
                </button>
                <span className="gx-pending-main">
                  <b title={p.name}>{p.name}</b>
                  {(meta || done) && <small style={{ color: overdue ? 'var(--red)' : undefined }}>{done ? `${paidWord === 'pago' ? 'Pago' : 'Recebido'}${meta ? ' · ' : ''}` : ''}{meta}</small>}
                </span>
                <span className="num" style={{ color }}>{formatCurrency(Math.abs(p.amount))}</span>
                <span className="gx-plan-actions">
                  <button type="button" onClick={() => onEdit(p)} aria-label="Editar"><Pencil size={14} /></button>
                  <button type="button" onClick={() => remove(p)} aria-label="Remover" style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <section className="gb-panel" aria-label="A resolver">
      <header className="gb-panel-head">
        <div>
          <h2>A Resolver</h2>
          <p>O que falta receber ou pagar. Não conta como dinheiro guardado nas metas.</p>
        </div>
        <button type="button" className="btn-secondary gb-add" onClick={onAdd}><Plus size={15} /> Adicionar</button>
      </header>

      {pending.length === 0 ? (
        <p className="gb-empty-line">Nada a resolver por aqui.</p>
      ) : (
        <>
          <div className="gx-pending">
            {renderGroup('A receber', 'var(--green)', summary.toReceive, toReceive, 'recebido')}
            {renderGroup('A pagar', 'var(--red)', summary.toPay, toPay, 'pago')}
          </div>
          <div className="gb-panel-foot">
            {summary.doneCount > 0 && (
              <label className="gx-inline-check"><input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Mostrar concluídas ({summary.doneCount})</label>
            )}
            {summary.overdueCount > 0 && <span className="cx-muted" style={{ fontSize: 12 }}>{summary.overdueCount} {summary.overdueCount === 1 ? 'vencida' : 'vencidas'}</span>}
          </div>
        </>
      )}
    </section>
  );
}

const byDue = (a: Pending, b: Pending) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
