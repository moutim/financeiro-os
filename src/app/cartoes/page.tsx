'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/layout/Sidebar';
import CardFormModal, { CardData } from '@/components/cards/CardFormModal';
import PayInvoiceModal from '@/components/cards/PayInvoiceModal';
import CreditProjectionSection from '@/components/cards/CreditProjectionSection';
import WalletCardFace from '@/components/cards/WalletCardFace';
import CreditLimitComposition from '@/components/cards/CreditLimitComposition';
import SectionCard from '@/components/ui/SectionCard';
import ToolbarSelect from '@/components/ui/ToolbarSelect';
import { DetailedOnly } from '@/components/mode/ModeSwitch';
import { formatCurrency } from '@/lib/currency';
import { Plus, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, WalletCards, ArrowUpDown } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MonthSelector from '@/components/transactions/MonthSelector';
import { getBankById } from '@/lib/banks';
import { useIsDetailedMode } from '@/lib/appConfigStore';
import { useCarousel } from '@/hooks/useCarousel';
import {
  buildCardsWithRealData,
  sortCards,
  CARD_SORT_OPTIONS,
  type CardSortOption,
} from '@/lib/creditCards';

import { useFinanceStore } from '@/lib/store';
import type { CreditCard, CardBrand, Transaction } from '@/lib/types';

// Carregada só no modo detalhado (análises e gráficos pesados)
const CreditDetailedSection = dynamic(() => import('@/components/cards/CreditDetailedSection'));

const SORT_STORAGE_KEY = 'financeiro_cards_sort';

function readSavedSort(): CardSortOption {
  try {
    const saved = localStorage.getItem(SORT_STORAGE_KEY);
    if (CARD_SORT_OPTIONS.some((o) => o.id === saved)) return saved as CardSortOption;
  } catch {
    // localStorage indisponível (SSR ou modo privado)
  }
  return 'priority';
}

function CarouselArrow({ direction, enabled, onClick }: { direction: 'left' | 'right'; enabled: boolean; onClick: () => void }) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      className="toolbar-icon-button"
      onClick={onClick}
      disabled={!enabled}
      title={direction === 'left' ? 'Anterior' : 'Próximo'}
      aria-label={direction === 'left' ? 'Cartão anterior' : 'Próximo cartão'}
    >
      <Icon size={17} strokeWidth={2.25} />
    </button>
  );
}

