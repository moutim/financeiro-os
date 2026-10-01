import { useState, useEffect } from 'react';
import { X, Pipette, CheckCircle2 } from 'lucide-react';
import { useThemeStore } from '@/lib/themeStore';

interface CustomColorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomColorModal({ isOpen, onClose }: CustomColorModalProps) {
  const { tintColor, setTintColor } = useThemeStore();
  const [hexInput, setHexInput] = useState(tintColor);

  useEffect(() => {
    if (isOpen) {
      setHexInput(tintColor);
    }
  }, [isOpen, tintColor]);

  if (!isOpen) return null;

  const isValidHex = (hex: string) => /^#([0-9A-F]{3}){1,2}$/i.test(hex);
  
  const normalizeHex = (hex: string) => {
    if (hex.length === 4) {
      return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return hex.toUpperCase();
  };

  const handleSave = () => {
    if (isValidHex(hexInput)) {
      setTintColor(normalizeHex(hexInput));
      onClose();
    }
  };

  const isCurrentValid = isValidHex(hexInput);

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div 
        className="modal-sheet animate-slide-in-sheet" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 400, margin: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--blue-light)',
              color: 'var(--blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Pipette size={18} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Cor Personalizada
            </h2>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
          Insira um código HEX ou escolha visualmente no seletor para personalizar a plataforma com a sua cor favorita.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          {/* Seletor Nativo do OS */}
          <label 
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: isCurrentValid ? normalizeHex(hexInput) : tintColor,
              border: '1px solid var(--separator)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0,
              transition: 'all 0.2s ease'
            }}
            title="Abrir seletor visual"
          >
            <input
              type="color"
              value={isCurrentValid ? normalizeHex(hexInput) : '#007AFF'}
              onChange={(e) => setHexInput(e.target.value.toUpperCase())}
              style={{
                position: 'absolute',
                opacity: 0,
                width: '100%',
                height: '100%',
                cursor: 'pointer'
              }}
            />
            <Pipette size={20} color="#FFFFFF" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }} />
          </label>

          {/* Input HEX Textual */}
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="#007AFF"
              maxLength={7}
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={() => {
                if (isCurrentValid) setHexInput(normalizeHex(hexInput));
              }}
              style={{
                fontFamily: 'monospace',
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                paddingRight: 40
              }}
            />
            {isCurrentValid && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--green)' }}>
                <CheckCircle2 size={18} />
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!isCurrentValid}
          className="btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: 15, borderRadius: 12 }}
        >
          Aplicar Cor Personalizada
        </button>
      </div>
    </div>
  );
}
