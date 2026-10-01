'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, CheckSquare, Square, X, CheckCircle2 } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLEARABLE_TABS = [
  { id: 'Transacoes', label: 'Transações', desc: 'Todas as despesas e parcelas cadastradas' },
  { id: 'Receitas', label: 'Receitas', desc: 'Rendas mensais, fixas e recorrentes' },
  { id: 'Cartoes', label: 'Cartões & Faturas', desc: 'Cartões de crédito cadastrados e histórico de faturas' },
  { id: 'Metas', label: 'Metas', desc: 'Metas de economia e previsões' },
  { id: 'Pendencias', label: 'Pendências', desc: 'Contas a pagar e lembretes pendentes' },
];

export default function ClearDataModal({ isOpen, onClose }: ClearDataModalProps) {
  const [selectedTabs, setSelectedTabs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleTab = (id: string) => {
    setSelectedTabs(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedTabs.length === CLEARABLE_TABS.length) {
      setSelectedTabs([]);
    } else {
      setSelectedTabs(CLEARABLE_TABS.map(t => t.id));
    }
  };

  const handleClear = async () => {
    if (selectedTabs.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/settings/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabs: selectedTabs }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao limpar dados da planilha');
      }

      // Reload global financial state
      await useFinanceStore.getState().loadAll();

      setSuccessMessage('Dados das abas selecionadas foram excluídos com sucesso. Os cabeçalhos foram mantidos.');
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
        setSelectedTabs([]);
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao processar solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isSubmitting ? onClose : undefined}>
      <div 
        className="modal-sheet animate-slide-in-sheet" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 520, margin: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--red-light)',
              color: 'var(--red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Trash2 size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Limpar Dados da Planilha
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
                Selecione as abas que deseja esvaziar
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSubmitting}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Informative Alert */}
        <div style={{
          background: 'rgba(255, 149, 0, 0.1)',
          border: '1px solid rgba(255, 149, 0, 0.25)',
          borderRadius: 12,
          padding: '12px 14px',
          marginBottom: 18,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start'
        }}>
          <AlertTriangle size={18} color="var(--orange)" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            Esta ação apagará permanentemente as linhas das abas escolhidas no seu Google Sheets. <strong>A primeira linha com os cabeçalhos será preservada</strong>, mantendo sua planilha pronta para novos registros.
          </p>
        </div>

        {/* Tab Selection */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              Quais abas deseja apagar?
            </span>
            <button
              type="button"
              onClick={toggleAll}
              disabled={isSubmitting}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--blue)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                padding: 0
              }}
            >
              {selectedTabs.length === CLEARABLE_TABS.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CLEARABLE_TABS.map(tab => {
              const isSelected = selectedTabs.includes(tab.id);
              return (
                <div
                  key={tab.id}
                  onClick={() => !isSubmitting && toggleTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: isSelected ? 'var(--blue-light)' : 'var(--bg)',
                    border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--separator)'}`,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ color: isSelected ? 'var(--blue)' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}>
                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {tab.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {tab.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {errorMessage && (
          <div style={{
            background: 'var(--red-light)',
            color: 'var(--red)',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 13,
            marginBottom: 16
          }}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={{
            background: 'var(--green-light)',
            color: 'var(--green)',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 13,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <CheckCircle2 size={16} />
            {successMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            type="button"
            className="btn-ghost"
            style={{ flex: 1, padding: '12px' }}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{
              flex: 1.5,
              padding: '12px',
              background: 'var(--red)',
              opacity: selectedTabs.length === 0 || isSubmitting ? 0.6 : 1,
              cursor: selectedTabs.length === 0 || isSubmitting ? 'not-allowed' : 'pointer'
            }}
            onClick={handleClear}
            disabled={selectedTabs.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <div className="btn-spinner" style={{ width: 16, height: 16 }} />
                <span>Apagando...</span>
              </div>
            ) : (
              <span>Apagar {selectedTabs.length > 0 ? `(${selectedTabs.length})` : ''}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
