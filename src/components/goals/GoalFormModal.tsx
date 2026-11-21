'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { formatMask, parseMask } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { GOAL_ICONS, getGoalIconDef } from '@/lib/goalIcons';
import { GOAL_CATEGORIES, GOAL_COLORS } from './format';

export interface GoalData {
  id: string;
  name: string;
  current: number;
  target: number;
  monthlyPrediction: number;
  icon?: string | null;
  /** Prazo desejado ("YYYY-MM") */
  deadline?: string | null;
  /** Descrição da meta */
  notes?: string | null;
  /** Rendimento estimado em % ao mês; vazio = projeção sem rendimentos */
  monthlyRate?: number | null;
  /** Data de criação (ISO yyyy-mm-dd), definida ao criar */
  createdAt?: string | null;
  color?: string | null;
  category?: string | null;
  paused?: boolean;
  planStartMonth?: string | null;
}

/** Participante que já nasce com um aporte mensal planejado (só na criação) */
export interface GoalParticipant {
  person: string;
  amount: number;
}

interface GoalFormModalProps {
  initialData?: GoalData | null;
  onSave: (data: GoalData, participants: GoalParticipant[]) => void | Promise<void>;
  onClose: () => void;
  onDelete?: (id: string) => void | Promise<void>;
}

interface ParticipantDraft { name: string; raw: string }

const cents = (raw: string) => (parseInt(raw || '0', 10) || 0) / 100;
const toRaw = (v?: number | null) => (v ? String(Math.round(v * 100)) : '');

