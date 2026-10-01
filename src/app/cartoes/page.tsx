'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlassCard from '@/components/ui/GlassCard';
import CreditProjectionChart from '@/components/charts/CreditProjectionChart';
import CardFormModal, { CardData } from '@/components/cards/CardFormModal';
import PayInvoiceModal from '@/components/cards/PayInvoiceModal';
import { formatCurrency } from '@/lib/currency';
import { CreditCard as CreditCardIcon, TrendingDown, Plus, Pencil, CheckCircle2 } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MonthSelector from '@/components/transactions/MonthSelector';
import { getBankById } from '@/lib/banks';

import { useFinanceStore } from '@/lib/store';
import type { CreditCard, CardBrand, Transaction } from '@/lib/types';

function generateProjection(cardsWithRealData: any[]) {
  const projection = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const totalLimit = cardsWithRealData.reduce((acc, card) => acc + card.limit, 0);

  for (let i = 0; i < 7; i++) {
    const projYear = currentMonth + i > 11 ? currentYear + Math.floor((currentMonth + i) / 12) : currentYear;
    const projMonth = (currentMonth + i) % 12;
    const projMonthKeyStr = `${projYear}-${String(projMonth + 1).padStart(2, '0')}`;
    
    let monthUsed = 0;
    
    for (const card of cardsWithRealData) {
      if (card.limit === 0 && card.realUsed === 0) continue;
      
      let projectedManualUsed = 0;
      if (!card.freedMonthKey) {
        // Fallback da parte manual
        projectedManualUsed = Math.max(0, card.used - (card.used * 0.15 * i));
      } else {
        const [freeYearStr, freeMonthStr] = card.freedMonthKey.split('-');
        const freeYear = parseInt(freeYearStr);
        const freeMonth = parseInt(freeMonthStr) - 1;
        
        const totalMonthsToFree = (freeYear - currentYear) * 12 + (freeMonth - currentMonth);
        
        if (totalMonthsToFree <= 0) {
          projectedManualUsed = i === 0 ? card.used : 0;
        } else {
          const dropPerMonth = card.used / totalMonthsToFree;
          projectedManualUsed = Math.max(0, card.used - (dropPerMonth * i));
        }
      }

      const currentMonthKeyStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      // Consumo real pelas transações a partir daquele mês da projeção
      const projectedRealUsed = card.cardTransactions
        .filter((t: any) => !t.isPaid && (t.monthKey >= projMonthKeyStr || t.monthKey < currentMonthKeyStr))
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      monthUsed += (projectedManualUsed + projectedRealUsed);
    }
    
    projection.push({
      month: monthNames[projMonth],
      utilizado: monthUsed,
      disponivel: Math.max(0, totalLimit - monthUsed)
    });
  }
  
  return projection;
}

