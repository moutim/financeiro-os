'use client';

import { useState } from 'react';
import { formatMask, parseMask } from '@/lib/currency';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { BANKS } from '@/lib/banks';

export interface CardData {
  id: string;
  name: string;
  limit: number;
  used: number;
  color: string;
  colorLight: string;
  brand: string;
  freedMonthKey?: string | null;
  lastDigits?: string | null;
  bankId?: string | null;
  priority?: number | null;
}

interface CardFormModalProps {
  initialData?: CardData | null;
  onSave: (data: CardData) => Promise<void> | void;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void> | void;
}

const BRAND_COLORS: Record<string, { color: string; colorLight: string }> = {
  Mastercard: { color: '#EC7000', colorLight: '#fdf1e5' },
  Visa: { color: '#1A1F71', colorLight: '#e8e9f1' },
  Elo: { color: '#00A4E0', colorLight: '#e5f6fc' },
  Amex: { color: '#002663', colorLight: '#e5e9f0' },
  Nubank: { color: '#8A05BE', colorLight: '#f3e5f8' },
  Outro: { color: '#1E1E1E', colorLight: '#e8e8e8' },
};

export default function CardFormModal({ initialData, onSave, onClose, onDelete }: CardFormModalProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [limit, setLimit] = useState(initialData?.limit ? String(Math.round(initialData.limit * 100)) : '');
  const [used, setUsed] = useState(initialData?.used ? String(Math.round(initialData.used * 100)) : '0');
  const [brand, setBrand] = useState(initialData?.brand ?? 'Mastercard');
  const [freedMonth, setFreedMonth] = useState(initialData?.freedMonthKey ? initialData.freedMonthKey.split('-')[1] : '');
  const [freedYear, setFreedYear] = useState(initialData?.freedMonthKey ? initialData.freedMonthKey.split('-')[0] : '');
  const [lastDigits, setLastDigits] = useState(initialData?.lastDigits ? initialData.lastDigits.split('-').pop() ?? '' : '');
  const [bankId, setBankId] = useState(initialData?.bankId ?? '');
  const [priority, setPriority] = useState<string>(initialData?.priority ? String(initialData.priority) : '1');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const swipeToClose = useSwipeToClose(onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto color based on name or brand
    let colorObj = BRAND_COLORS[brand] || BRAND_COLORS['Outro'];
    if (name.toLowerCase().includes('nubank')) {
      colorObj = BRAND_COLORS['Nubank'];
    }

    let finalLastDigits = null;
    if (lastDigits) {
      const slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      finalLastDigits = `${slug}-${lastDigits}`;
    }

    const card: CardData = {
      id: initialData?.id ?? Date.now().toString(),
      name,
      limit: parseInt(limit || '0', 10) / 100,
      used: parseInt(used || '0', 10) / 100,
      color: initialData?.color ?? colorObj.color,
      colorLight: initialData?.colorLight ?? colorObj.colorLight,
      brand,
      freedMonthKey: (freedYear && freedMonth) ? `${freedYear}-${freedMonth}` : null,
      lastDigits: finalLastDigits,
      bankId: bankId || null,
      priority: priority ? parseInt(priority, 10) : 1,
    };
    
    setIsSubmitting(true);
    try {
      await onSave(card);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(initialData.id);
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    }
  };

  const isLoading = isSubmitting || isDeleting;

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isLoading ? onClose : undefined}>
      <div 
        className="modal-sheet animate-slide-in-sheet" 
        onClick={e => e.stopPropagation()}
        style={swipeToClose.style}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>
            {initialData ? 'Editar Cartão' : 'Novo Cartão'}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Nome do Cartão</label>
            <input 
              type="text" 
              className="form-input" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Ex: Nubank, Itaú..." 
              disabled={isLoading}
            />
          </div>
          
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Banco</label>
              <select className="form-select" value={bankId} onChange={e => setBankId(e.target.value)} disabled={isLoading}>
                <option value="">(Nenhum)</option>
                {BANKS.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Bandeira</label>
              <select className="form-select" value={brand} onChange={e => setBrand(e.target.value)} disabled={isLoading}>
                <option value="Mastercard">Mastercard</option>
                <option value="Visa">Visa</option>
                <option value="Elo">Elo</option>
                <option value="Amex">Amex</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Final do Cartão</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: 4321" 
                maxLength={4}
                value={lastDigits}
                onChange={e => setLastDigits(e.target.value.replace(/\D/g, ''))} 
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Prioridade de Exibição</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)' }}>(Ordem nos cartões)</span>
            </label>
            <select 
              className="form-select" 
              value={priority} 
              onChange={e => setPriority(e.target.value)} 
              disabled={isLoading}
            >
              <option value="1">1º - Cartão Principal</option>
              <option value="2">2º - Prioridade Alta</option>
              <option value="3">3º - Prioridade Média</option>
              <option value="4">4º - Quarto Cartão</option>
              <option value="5">5º - Quinto Cartão</option>
              <option value="6">6º - Sexto Cartão</option>
              <option value="7">7º - Sétimo Cartão</option>
              <option value="8">8º - Oitavo Cartão</option>
              <option value="9">9º - Nono Cartão</option>
              <option value="10">10º - Décimo Cartão</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Limite Total (R$)</label>
              <input 
                type="text" 
                inputMode="numeric"
                className="form-input" 
                required 
                value={formatMask(limit)} 
                onChange={e => setLimit(parseMask(e.target.value))} 
                disabled={isLoading}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Utilizado (R$)</label>
              <input 
                type="text" 
                inputMode="numeric"
                className="form-input" 
                required 
                value={formatMask(used)} 
                onChange={e => setUsed(parseMask(e.target.value))} 
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Previsão de Quitação do Limite Usado</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)' }}>(Opcional)</span>
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <select
                className="form-select"
                style={{ flex: 1 }}
                value={freedMonth}
                onChange={e => setFreedMonth(e.target.value)}
                disabled={isLoading}
              >
                <option value="">Mês</option>
                <option value="01">Janeiro</option>
                <option value="02">Fevereiro</option>
                <option value="03">Março</option>
                <option value="04">Abril</option>
                <option value="05">Maio</option>
                <option value="06">Junho</option>
                <option value="07">Julho</option>
                <option value="08">Agosto</option>
                <option value="09">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
              
              <select
                className="form-select"
                style={{ flex: 1 }}
                value={freedYear}
                onChange={e => setFreedYear(e.target.value)}
                disabled={isLoading}
              >
                <option value="">Ano</option>
                {Array.from({ length: 10 }).map((_, i) => {
                  const y = new Date().getFullYear() + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6, lineHeight: 1.4 }}>
              Mês e ano em que as parcelas atuais terminam e o limite volta a ficar 100% disponível. Ajuda na projeção do gráfico.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {initialData && onDelete && (
              <button 
                type="button"
                className="btn-ghost" 
                style={{ color: 'var(--red)', background: 'var(--red-light)', flex: 1, padding: '14px', opacity: isLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isDeleting && <div className="btn-spinner" style={{ borderColor: 'rgba(255,59,48,0.3)', borderTopColor: 'var(--red)' }} />}
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={isLoading} style={{ flex: 2, padding: '14px', opacity: isLoading ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {isSubmitting && <div className="btn-spinner" />}
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
