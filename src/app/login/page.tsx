'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Wallet, Cloud, Lock, Zap } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <main className="login-root">
      <div className="login-bg" aria-hidden="true">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
      </div>

      <div className="login-card">
        {/* Logo / Ícone - igual à Sidebar */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: 'linear-gradient(145deg, #007AFF, #5856D6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,122,255,0.35)',
          color: 'white',
          marginBottom: 8
        }}>
          <Wallet size={32} aria-hidden="true" />
        </div>

        <div className="login-header">
          <h1 className="login-title">Financeiro OS</h1>
          <h2 className="login-subtitle">O seu sistema de controle financeiro online.</h2>
        </div>

        <div className="login-features">
          <div className="login-feature">
            <span className="login-feature-icon" style={{ color: 'var(--blue)' }}>
              <Cloud size={20} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span>Gestão financeira segura no seu Google Drive</span>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon" style={{ color: 'var(--green)' }}>
              <Lock size={20} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span>Finanças pessoais 100% privadas</span>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon" style={{ color: 'var(--orange)' }}>
              <Zap size={20} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span>Planilha de gastos gerada automaticamente</span>
          </div>
        </div>

        <button
          className="login-btn"
          onClick={handleLogin}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <span className="login-btn-content">
              <div className="btn-spinner" aria-hidden="true" />
              Preparando ambiente...
            </span>
          ) : (
            <span className="login-btn-content">
              <GoogleIcon />
              Continuar com Google
            </span>
          )}
        </button>

        <p className="login-disclaimer">
          <strong>Sobre o App:</strong> O Financeiro OS é uma interface gráfica para gestão financeira pessoal. O propósito do aplicativo é ler e gravar dados transacionais exclusivamente na sua própria planilha do Google Sheets. 
          Este aplicativo NÃO utiliza APIs do Google para treinar Inteligência Artificial ou gerar imagens de qualquer tipo (incluindo AI NCII).<br /><br />
          Nenhum dado financeiro é armazenado nos nossos servidores. Ao continuar, você concorda com nossos{' '}
          <Link href="/termos" style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}>Termos de Serviço</Link> e{' '}
          <Link href="/privacidade" style={{ color: 'var(--text-primary)', textDecoration: 'underline' }}>Política de Privacidade</Link>.
        </p>
      </div>

      <style>{`
        .login-root {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--background);
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        .login-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.5;
          animation: float 8s ease-in-out infinite;
        }

        .login-orb-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(0,122,255,0.4), transparent 70%);
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .login-orb-2 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(88,86,214,0.3), transparent 70%);
          bottom: -50px;
          right: -50px;
          animation-delay: -3s;
        }

        .login-orb-3 {
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(52,199,89,0.2), transparent 70%);
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -6s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(20px, -20px); }
          66% { transform: translate(-15px, 15px); }
        }

        .login-card {
          position: relative;
          z-index: 10;
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 32px;
          padding: 40px 32px;
          width: 100%;
          max-width: 380px;
          box-shadow:
            0 20px 40px rgba(0, 0, 0, 0.08),
            0 1px 3px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .login-header {
          text-align: center;
        }

        .login-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 6px;
          letter-spacing: -0.02em;
        }

        .login-subtitle {
          font-size: 15px;
          color: var(--text-secondary);
          margin: 0;
        }

        .login-features {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          padding: 16px 8px;
        }

        .login-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .login-feature-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: var(--surface);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          flex-shrink: 0;
        }

        .login-btn {
          width: 100%;
          padding: 14px 20px;
          background: var(--text-primary);
          color: #ffffff;
          border: none;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1), background 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .login-btn:hover:not(:disabled) {
          transform: scale(0.98);
          background: #000000;
        }

        .login-btn:active:not(:disabled) {
          transform: scale(0.96);
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-btn-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .btn-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-disclaimer {
          font-size: 12px;
          color: var(--text-tertiary);
          text-align: center;
          line-height: 1.4;
          margin: 0;
          padding: 0 16px;
        }
      `}</style>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 18 18" fill="none" style={{ background: 'white', borderRadius: '50%', padding: '2px' }}>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
