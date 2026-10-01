'use client';

import { useState, useEffect } from 'react';
import { Plus, LayoutDashboard, Target, Sparkles, PieChart } from 'lucide-react';

interface WelcomeTourModalProps {
  onClose: () => void;
}

export default function WelcomeTourModal({ onClose }: WelcomeTourModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Pequeno delay para a animação de entrada fluida (spring feel)
    const t = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 400); // Tempo para a animação de saída terminar
  };

  const features = [
    {
      icon: <PieChart size={24} style={{ color: 'var(--teal)' }} />,
      title: 'Visão Geral Inteligente',
      description: 'Acompanhe seu dia a dia, analise seus gastos por categoria e veja seu saldo do mês atual no dashboard.',
    },
    {
      icon: <Plus size={24} style={{ color: 'var(--blue)' }} />,
      title: 'Tudo em um só lugar',
      description: 'Use o botão + no canto da tela para adicionar transações, receitas, cartões e metas.',
    },
    {
      icon: <LayoutDashboard size={24} style={{ color: 'var(--orange)' }} />,
      title: 'Navegação Simples',
      description: 'Acesse facilmente todas as áreas da plataforma pelo menu lateral ou abas no mobile.',
    },
    {
      icon: <Target size={24} style={{ color: 'var(--green)' }} />,
      title: 'Alcance seus Objetivos',
      description: 'Acompanhe seus limites de gastos e o progresso das suas metas mês a mês.',
    }
  ];

  return (
    <div
      className="modal-overlay"
      style={{
        opacity: isVisible && !isClosing ? 1 : 0,
        transition: 'opacity 0.4s ease',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div
        className="modal-sheet"
        style={{
          transform: isVisible && !isClosing ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          opacity: isVisible && !isClosing ? 1 : 0,
          transition: 'all 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
          maxWidth: 640,
          width: '90%',
          margin: '0 auto',
          padding: '28px 20px 24px',
          borderRadius: 32,
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          background: 'var(--surface)',
          border: '1px solid var(--separator)'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'var(--blue-light)', color: 'var(--blue)', marginBottom: 16 }}>
          <Sparkles size={28} strokeWidth={1.5} />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Bem-vindo ao<br />Financeiro OS
        </h1>

        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 24, padding: '0 10px', lineHeight: 1.4 }}>
          O seu novo espaço para organizar suas finanças com clareza e beleza.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24, textAlign: 'left', padding: '0 4px' }}>
          {features.map((feature, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: 'var(--bg-body)' }}>
                {feature.icon}
              </div>
              <div style={{ paddingTop: 2 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 2, letterSpacing: '-0.01em' }}>{feature.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.35 }}>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn-primary"
          onClick={handleClose}
          style={{ width: '100%', padding: '16px', fontSize: 16, borderRadius: 16, background: 'var(--blue)', color: 'white', fontWeight: 600 }}
        >
          Começar a usar
        </button>
      </div>
    </div>
  );
}
