'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import AmountInput from '@/components/transactions/AmountInput';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { useFinanceStore } from '@/lib/store';
import { formatCurrency } from '@/lib/currency';
import type { InvestmentOperation, SavingsGoal, Transaction } from '@/lib/types';

type Kind = 'monthly' | 'extra' | 'once' | 'yield' | 'withdraw';

/** Como cada tipo é gravado: a operação (aporte, resgate, rendimento) e a recorrência do lançamento */
const KINDS: Record<Kind, { label: string; operation: InvestmentOperation; recurrency: Transaction['recurrency']; hint: string }> = {
  monthly: { label: 'Aporte mensal', operation: 'Aporte', recurrency: 'Fixo', hint: 'O aporte combinado de todo mês.' },
  extra: { label: 'Aporte extraordinário', operation: 'Aporte', recurrency: 'Pontual', hint: 'Um valor a mais, fora do combinado (13º, PLR, bônus…).' },
  once: { label: 'Aporte avulso', operation: 'Aporte', recurrency: null, hint: 'Um aporte eventual.' },
  yield: { label: 'Rendimento', operation: 'Rendimento', recurrency: null, hint: 'Soma ao saldo, mas não conta como contribuição de ninguém.' },
  withdraw: { label: 'Resgate', operation: 'Resgate', recurrency: null, hint: 'Tira dinheiro da meta. É gravado como saída.' },
};

const kindOf = (t: Transaction): Kind => {
  if (t.operation === 'Rendimento') return 'yield';
  if (t.operation === 'Resgate' || t.amount < 0) return 'withdraw';
  if (t.recurrency === 'Fixo') return 'monthly';
  if (t.recurrency === 'Pontual') return 'extra';
  return 'once';
};

const todayIso = () => new Date().toISOString().slice(0, 10);

interface Props {
  goal: SavingsGoal;
  /** Aporte existente para editar; sem ele, cria um novo */
  existing?: Transaction | null;
  onClose: () => void;
}

/**
 * Registra, edita ou apaga um aporte (ou resgate, ou rendimento) de uma caixinha. O lançamento é uma
 * transação de Investimentos vinculada à meta, igual às criadas pelo formulário de transações.
 * Em meta compartilhada, o aporte novo também é gravado na planilha do dono.
 */
export default function ContributionModal({ goal, existing, onClose }: Props) {
  const { addTransaction, updateTransaction, deleteTransaction, contributeToSharedGoal, addAvailableMonth } = useFinanceStore();
  const [kind, setKind] = useState<Kind>(existing ? kindOf(existing) : 'monthly');
  const [raw, setRaw] = useState(existing ? String(Math.round(Math.abs(existing.amount) * 100)) : '');
  const [date, setDate] = useState(existing?.date?.slice(0, 10) ?? (existing ? `${existing.monthKey}-01` : todayIso()));
  const [note, setNote] = useState(existing && !/^(Aporte|Rendimento|Resgate)\b/.test(existing.name) ? existing.name : '');
  const [saving, setSaving] = useState(false);
  const swipeToClose = useSwipeToClose(onClose);

  const amount = (parseInt(raw.replace(/\D/g, ''), 10) || 0) / 100;
  const def = KINDS[kind];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !date) return;
    setSaving(true);
    try {
      const monthKey = date.slice(0, 7);
      addAvailableMonth(monthKey);
      const data = {
        name: note.trim() || def.label,
        amount: def.operation === 'Resgate' ? -amount : amount,
        category: 'Investimentos',
        subcategory: existing?.subcategory ?? null,
        transactionType: 'investment' as const,
        operation: def.operation,
        recurrency: def.recurrency ?? null,
        goalId: goal.id,
        monthKey,
        date,
        isPaid: true,
        installments: null, cardId: null, paymentMethod: null, nature: null, subTransactions: null,
      };
      if (existing) {
        await updateTransaction(existing.id, data);
      } else {
        await addTransaction(data);
        if (goal.isShared) {
          try {
            // o saldo da meta compartilhada é lido da planilha do dono: o aporte também precisa ir para lá
            await contributeToSharedGoal(goal.id, { ...data, recurrency: null });
          } catch (err) {
            alert(`O aporte foi salvo, mas não entrou na meta compartilhada. ${err instanceof Error ? err.message : err}`);
          }
        }
      }
      onClose();
    } catch (err) {
      alert(`Não foi possível salvar. ${err instanceof Error ? err.message : err}`);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing || !confirm(`Excluir este lançamento de ${formatCurrency(Math.abs(existing.amount))}?`)) return;
    setSaving(true);
    try { await deleteTransaction(existing.id); onClose(); } catch { alert('Erro ao excluir.'); setSaving(false); }
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 70 }} onClick={saving ? undefined : onClose}>
      <div className="modal-sheet animate-slide-in-sheet" onClick={(e) => e.stopPropagation()} style={swipeToClose.style}>
        <div {...swipeToClose.handlers} style={{ paddingBottom: 14, touchAction: 'none' }}>
          <div className="modal-handle" />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{existing ? 'Editar lançamento' : 'Novo aporte'}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{goal.name}</p>
        </div>

        <form onSubmit={save}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Tipo</label>
            <select className="form-input" value={kind} onChange={(e) => setKind(e.target.value as Kind)} disabled={saving}>
              {(Object.keys(KINDS) as Kind[]).map((k) => <option key={k} value={k}>{KINDS[k].label}</option>)}
            </select>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{def.hint}</p>
          </div>

          <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label className="form-label">Valor</label>
              <AmountInput rawAmount={raw} onChange={setRaw} allowCredit={false} disabled={saving} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label className="form-label">Data</label>
              <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={saving} required />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 6 }}>
            <label className="form-label">Descrição (opcional)</label>
            <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: Tesouro Selic, 13º salário" disabled={saving} />
          </div>
          {goal.isShared && !existing && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>Meta compartilhada: este aporte aparece com o seu nome para todos.</p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            {existing && (
              <button type="button" className="btn-ghost" onClick={remove} disabled={saving} style={{ color: 'var(--red)', background: 'var(--red-light)', padding: '13px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={15} /> Excluir
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving} style={{ flex: 1, padding: 13 }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving || amount <= 0} style={{ flex: 2, padding: 13 }}>{saving ? 'Salvando…' : existing ? 'Salvar' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
