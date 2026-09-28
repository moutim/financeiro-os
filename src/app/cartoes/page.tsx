'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlassCard from '@/components/ui/GlassCard';
import CreditProjectionChart from '@/components/charts/CreditProjectionChart';
import CardFormModal, { CardData } from '@/components/cards/CardFormModal';
import { formatCurrency } from '@/lib/currency';
import { CreditCard as CreditCardIcon, TrendingDown, Plus, Pencil } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

import { useFinanceStore } from '@/lib/store';
import type { CreditCard, CardBrand } from '@/lib/types';

function generateProjection(cards: CreditCard[]) {
  const projection = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const totalLimit = cards.reduce((acc, card) => acc + card.limit, 0);

  for (let i = 0; i < 7; i++) {
    const projYear = currentMonth + i > 11 ? currentYear + Math.floor((currentMonth + i) / 12) : currentYear;
    const projMonth = (currentMonth + i) % 12;
    
    let monthUsed = 0;
    
    for (const card of cards) {
      if (!card.used) continue;
      
      if (!card.freedMonthKey) {
        // Fallback: se não tiver mês definido, simula uma queda de 15% ao mês (média comum de parcelamentos em 6-7x)
        monthUsed += Math.max(0, card.used - (card.used * 0.15 * i));
      } else {
        const [freeYearStr, freeMonthStr] = card.freedMonthKey.split('-');
        const freeYear = parseInt(freeYearStr);
        const freeMonth = parseInt(freeMonthStr) - 1;
        
        const totalMonthsToFree = (freeYear - currentYear) * 12 + (freeMonth - currentMonth);
        
        if (totalMonthsToFree <= 0) {
          if (i === 0) monthUsed += card.used;
        } else {
          // Queda linear
          const dropPerMonth = card.used / totalMonthsToFree;
          const remainingUsed = Math.max(0, card.used - (dropPerMonth * i));
          monthUsed += remainingUsed;
        }
      }
    }
    
    projection.push({
      month: monthNames[projMonth],
      utilizado: monthUsed,
      disponivel: totalLimit - monthUsed
    });
  }
  
  return projection;
}

export default function CartoesPage() {
  const { cards, addCard, updateCard, deleteCard, loadingState } = useFinanceStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardData | null>(null);

  const totalLimit = cards.reduce((acc, card) => acc + card.limit, 0);
  const totalUsed = cards.reduce((acc, card) => acc + card.used, 0);
  const totalAvailable = totalLimit - totalUsed;
  const overallUsagePct = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  const projectionData = generateProjection(cards);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 2 }}>
              Gestão de Crédito
            </p>
            <h1 className="text-title-1">
              Meus Cartões
            </h1>
          </div>
          <button className="btn-primary" onClick={openNewCard} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> Adicionar Cartão
          </button>
        </div>

        {/* Global Summary */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
          <GlassCard padding="20px" style={{ flex: '1 1 300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: 'var(--blue-light)', color: 'var(--blue)',
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
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--orange)' }}>{formatCurrency(totalUsed)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 2 }}>Disponível</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--green)' }}>{formatCurrency(totalAvailable)}</div>
              </div>
            </div>
            
            <div style={{ marginTop: 16, height: 6, borderRadius: 3, background: 'var(--separator)', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${Math.min(overallUsagePct, 100)}%`, 
                background: 'linear-gradient(90deg, var(--orange), #FF3B30)',
                borderRadius: 3
              }} />
            </div>
          </GlassCard>
        </div>

        {/* Cards List */}
        <h2 className="section-title" style={{ marginBottom: 16, fontSize: 17 }}>
          Seus Cartões
        </h2>
        <div className="cards-grid">
          {cards.map((card, index) => {
            const usagePct = card.limit > 0 ? (card.used / card.limit) * 100 : 0;
            const available = card.limit - card.used;
            
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
                      background: card.colorLight, 
                      color: card.color,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: `0 4px 12px ${card.color}15`
                    }}>
                      <CreditCardIcon size={22} />
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
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrency(card.used)}</div>
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
                    background: card.color,
                    borderRadius: 3
                  }} />
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginTop: 8, 
                  fontSize: 11, 
                  color: 'var(--text-tertiary)'
                }}>
                  <span>Utilizado {usagePct.toFixed(0)}%</span>
                  <span>Total {formatCurrency(card.limit)}</span>
                </div>
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

      {isModalOpen && (
        <CardFormModal 
          initialData={editingCard} 
          onSave={handleSaveCard} 
          onClose={() => setIsModalOpen(false)} 
          onDelete={handleDeleteCard}
        />
      )}
    </>
  );
}
