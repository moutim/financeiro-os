'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Palette, User as UserIcon, LogOut, Moon, ShieldCheck, ExternalLink, Pipette, Trash2, Sparkles } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import GlassCard from '@/components/ui/GlassCard';
import { useThemeStore, isValidHex, normalizeHex } from '@/lib/themeStore';
import { useFinanceStore } from '@/lib/store';
import Link from 'next/link';
import ClearDataModal from '@/components/settings/ClearDataModal';

export default function SettingsPage() {
  const { tintColor, setTintColor, isDarkMode, toggleDarkMode } = useThemeStore();
  const { data: session } = useSession();
  const user = session?.user;
  const spreadsheetId = (session as any)?.spreadsheetId;
  const spreadsheetUrl = spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null;

  const [hexInput, setHexInput] = useState(tintColor);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isSeedingMock, setIsSeedingMock] = useState(false);
  const { seedMockData } = useFinanceStore();

  const handleLoadMockData = async () => {
    setIsSeedingMock(true);
    try {
      await seedMockData();
      alert('✅ Dados mockados de 2026 carregados com sucesso! Acesse o Dashboard, Categorias, Cartões ou Metas para conferir.');
    } catch (e) {
      alert('Erro ao carregar dados: ' + String(e));
    } finally {
      setIsSeedingMock(false);
    }
  };

  useEffect(() => {
    setHexInput(tintColor);
  }, [tintColor]);

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

              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                Escolha uma cor principal para personalizar os botões, ícones e elementos visuais, deixando a experiência da plataforma mais com a sua cara.
              </p>
              
              {/* Preset Color Swatches */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
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
                  '#1E1E1E', // Preto / Grafite
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setTintColor(color);
                      setHexInput(color);
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: tintColor.toUpperCase() === color.toUpperCase() ? '3px solid white' : 'none',
                      outline: tintColor.toUpperCase() === color.toUpperCase() ? `2px solid ${color}` : 'none',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    title={`Mudar para cor ${color}`}
                  />
                ))}
              </div>

              {/* Custom HEX Input + Native Color Picker */}
              <div style={{
                background: 'var(--bg)',
                borderRadius: 14,
                padding: '16px',
                border: '1px solid var(--separator)'
              }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>
                  Escrever cor ou adicionar HEX personalizado:
                </label>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 380 }}>
                  {/* Visual Picker swatch */}
                  <label 
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: isValidHex(hexInput) ? normalizeHex(hexInput) : tintColor,
                      border: '2px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}
                    title="Clique para abrir a paleta de cores completa"
                  >
                    <input
                      type="color"
                      value={isValidHex(hexInput) ? normalizeHex(hexInput) : '#007AFF'}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setHexInput(val);
                        setTintColor(val);
                      }}
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer'
                      }}
                    />
                    <Pipette size={18} color="#FFFFFF" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
                  </label>

                  {/* Text Input */}
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="#007AFF"
                      maxLength={7}
                      value={hexInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHexInput(val);
                        if (isValidHex(val)) {
                          setTintColor(normalizeHex(val));
                        }
                      }}
                      onBlur={() => {
                        if (isValidHex(hexInput)) {
                          const norm = normalizeHex(hexInput);
                          setHexInput(norm);
                          setTintColor(norm);
                        } else {
                          setHexInput(tintColor);
                        }
                      }}
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        fontSize: 15,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase'
                      }}
                    />
                  </div>

                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: isValidHex(hexInput) ? 'var(--green-light)' : 'var(--separator)',
                    color: isValidHex(hexInput) ? 'var(--green)' : 'var(--text-tertiary)',
                    whiteSpace: 'nowrap'
                  }}>
                    {isValidHex(hexInput) ? 'Válido' : 'Digite o HEX'}
                  </div>
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8, margin: 0, lineHeight: 1.4 }}>
                  Você pode escrever ou colar qualquer código HEX (ex: <code>#10B981</code>, <code>#8B5CF6</code>, <code>#FF6B6B</code>) ou clicar no seletor colorido para escolher visualmente.
                </p>
              </div>
            </GlassCard>
          </section>

          {/* Ambiente de Testes & Dados Mockados */}
          <section>
            <GlassCard>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                <Sparkles size={18} color="var(--blue)" />
                Ambiente de Testes & Demonstração
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                Deseja testar todas as funcionalidades do Financeiro OS? Clique no botão abaixo para popular instantaneamente a aplicação com dados realistas de 2026 (faturas, 4 cartões com limites e prioridades, metas com ícones personalizados, salários, e despesas com abertura completa em macro e micro-categorias).
              </p>
              
              <button
                type="button"
                onClick={handleLoadMockData}
                disabled={isSeedingMock}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  cursor: isSeedingMock ? 'not-allowed' : 'pointer',
                }}
              >
                {isSeedingMock ? (
                  <>
                    <div className="btn-spinner" style={{ width: 16, height: 16 }} />
                    Carregando dados...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Carregar Dados Mockados de Teste
                  </>
                )}
              </button>
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
                className="btn-ghost"
                style={{
                  color: 'var(--red)',
                  background: 'var(--red-light)',
                  fontWeight: 600,
                  padding: '10px 18px',
                  borderRadius: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={16} />
                Limpar Dados da Planilha
              </button>
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
        </div>
      </main>

      <ClearDataModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
      />
    </>
  );
}