export default function CartoesPage() {
  const { cards, transactions, addCard, updateCard, deleteCard, loadingState, selectedMonth } = useFinanceStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const [payingCard, setPayingCard] = useState<{card: CreditCard, amount: number, transactions: Transaction[]} | null>(null);

  const now = new Date();
  const currentMonthKeyStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const cardsWithRealData = cards.map(card => {
    const cardTransactions = transactions.filter(t => t.cardId === card.id && (!t.parentId || t.parentId === 'SHARED'));
    
    const unpaidInvoicesAmount = cardTransactions
      .filter(t => !t.isPaid)
      .reduce((sum, t) => sum + t.amount, 0);

    const currentInvoiceAmount = cardTransactions
      .filter(t => t.monthKey === selectedMonth)
      .reduce((sum, t) => sum + t.amount, 0);

    const unpaidCurrentMonth = cardTransactions.filter(t => t.monthKey === selectedMonth && !t.isPaid);

    const realUsed = card.used + unpaidInvoicesAmount;
    
    return {
      ...card,
      realUsed,
      currentInvoiceAmount,
      unpaidCurrentMonth,
      cardTransactions
    };
  });

  const totalLimit = cardsWithRealData.reduce((acc, card) => acc + card.limit, 0);
  const totalUsed = cardsWithRealData.reduce((acc, card) => acc + card.realUsed, 0);
  const totalAvailable = Math.max(0, totalLimit - totalUsed);
  const overallUsagePct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  const projectionData = generateProjection(cardsWithRealData);

  const handleSaveCard = async (cardData: CardData) => {
    const card: CreditCard = { ...cardData, brand: cardData.brand as CardBrand };
    
    if (editingCard || cards.find(c => c.id === card.id)) {
      await updateCard(card.id, card);
    } else {
      await addCard(card);
    }
    setIsModalOpen(false);
    setEditingCard(null);
  };

  const handleDeleteCard = async (id: string) => {
    await deleteCard(id);
    setIsModalOpen(false);
    setEditingCard(null);
  };

  const openNewCard = () => {
    setEditingCard(null);
    setIsModalOpen(true);
  };

  const openEditCard = (card: CardData) => {
    setEditingCard(card);
    setIsModalOpen(true);
  };

  if (loadingState === 'idle' || loadingState === 'loading') {
    return (
      <>
        <Sidebar />
        <main className="main-content">
          <LoadingSpinner message="Sincronizando com Google Sheets..." />
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="main-content">
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 2 }}>
              Gestão de Crédito
            </p>
            <h1 className="text-title-1">
              Meus Cartões
            </h1>
          </div>
        </div>

        {/* ── Month Selector ── */}
        <div style={{ marginBottom: 20 }}>
          <MonthSelector />
        </div>

        {/* Global Summary */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
          <GlassCard padding="20px" style={{ flex: '1 1 300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: 'var(--blue)', color: '#FFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CreditCardIcon size={20} />
              </div>
              <div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>Limite Total</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{formatCurrency(totalLimit)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 2 }}>Utilizado</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: overallUsagePct >= 90 ? 'var(--red)' : 'var(--text-primary)' }}>{formatCurrency(totalUsed)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 2 }}>Disponível</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--green)' }}>{formatCurrency(totalAvailable)}</div>
              </div>
            </div>
            
            <div style={{ marginTop: 16, height: 6, borderRadius: 3, background: 'var(--separator)', overflow: 'hidden' }}>
              <div 
                className="progress-bar-fill"
                style={{ 
                  width: `${Math.min(overallUsagePct, 100)}%`, 
                  background: 'linear-gradient(90deg, var(--blue-light), var(--blue))',
                }} 
              />
            </div>
          </GlassCard>
        </div>

        {/* Cards List */}
        <h2 className="section-title" style={{ marginBottom: 16, fontSize: 17 }}>
          Seus Cartões
        </h2>
        <div className="cards-grid">
          {cardsWithRealData.map((card, index) => {
            const usagePct = card.limit > 0 ? (card.realUsed / card.limit) * 100 : 0;
            const available = Math.max(0, card.limit - card.realUsed);
            const bank = getBankById(card.bankId);
            
            return (
              <GlassCard 
                key={card.id} 
                padding="16px" 
                className="stagger"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      width: 44, 
                      height: 44, 
                      borderRadius: 12, 
                      background: bank ? 'transparent' : card.color, 
                      color: '#FFF',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: bank ? 'none' : `0 4px 12px ${card.color}15`,
                      overflow: 'hidden'
                    }}>
                      {bank ? (
                        <img 
                          src={`https://www.google.com/s2/favicons?domain=${bank.domain}&sz=128`} 
                          alt={bank.name}
                          width={32}
                          height={32}
                          style={{ objectFit: 'contain', borderRadius: 8 }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.style.background = card.color;
                              parent.style.boxShadow = `0 4px 12px ${card.color}15`;
                            }
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                            }
                          }}
                        />
                      ) : null}
                      <CreditCardIcon size={22} style={{ display: bank ? 'none' : 'block' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700 }}>{card.name}</h3>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {card.brand}{card.lastDigits ? ` •••• ${card.lastDigits.split('-').pop()}` : ''}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => openEditCard(card)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
                    title="Editar Cartão"
                  >
                    <Pencil size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 2 }}>Crédito Utilizado</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrency(card.realUsed)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 2 }}>Limite Disponível</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>{formatCurrency(available)}</div>
                  </div>
                </div>

                <div style={{ height: 6, borderRadius: 3, background: 'var(--separator)', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${Math.min(usagePct, 100)}%`, 
                    background: bank?.color || card.color,
                    borderRadius: 3
                  }} />
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginTop: 12, 
                  paddingTop: 12,
                  borderTop: '1px solid var(--separator)',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Fatura do Mês</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(card.currentInvoiceAmount)}</div>
                      {card.currentInvoiceAmount > 0 && card.unpaidCurrentMonth.length === 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)', fontSize: 11, fontWeight: 600, background: 'var(--green-light)', padding: '2px 6px', borderRadius: 10 }}>
                          <CheckCircle2 size={12} strokeWidth={2.5} />
                          Paga
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Limite Total</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{formatCurrency(card.limit)}</div>
                  </div>
                </div>

                {card.unpaidCurrentMonth.length > 0 && (
                  <button 
                    onClick={() => setPayingCard({ card, amount: card.currentInvoiceAmount, transactions: card.unpaidCurrentMonth })}
                    style={{
                      width: '100%',
                      marginTop: 12,
                      padding: '10px',
                      background: 'var(--green-light)',
                      color: 'var(--green)',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'opacity 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <CheckCircle2 size={16} strokeWidth={2.5} />
                    Pagar Fatura
                  </button>
                )}
              </GlassCard>
            );
          })}
        </div>

        {/* Projection Chart */}
        <h2 className="section-title" style={{ marginBottom: 16, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingDown size={18} color="var(--green)" />
          Projeção de Liberação de Crédito
        </h2>
        <GlassCard padding="20px">
          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <div style={{ 
                width: 64, height: 64, borderRadius: 16, background: 'var(--separator)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' 
              }}>
                <CreditCardIcon size={32} style={{ opacity: 0.5 }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                Ainda não há dados de crédito
              </h3>
              <p style={{ fontSize: 14, maxWidth: 420, margin: '0 auto' }}>
                Adicione seus cartões e limites para acompanhar a projeção de liberação de crédito, visualizar faturas e ter um controle mais inteligente dos seus gastos.
              </p>
              <button 
                className="btn-primary" 
                onClick={openNewCard} 
                style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Plus size={16} /> Cadastrar Cartão
              </button>
            </div>
          ) : (
            <CreditProjectionChart data={projectionData} />
          )}
        </GlassCard>

      </main>

      {/* FAB - Estilo Padrão do Sistema */}
      <button className="fab" onClick={openNewCard} aria-label="Novo Cartão">
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {cards.length === 0 && (
        <div 
          className="fab-menu animate-fade-in-up" 
          style={{
            background: 'var(--blue)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: 14,
            boxShadow: 'var(--shadow-lg)',
            width: '240px',
            pointerEvents: 'none',
            animationDelay: '500ms',
            animationFillMode: 'both'
          }}
        >
          {/* Seta apontando pro botão */}
          <div style={{ position: 'absolute', bottom: -5, right: 22, width: 12, height: 12, background: 'var(--blue)', transform: 'rotate(45deg)', borderRadius: 2 }} />
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.01em' }}>Seus cartões aqui</h4>
          <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>Cadastre seu primeiro cartão para organizar seus limites e acompanhar as faturas.</p>
        </div>
      )}

      {isModalOpen && (
        <CardFormModal 
          initialData={editingCard} 
          onSave={handleSaveCard} 
          onClose={() => setIsModalOpen(false)} 
          onDelete={handleDeleteCard}
        />
      )}

      {payingCard && (
        <PayInvoiceModal
          card={payingCard.card}
          invoiceAmount={payingCard.amount}
          transactionsToPay={payingCard.transactions}
          onClose={() => setPayingCard(null)}
        />
      )}
    </>
  );
}