/** Criar ou editar uma caixinha: identidade (nome, ícone, cor, categoria), valores, prazo e participantes */
export default function GoalFormModal({ initialData, onSave, onClose, onDelete }: GoalFormModalProps) {
  const isEditing = !!initialData;
  const [name, setName] = useState(initialData?.name ?? '');
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [category, setCategory] = useState(initialData?.category ?? '');
  const [selectedIcon, setSelectedIcon] = useState<string>(initialData?.icon || (initialData?.name ? getGoalIconDef(null, initialData.name).id : 'target'));
  const [color, setColor] = useState(initialData?.color ?? '');
  const [target, setTarget] = useState(toRaw(initialData?.target));
  const [current, setCurrent] = useState(toRaw(initialData?.current));
  const [monthly, setMonthly] = useState(toRaw(initialData?.monthlyPrediction));
  const [deadline, setDeadline] = useState(initialData?.deadline ?? '');
  const [start, setStart] = useState(initialData?.planStartMonth ?? '');
  const [rate, setRate] = useState(initialData?.monthlyRate ? String(initialData.monthlyRate).replace('.', ',') : '');
  const [paused, setPaused] = useState(!!initialData?.paused);
  const [participants, setParticipants] = useState<ParticipantDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const swipeToClose = useSwipeToClose(onClose);
  const busy = isSubmitting || isDeleting;

  const iconDef = getGoalIconDef(selectedIcon, name);
  const accent = color || iconDef.color;
  const filled = participants.filter((p) => p.name.trim() && cents(p.raw) > 0);
  const participantsTotal = filled.reduce((s, p) => s + cents(p.raw), 0);

  const handleNameChange = (val: string) => {
    setName(val);
    // sugere o ícone enquanto a pessoa não escolheu um
    if (!initialData?.icon && (selectedIcon === 'target' || !selectedIcon)) {
      const suggested = getGoalIconDef(null, val);
      if (suggested.id !== 'target') setSelectedIcon(suggested.id);
    }
  };

  const setParticipant = (idx: number, patch: Partial<ParticipantDraft>) =>
    setParticipants((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const parsedRate = parseFloat(rate.replace(',', '.')) || 0;
    const goal: GoalData = {
      id: initialData?.id ?? Date.now().toString(),
      name: name.trim(),
      target: cents(target),
      current: cents(current),
      // com participantes, o total mensal é a soma deles
      monthlyPrediction: filled.length > 0 ? participantsTotal : cents(monthly),
      icon: selectedIcon || 'target',
      color: color || null,
      category: category || null,
      deadline: deadline || null,
      notes: notes.trim() || null,
      monthlyRate: parsedRate > 0 ? parsedRate : null,
      paused,
      planStartMonth: start || null,
      createdAt: initialData?.createdAt ?? new Date().toISOString().slice(0, 10),
    };
    try {
      await onSave(goal, filled.map((p) => ({ person: p.name.trim(), amount: cents(p.raw) })));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !onDelete) return;
    setIsDeleting(true);
    try { await onDelete(initialData.id); } finally { setIsDeleting(false); }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={!busy ? onClose : undefined}>
      <div className="modal-sheet animate-slide-in-sheet" onClick={(e) => e.stopPropagation()} style={{ ...swipeToClose.style, maxHeight: '92vh', overflowY: 'auto' }}>
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 15, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
              <iconDef.icon size={23} />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{isEditing ? 'Editar caixinha' : 'Nova caixinha'}</h2>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{isEditing ? 'Ajuste o objetivo' : 'Dê um nome, uma cor e um valor ao seu objetivo'}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Nome</label>
            <input className="form-input" required value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ex.: Troca de carro, Viagem, Reserva" disabled={busy} />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Descrição (opcional)</label>
            <input className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Para que serve esta meta?" disabled={busy} />
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Categoria</label>
            <div className="gb-pills">
              {GOAL_CATEGORIES.map((c) => (
                <button key={c} type="button" className={category === c ? 'is-on' : ''} aria-pressed={category === c} onClick={() => setCategory(category === c ? '' : c)} disabled={busy}>{c}</button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ícone</span><span style={{ color: accent, fontWeight: 600, fontSize: 12 }}>{iconDef.label}</span></label>
            <div className="gb-icon-grid">
              {GOAL_ICONS.map((item) => {
                const selected = selectedIcon === item.id;
                const Ic = item.icon;
                return (
                  <button key={item.id} type="button" title={item.label} aria-label={item.label} aria-pressed={selected} onClick={() => setSelectedIcon(item.id)} disabled={busy}
                    style={{ background: selected ? accent : 'var(--surface)', color: selected ? '#fff' : item.color, borderColor: selected ? accent : 'var(--separator)' }}>
                    <Ic size={19} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Cor</label>
            <div className="gb-swatches">
              {GOAL_COLORS.map((c) => (
                <button key={c} type="button" aria-label={`Cor ${c}`} aria-pressed={color === c} className={color === c ? 'is-on' : ''} style={{ background: c }} onClick={() => setColor(color === c ? '' : c)} disabled={busy} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label className="form-label">Valor desejado</label>
              <input className="form-input" required inputMode="numeric" value={formatMask(target)} onChange={(e) => setTarget(parseMask(e.target.value))} placeholder="R$ 0,00" disabled={busy} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label className="form-label">Já guardado</label>
              <input className="form-input" inputMode="numeric" value={formatMask(current)} onChange={(e) => setCurrent(parseMask(e.target.value))} placeholder="R$ 0,00" disabled={busy} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label className="form-label">Prazo desejado</label>
              <input className="form-input" type="month" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={busy} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
              <label className="form-label">Aporte mensal planejado</label>
              <input className="form-input" inputMode="numeric" value={filled.length > 0 ? formatMask(String(Math.round(participantsTotal * 100))) : formatMask(monthly)} onChange={(e) => setMonthly(parseMask(e.target.value))} placeholder="R$ 0,00" disabled={busy || filled.length > 0} />
            </div>
          </div>

          {!isEditing && (
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Participantes (opcional)</label>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 8px' }}>
                Para uma meta dividida, informe quanto cada pessoa pretende aportar por mês. O total vira o aporte mensal.
              </p>
              {participants.map((p, i) => (
                <div key={i} className="gb-participant-row">
                  <input className="form-input" placeholder="Nome" value={p.name} onChange={(e) => setParticipant(i, { name: e.target.value })} disabled={busy} />
                  <input className="form-input" inputMode="numeric" placeholder="R$ 0,00" value={formatMask(p.raw)} onChange={(e) => setParticipant(i, { raw: parseMask(e.target.value) })} disabled={busy} />
                  <button type="button" aria-label="Remover participante" onClick={() => setParticipants((prev) => prev.filter((_, j) => j !== i))} disabled={busy}><X size={15} /></button>
                </div>
              ))}
              <button type="button" className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '6px 4px' }} onClick={() => setParticipants((prev) => [...prev, { name: prev.length === 0 ? 'Você' : '', raw: '' }])} disabled={busy}>
                <Plus size={14} /> Adicionar participante
              </button>
            </div>
          )}

          <details className="gb-more">
            <summary>Mais opções</summary>
            <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
              <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
                <label className="form-label">Início do aporte mensal</label>
                <input className="form-input" type="month" value={start} onChange={(e) => setStart(e.target.value)} disabled={busy} />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
                <label className="form-label">Rendimento (% ao mês)</label>
                <input className="form-input" inputMode="decimal" value={rate} placeholder="sem rendimento" onChange={(e) => setRate(e.target.value.replace(/[^\d.,]/g, ''))} disabled={busy} />
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '6px 0 0' }}>Sem rendimento a projeção usa só os aportes: nenhuma taxa é presumida.</p>
            {isEditing && (
              <label className="gb-switch-row">
                <span>Meta pausada<small>Não entra nos aportes planejados nem na previsão.</small></span>
                <button type="button" role="switch" aria-checked={paused} className={paused ? 'is-on' : ''} onClick={() => setPaused(!paused)}><i /></button>
              </label>
            )}
          </details>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {!isEditing && <button type="button" className="btn-ghost" onClick={onClose} disabled={busy} style={{ flex: 1, padding: 14 }}>Cancelar</button>}
            {isEditing && onDelete && (
              <button type="button" className="btn-ghost" style={{ color: 'var(--red)', background: 'var(--red-light)', flex: 1, padding: 14 }} onClick={handleDelete} disabled={busy}>
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            )}
            <button type="submit" className="btn-primary" style={{ flex: 2, padding: 14 }} disabled={busy || !name.trim()}>
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar caixinha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
