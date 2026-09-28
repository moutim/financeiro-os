'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { SavingsGoal } from '@/lib/types';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';

interface ShareGoalModalProps {
  goal: SavingsGoal;
  onClose: () => void;
}

export default function ShareGoalModal({ goal, onClose }: ShareGoalModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const swipeToClose = useSwipeToClose(onClose);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const res = await fetch('/api/metas/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, goalId: goal.id, goalName: goal.name })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao compartilhar');
      }
      
      setShareCode(data.shareCode);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={!isSubmitting ? onClose : undefined}>
      <div 
        className="modal-sheet animate-slide-in-sheet" 
        onClick={e => e.stopPropagation()}
        style={swipeToClose.style}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>
            Compartilhar Meta
          </h2>
        </div>

        {!shareCode ? (
          <form onSubmit={handleShare}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Compartilhe a meta <strong>{goal.name}</strong>. A pessoa receberá um código e terá permissão de leitura/edição na sua planilha para somar o investimento junto com você.
            </p>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">E-mail do Google da Pessoa</label>
              <input 
                type="email" 
                className="form-input" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="exemplo@gmail.com"
                disabled={isSubmitting}
              />
            </div>
            
            {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button type="submit" className="btn-primary" style={{ flex: 1, padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} disabled={isSubmitting}>
                {isSubmitting ? <div className="btn-spinner" /> : 'Gerar Convite'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ background: 'var(--green-light)', color: 'var(--green)', padding: '12px 16px', borderRadius: 12, marginBottom: 16, fontSize: 14, fontWeight: 500 }}>
              Permissão concedida para {email}!
            </div>
            
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Envie o código abaixo para a pessoa. Ela deve usar o botão "Entrar em Meta Compartilhada" e colar este código.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <input 
                type="text" 
                className="form-input" 
                readOnly 
                value={shareCode} 
                style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
              />
              <button 
                onClick={handleCopy}
                className="btn-ghost"
                style={{ padding: '0 16px', background: 'var(--surface-hover)' }}
              >
                {copied ? <Check size={18} color="var(--green)" /> : <Copy size={18} />}
              </button>
            </div>

            <button onClick={onClose} className="btn-primary" style={{ width: '100%', padding: '14px' }}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
