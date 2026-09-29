'use client';

import { useSession, signOut } from 'next-auth/react';
import { Palette, User as UserIcon, LogOut, Moon, ShieldCheck, ExternalLink } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import GlassCard from '@/components/ui/GlassCard';
import { useThemeStore } from '@/lib/themeStore';

export default function SettingsPage() {
  const { tintColor, setTintColor, isDarkMode, toggleDarkMode } = useThemeStore();
  const { data: session } = useSession();
  const user = session?.user;
  const spreadsheetId = (session as any)?.spreadsheetId;
  const spreadsheetUrl = spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null;

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <>
      <Sidebar />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 2 }}>
              Sua conta e preferências
            </p>
            <h1 className="text-title-1">Configurações</h1>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Perfil da Conta */}
          <section>
            <GlassCard>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <UserIcon size={18} color="var(--blue)" />
                Perfil da Conta
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? 'Avatar'}
                    style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--blue), var(--green))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    color: 'white',
                    fontWeight: 700,
                  }}>
                    {initials}
                  </div>
                )}
                
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                    {user?.name ?? 'Usuário'}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    {user?.email ?? 'Conta conectada'}
                  </div>
                </div>
                
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="btn-ghost"
                  style={{ marginLeft: 'auto', color: 'var(--red)' }}
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            </GlassCard>
          </section>

          {/* Aparência */}
          <section>
            <GlassCard>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <Palette size={18} color="var(--blue)" />
                Aparência
              </h2>
              
              {/* Modo Escuro */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--separator)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-light)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Moon size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Modo Escuro</div>
                    <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Aparência noturna para a plataforma</div>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: isDarkMode ? 'var(--green)' : 'var(--text-quaternary)',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      background: 'white',
                      position: 'absolute',
                      top: 2,
                      left: isDarkMode ? 22 : 2,
                      transition: 'left 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  />
                </button>
              </div>

              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Escolha a cor de destaque (Tint Color) para personalizar a plataforma.
              </p>
              
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  '#007AFF', // Azul
                  '#FF3B30', // Vermelho
                  '#34C759', // Verde
                  '#FF9500', // Laranja
                  '#FFCC00', // Amarelo
                  '#5856D6', // Roxo
                  '#FF2D55', // Rosa
                  '#5AC8FA', // Ciano
                  '#009688', // Verde-Água (Teal)
                  '#795548', // Marrom
                  '#607D8B', // Cinza Azulado
                  '#000000', // Preto
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => setTintColor(color)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: tintColor === color ? '3px solid white' : 'none',
                      outline: tintColor === color ? `2px solid ${color}` : 'none',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    title={`Mudar para cor ${color}`}
                  />
                ))}
              </div>
            </GlassCard>
          </section>

          {/* Privacidade & Dados */}
          <section>
            <GlassCard>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <ShieldCheck size={18} color="var(--blue)" />
                Segurança & Dados
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Nenhum dado financeiro seu é salvo em nossos servidores.</strong> A plataforma funciona apenas como uma interface, e todas as suas despesas, receitas e metas são armazenadas exclusivamente na sua própria conta do Google Sheets.
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Você tem o controle 100% livre sobre seus dados. Eles são seus.
                </p>
                
                {spreadsheetUrl && (
                  <div style={{ marginTop: 8 }}>
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', width: 'fit-content' }}
                    >
                      Acessar Planilha (Banco de Dados)
                      <ExternalLink size={16} />
                    </a>
                  </div>
                )}
              </div>
            </GlassCard>
          </section>
        </div>
      </main>
    </>
  );
}
