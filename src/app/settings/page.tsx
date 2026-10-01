'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Palette, User as UserIcon, LogOut, Moon, ShieldCheck, ExternalLink, Settings2, LayoutTemplate, Layers, Trash2, Plus } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import ClearDataModal from '@/components/settings/ClearDataModal';
import CustomColorModal from '@/components/settings/CustomColorModal';
import GlassCard from '@/components/ui/GlassCard';
import { useThemeStore } from '@/lib/themeStore';
import { useAppConfigStore } from '@/lib/appConfigStore';
import Link from 'next/link';

export default function SettingsPage() {
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const { tintColor, setTintColor, isDarkMode, toggleDarkMode } = useThemeStore();
  const { mode, setMode } = useAppConfigStore();
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
              {/* flexWrap: em telas estreitas o botão Sair desce para uma linha própria */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? 'Avatar'}
                    style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 64,
                    height: 64,
                    flexShrink: 0,
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
                
                {/* minWidth 0 deixa nome e e-mail longos encolherem com reticências */}
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name ?? 'Usuário'}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email ?? 'Conta conectada'}
                  </div>
                </div>
                
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="btn-ghost account-signout"
                  style={{ marginLeft: 'auto', color: 'var(--red)', flexShrink: 0 }}
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
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <Palette size={18} color="var(--blue)" />
                Aparência
              </h2>
              
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
                Personalize as cores e o tema da plataforma para combinar com o seu estilo diário.
              </p>

              {/* Cor de Destaque */}
              <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--separator)' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                  Cor de Destaque
                </div>
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
                  
                  {/* Botão para cor customizada (HEX) */}
                  <button
                    type="button"
                    onClick={() => setIsColorModalOpen(true)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: 'var(--card-bg)',
                      border: '1.5px dashed var(--text-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--text-primary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--text-tertiary)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Adicionar cor personalizada (HEX)"
                  >
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              
              {/* Tema (Modo Escuro) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--text-quaternary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Moon size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Tema Escuro</div>
                    <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Aparência noturna para descanso visual</div>
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
            </GlassCard>
          </section>

          {/* Modo de Uso */}
          <section>
            <GlassCard>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <Settings2 size={18} color="var(--blue)" />
                Modo de Uso
              </h2>
              
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
                Escolha o nível de detalhe que melhor se adapta à forma como você gerencia suas finanças. Você pode alterar isso a qualquer momento.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                {/* Modo Simples */}
                <div 
                  onClick={() => setMode('simple')}
                  style={{
                    border: mode === 'simple' ? '2px solid var(--blue)' : '1px solid var(--separator)',
                    borderRadius: 16,
                    padding: 20,
                    cursor: 'pointer',
                    background: mode === 'simple' ? 'var(--card-bg)' : 'transparent',
                    boxShadow: mode === 'simple' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (mode !== 'simple') {
                      e.currentTarget.style.borderColor = 'var(--text-tertiary)';
                      e.currentTarget.style.background = 'var(--hover-bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (mode !== 'simple') {
                      e.currentTarget.style.borderColor = 'var(--separator)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: mode === 'simple' ? 'var(--blue-light)' : 'var(--text-quaternary)', color: mode === 'simple' ? 'var(--blue)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}>
                      <LayoutTemplate size={20} />
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: mode === 'simple' ? '6px solid var(--blue)' : '1px solid var(--separator)', background: mode === 'simple' ? 'var(--card-bg)' : 'transparent', transition: 'all 0.2s ease' }} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Simples</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Visão essencial e direta. Foco no balanço principal, menos categorias e relatórios rápidos.
                  </p>
                </div>

                {/* Modo Detalhado */}
                <div 
                  onClick={() => setMode('detailed')}
                  style={{
                    border: mode === 'detailed' ? '2px solid var(--blue)' : '1px solid var(--separator)',
                    borderRadius: 16,
                    padding: 20,
                    cursor: 'pointer',
                    background: mode === 'detailed' ? 'var(--card-bg)' : 'transparent',
                    boxShadow: mode === 'detailed' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (mode !== 'detailed') {
                      e.currentTarget.style.borderColor = 'var(--text-tertiary)';
                      e.currentTarget.style.background = 'var(--hover-bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (mode !== 'detailed') {
                      e.currentTarget.style.borderColor = 'var(--separator)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: mode === 'detailed' ? 'var(--blue-light)' : 'var(--text-quaternary)', color: mode === 'detailed' ? 'var(--blue)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}>
                      <Layers size={20} />
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: mode === 'detailed' ? '6px solid var(--blue)' : '1px solid var(--separator)', background: mode === 'detailed' ? 'var(--card-bg)' : 'transparent', transition: 'all 0.2s ease' }} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Detalhado</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Analytics avançado para cartões, gráficos completos por categorias e relatórios minuciosos.
                  </p>
                </div>
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
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Seus dados são 100% seus.</strong> Nós não salvamos nenhuma informação financeira nos nossos servidores. O Financeiro OS funciona apenas como uma interface visual inteligente e segura.
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Todas as suas despesas, receitas e configurações ficam armazenadas de forma segura <strong style={{ color: 'var(--text-primary)' }}>diretamente na sua conta do Google Sheets</strong>.
                </p>
                
                <div style={{ 
                  display: 'flex', 
                  marginTop: 12, 
                  paddingTop: 20,
                  borderTop: '1px solid var(--separator)',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16
                }}>
                  {spreadsheetUrl && (
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                    >
                      Acessar sua Planilha Base
                      <ExternalLink size={16} />
                    </a>
                  )}
                  
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link href="/privacidade" className="btn-ghost" style={{ textDecoration: 'none', fontSize: 13, padding: '8px 12px' }}>
                      Privacidade
                    </Link>
                    <Link href="/termos" className="btn-ghost" style={{ textDecoration: 'none', fontSize: 13, padding: '8px 12px' }}>
                      Termos de Serviço
                    </Link>
                  </div>
                </div>
              </div>
            </GlassCard>
          </section>

          {/* Gerenciamento e Limpeza de Dados da Planilha */}
          <section>
            <GlassCard>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <Trash2 size={18} color="var(--red)" />
                Gerenciamento e Limpeza de Dados
              </h2>
              
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                Deseja recomeçar ou limpar registros da sua planilha? Você pode escolher exatamente quais abas quer esvaziar (Transações, Cartões, Receitas, Metas ou Pendências). A estrutura de colunas e cabeçalhos é 100% preservada.
              </p>

              <button
                type="button"
                onClick={() => setIsClearModalOpen(true)}
                style={{
                  color: 'var(--red)',
                  background: 'var(--red-light)',
                  fontWeight: 600,
                  padding: '12px 20px',
                  borderRadius: 24,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Trash2 size={16} />
                Limpar Dados da Planilha
              </button>
            </GlassCard>
          </section>
        </div>
      </main>

      <ClearDataModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
      />

      <CustomColorModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
      />
    </>
  );
}
