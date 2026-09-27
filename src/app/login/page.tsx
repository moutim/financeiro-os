'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="login-root">
      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
      </div>

      <div className="login-card">
        {/* Logo / Ícone */}
        <div className="login-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="12" fill="url(#grad)" />
            <path d="M12 28L20 12L28 28M15.5 22H24.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6C63FF" />
                <stop offset="1" stopColor="#4F46E5" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="login-header">
          <h1 className="login-title">FinanceiroOS</h1>
          <p className="login-subtitle">Controle financeiro pessoal, do seu jeito.</p>
        </div>

        <div className="login-features">
          <div className="login-feature">
            <span className="login-feature-icon">📊</span>
            <span>Seus dados no seu Google Drive</span>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon">🔒</span>
            <span>Privado — só você tem acesso</span>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon">⚡</span>
            <span>Planilha criada automaticamente</span>
          </div>
        </div>

        <button
          className="login-btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <span className="login-btn-loading">
              <span className="login-spinner" />
              Preparando seu FinanceiroOS...
            </span>
          ) : (
            <span className="login-btn-content">
              <GoogleIcon />
              Entrar com Google
            </span>
          )}
        </button>

        <p className="login-disclaimer">
          Ao entrar, uma planilha "FinanceiroOS" será criada no seu Google Drive.
          Nenhum dado é armazenado nos nossos servidores.
        </p>
      </div>

      <style>{`
        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0f;
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
        }

        .login-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.25;
          animation: float 8s ease-in-out infinite;
        }

        .login-orb-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #6C63FF, transparent);
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .login-orb-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #4F46E5, transparent);
          bottom: -80px;
          right: -80px;
          animation-delay: -3s;
        }

        .login-orb-3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, #818cf8, transparent);
          top: 50%;
          left: 60%;
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
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 48px 40px;
          width: 100%;
          max-width: 420px;
          box-shadow:
            0 0 0 1px rgba(108, 99, 255, 0.1),
            0 32px 64px rgba(0, 0, 0, 0.5),
            0 0 80px rgba(108, 99, 255, 0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .login-icon {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(108, 99, 255, 0.15);
          border: 1px solid rgba(108, 99, 255, 0.3);
          box-shadow: 0 0 24px rgba(108, 99, 255, 0.2);
        }

        .login-header {
          text-align: center;
        }

        .login-title {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 6px;
          letter-spacing: -0.5px;
        }

        .login-subtitle {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }

        .login-features {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          padding: 16px;
        }

        .login-feature {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: rgba(255, 255, 255, 0.6);
        }

        .login-feature-icon {
          font-size: 16px;
          flex-shrink: 0;
        }

        .login-btn {
          width: 100%;
          padding: 14px 20px;
          background: #ffffff;
          color: #1a1a2e;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .login-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .login-btn-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .login-btn-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .login-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(26, 26, 46, 0.2);
          border-top-color: #1a1a2e;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-disclaimer {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.3);
          text-align: center;
          line-height: 1.5;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
