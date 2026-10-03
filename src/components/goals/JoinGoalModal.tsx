'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';
import { useSwipeToClose } from '@/hooks/useSwipeToClose';
import { requestSpreadsheetAccess } from '@/lib/googlePicker';

interface JoinGoalModalProps {
  onClose: () => void;
}

export default function JoinGoalModal({ onClose }: JoinGoalModalProps) {
  const [shareCode, setShareCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { loadAll } = useFinanceStore();
  const swipeToClose = useSwipeToClose(onClose);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareCode.trim()) return;

    setIsSubmitting(true);
    setError('');
    
    try {
      const accept = () => fetch('/api/metas/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareCode: shareCode.trim() })
      });

      let res = await accept();
      if (!res.ok) {
        const data = await res.json();
        // O app só abre a planilha do dono depois que a pessoa a escolhe no seletor do Google
        if (!data.needsAccess) throw new Error(data.error || 'Erro ao entrar na meta');
        if (!await requestSpreadsheetAccess(data.ownerSpreadsheetId)) {
          throw new Error('Para entrar na meta, selecione a planilha de quem te convidou na janela do Google.');
        }
        res = await accept();
        if (!res.ok) {
          const retryData = await res.json();
          throw new Error(retryData.error || 'Erro ao entrar na meta');
        }
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
        style={swipeToClose.style}
      >
        <div {...swipeToClose.handlers} style={{ paddingBottom: 16, touchAction: 'none' }}>
          <div className="modal-handle" />
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>
            Entrar em Meta Compartilhada
          </h2>
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
          
          {/* Avisa antes da janela do Google (src/lib/googlePicker.ts), que abre na primeira vez */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 12px',
            marginBottom: 16,
            borderRadius: 12,
            background: 'var(--blue-light)',
          }}>
            <Info size={16} color="var(--blue)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Para entrar, o Google vai pedir sua confirmação: na janela que abrir, selecione a planilha de quem te convidou. Isso só acontece na primeira vez.
            </span>
          </div>

          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button 
              type="button" 
              className="btn-ghost" 
              onClick={onClose} 
              disabled={isSubmitting} 
              style={{ flex: 1, padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 2, padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} disabled={isSubmitting}>
              {isSubmitting ? <div className="btn-spinner" /> : 'Entrar na Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
