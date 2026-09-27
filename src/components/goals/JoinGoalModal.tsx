'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';

interface JoinGoalModalProps {
  onClose: () => void;
}

export default function JoinGoalModal({ onClose }: JoinGoalModalProps) {
  const [shareCode, setShareCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { loadAll } = useFinanceStore();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareCode.trim()) return;

    setIsSubmitting(true);
    setError('');
    
    try {
      const res = await fetch('/api/metas/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareCode: shareCode.trim() })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao entrar na meta');
      }
      
      // Reload all to fetch the newly joined goal from the owner's spreadsheet
      await loadAll();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isSubmitting ? onClose : undefined}>
      <div 
        className="modal-sheet animate-slide-in-sheet" 
        onClick={e => e.stopPropagation()}
        style={{ padding: 24, maxWidth: 400, width: '100%', borderRadius: 24 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>
            Entrar em Meta Compartilhada
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }} disabled={isSubmitting}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleJoin}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Cole abaixo o código de convite que você recebeu. Lembre-se que o dono da meta precisa ter compartilhado usando o seu e-mail do Google.
          </p>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Código do Convite</label>
            <input 
              type="text" 
              className="form-input" 
              required 
              value={shareCode} 
              onChange={e => setShareCode(e.target.value)} 
              placeholder="Cole o código aqui"
              disabled={isSubmitting}
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
          </div>
          
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} disabled={isSubmitting}>
              {isSubmitting ? <div className="btn-spinner" /> : 'Entrar na Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