export default function CartoesPage() {
  const {
    cards,
    transactions,
    addCard,
    updateCard,
    deleteCard,
    loadingState,
    selectedMonth,
    getMonthSummary,
  } = useFinanceStore();
  const isDetailed = useIsDetailedMode();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const [payingCard, setPayingCard] = useState<{card: CreditCard, amount: number, transactions: Transaction[]} | null>(null);
  // Ordenação só existe no modo detalhado; a página só renderiza cartões após
  // carregar os dados no cliente, então ler o localStorage aqui não afeta a hidratação.
  const [sortOption, setSortOption] = useState<CardSortOption>(readSavedSort);
  const { ref: carouselRef, canScrollLeft, canScrollRight, scroll: scrollCarousel } = useCarousel();

  const handleSortChange = (option: CardSortOption) => {
    setSortOption(option);
    try {
      localStorage.setItem(SORT_STORAGE_KEY, option);
    } catch {
      // ignora: a ordenação continua valendo nesta sessão
    }
  };

  const salary = getMonthSummary(selectedMonth).income;
  const cardsWithRealData = buildCardsWithRealData(cards, transactions, selectedMonth);
  // Detalhado: ordenação escolhida pelo usuário. Simples: fixa, do maior para o menor limite.
  const visibleCards = sortCards(cardsWithRealData, isDetailed ? sortOption : 'limit-desc');

  const totalLimit = cardsWithRealData.reduce((acc, card) => acc + card.limit, 0);
  const totalUsed = cardsWithRealData.reduce((acc, card) => acc + card.realUsed, 0);

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Composição do limite somado (substitui o antigo card "Limite Total") */}
          <CreditLimitComposition totalLimit={totalLimit} totalUsed={totalUsed} />

          {/* Seus Cartões (carrossel) */}
          <SectionCard
            icon={WalletCards}
            title={
              <>
                Seus Cartões
                {cards.length > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                    {cards.length}
                  </span>
                )}
              </>
            }
            description={cards.length > 1 ? 'Deslize para navegar entre os cartões' : undefined}
            actions={cards.length > 0 ? (
              <>
                <DetailedOnly>
                  {cards.length > 1 && (
                    <ToolbarSelect
                      icon={ArrowUpDown}
                      value={sortOption}
                      onChange={(e) => handleSortChange(e.target.value as CardSortOption)}
                      aria-label="Ordenar cartões"
                      title="Ordenar cartões"
                    >
                      {CARD_SORT_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </ToolbarSelect>
                  )}
                </DetailedOnly>
                <div className="carousel-arrows" style={{ display: 'flex', gap: 6 }}>
                  <CarouselArrow direction="left" enabled={canScrollLeft} onClick={() => scrollCarousel('left')} />
                  <CarouselArrow direction="right" enabled={canScrollRight} onClick={() => scrollCarousel('right')} />
                </div>
              </>
            ) : undefined}
          >
            {cards.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
                Nenhum cartão cadastrado ainda. Toque em + para adicionar o primeiro.
              </p>
            ) : (
              <div ref={carouselRef} className="cards-carousel">
                {visibleCards.map((card, index) => {
                  const usagePct = card.limit > 0 ? (card.realUsed / card.limit) * 100 : 0;
                  const available = Math.max(0, card.limit - card.realUsed);
                  const bank = getBankById(card.bankId);
            
                  return (
                    <div key={card.id} className="cards-carousel-item">
                      <div
                        className="cards-carousel-card stagger"
                        // container query: nome, número e valores encolhem junto com o cartão (unidades cqw)
                        style={{ animationDelay: `${index * 60}ms`, containerType: 'inline-size' }}
                      >
                        <WalletCardFace card={card} onEdit={() => openEditCard(card)} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 'clamp(10px, 5cqw, 12px)', color: 'var(--text-tertiary)', marginBottom: 2 }}>Crédito Utilizado</div>
                            <div style={{ fontSize: 'clamp(14px, 7.4cqw, 18px)', fontWeight: 700 }}>{formatCurrency(card.realUsed)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 'clamp(10px, 5cqw, 12px)', color: 'var(--text-tertiary)', marginBottom: 2 }}>Limite Disponível</div>
                            <div style={{ fontSize: 'clamp(12px, 5.8cqw, 14px)', fontWeight: 600, color: 'var(--green)' }}>{formatCurrency(available)}</div>
                          </div>
                        </div>

                        <DetailedOnly>
                          {usagePct >= 80 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--red)', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                              <AlertTriangle size={12} />
                              <span>Atenção: {usagePct.toFixed(0)}% do limite comprometido</span>
                            </div>
                          )}
                        </DetailedOnly>

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(card.currentInvoiceAmount)}</div>
                              <DetailedOnly>
                                {salary > 0 && card.currentInvoiceAmount > 0 && (
                                  <span style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: (card.currentInvoiceAmount / salary) > 0.25 ? 'var(--red)' : 'var(--blue)',
                                    background: (card.currentInvoiceAmount / salary) > 0.25 ? 'var(--red-light)' : 'var(--blue-light)',
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                  }}>
                                    {((card.currentInvoiceAmount / salary) * 100).toFixed(1)}% do salário
                                  </span>
                                )}
                              </DetailedOnly>
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
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Análise de crédito e faturas por categoria (Detalhado) */}
          <DetailedOnly>
            <CreditDetailedSection
              cards={visibleCards}
              transactions={transactions}
              selectedMonth={selectedMonth}
              salary={salary}
            />
          </DetailedOnly>

          {/* Projeção de liberação de crédito (ambos os modos) */}
          <CreditProjectionSection cards={visibleCards} onAddCard={openNewCard} />
        </div>
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
