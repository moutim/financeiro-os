'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import GlassCard from '@/components/ui/GlassCard';
import CreditProjectionChart from '@/components/charts/CreditProjectionChart';
import CardFormModal, { CardData } from '@/components/cards/CardFormModal';
import PayInvoiceModal from '@/components/cards/PayInvoiceModal';
import { formatCurrency } from '@/lib/currency';
import { 
  CreditCard as CreditCardIcon, 
  TrendingDown, 
  TrendingUp, 
  Plus, 
  Pencil, 
  CheckCircle2, 
  ArrowUpDown, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MonthSelector from '@/components/transactions/MonthSelector';
import CreditAnalytics from '@/components/cards/CreditAnalytics';
import { getBankById } from '@/lib/banks';

import { useFinanceStore } from '@/lib/store';
import type { CreditCard, CardBrand, Transaction } from '@/lib/types';

type CardSortOption = 'priority' | 'limit-desc' | 'available-desc' | 'used-desc' | 'limit-asc' | 'name-asc';

function isLightCardColor(hex?: string | null): boolean {
  if (!hex) return false;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 185;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 185;
  }
  return false;
}

function darkenColor(hex?: string | null, percent = 35): string {
  if (!hex || hex.startsWith('var')) return '#121214';
  const clean = hex.replace('#', '').trim();
  if (clean.length < 6) return '#121214';
  const num = parseInt(clean, 16);
  if (isNaN(num)) return '#121214';
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `rgb(${R}, ${G}, ${B})`;
}

function EmvChip() {
  return (
    <div className="emv-chip" title="Chip EMV">
      <svg width="30" height="22" viewBox="0 0 30 22" fill="none" style={{ position: 'absolute' }}>
        <rect x="0.5" y="0.5" width="29" height="21" rx="4" stroke="#8A6D00" strokeWidth="0.6" opacity="0.45" />
        <path d="M0 7.5H10.5V14.5H0" stroke="#8A6D00" strokeWidth="0.6" opacity="0.5" />
        <path d="M30 7.5H19.5V14.5H30" stroke="#8A6D00" strokeWidth="0.6" opacity="0.5" />
        <path d="M10.5 0V22" stroke="#8A6D00" strokeWidth="0.6" opacity="0.5" />
        <path d="M19.5 0V22" stroke="#8A6D00" strokeWidth="0.6" opacity="0.5" />
        <circle cx="15" cy="11" r="2.8" stroke="#8A6D00" strokeWidth="0.6" opacity="0.5" />
      </svg>
    </div>
  );
}

function ContactlessWave({ color = 'currentColor' }: { color?: string }) {
  return (
    <span title="Aproximação Contactless" style={{ display: 'inline-flex', alignItems: 'center' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity="0.8">
        <path d="M8.5 16.5a5 5 0 0 1 0-9" />
        <path d="M12 19a8.5 8.5 0 0 1 0-14" />
        <path d="M15.5 21.5a12 12 0 0 1 0-19" />
      </svg>
    </span>
  );
}

function renderBrandLogo(brand: string, isLight: boolean) {
  const norm = (brand || '').toLowerCase();
  if (norm.includes('mastercard')) {
    return (
      <div style={{ display: 'flex', alignItems: 'center' }} title="Mastercard">
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#EB001B' }} />
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#F79E1B', marginLeft: -8, opacity: 0.95 }} />
      </div>
    );
  }
  if (norm.includes('visa')) {
    return (
      <span style={{
        fontSize: 14,
        fontWeight: 900,
        fontStyle: 'italic',
        letterSpacing: '0.08em',
        color: isLight ? '#1A1F71' : '#FFFFFF',
      }}>
        VISA
      </span>
    );
  }
  if (norm.includes('elo')) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} title="Elo">
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00A4E0' }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4123' }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFCB05' }} />
        <span style={{ fontSize: 11, fontWeight: 800, marginLeft: 2, color: isLight ? '#1E1E1E' : '#FFFFFF' }}>elo</span>
      </div>
    );
  }
  if (norm.includes('amex')) {
    return (
      <span style={{
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: '0.08em',
        border: `1px solid ${isLight ? '#1A1F71' : '#FFFFFF'}`,
        color: isLight ? '#1A1F71' : '#FFFFFF',
        padding: '1px 3px',
        borderRadius: 2
      }}>
        AMEX
      </span>
    );
  }
  if (norm.includes('nubank')) {
    return (
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em', color: isLight ? '#8A05BE' : '#FFFFFF' }}>
        nu
      </span>
    );
  }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: isLight ? '#1D1D1F' : '#FFFFFF', opacity: 0.9 }}>
      {brand || 'CARD'}
    </span>
  );
}

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
  const {
    cards,
    transactions,
    addCard,
    updateCard,
    deleteCard,
    loadingState,
    selectedMonth,
    getMonthSummary,
    getMonthIncomes,
  } = useFinanceStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardData | null>(null);
  const [payingCard, setPayingCard] = useState<{card: CreditCard, amount: number, transactions: Transaction[]} | null>(null);
  const [sortOption, setSortOption] = useState<CardSortOption>('priority');

  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const amount = 360;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    updateScrollButtons();
    const handleResize = () => updateScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [cards.length]);

  const monthSummary = getMonthSummary(selectedMonth);
  const salary = monthSummary.income > 0 
    ? monthSummary.income 
    : getMonthIncomes(selectedMonth).reduce((acc, inc) => acc + inc.amount, 0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('financeiro_cards_sort');
      if (saved && ['priority', 'limit-desc', 'available-desc', 'used-desc', 'limit-asc', 'name-asc'].includes(saved)) {
        setSortOption(saved as CardSortOption);
      }
    } catch (_) {}
  }, []);

  const handleSortChange = (opt: CardSortOption) => {
    setSortOption(opt);
    try {
      localStorage.setItem('financeiro_cards_sort', opt);
    } catch (_) {}
  };

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

  const sortedCards = [...cardsWithRealData].sort((a, b) => {
    switch (sortOption) {
      case 'priority': {
        const pA = a.priority ?? 999;
        const pB = b.priority ?? 999;
        if (pA !== pB) return pA - pB;
        return a.name.localeCompare(b.name);
      }
      case 'limit-desc':
        return b.limit - a.limit;
      case 'limit-asc':
        return a.limit - b.limit;
      case 'available-desc': {
        const availA = Math.max(0, a.limit - a.realUsed);
        const availB = Math.max(0, b.limit - b.realUsed);
        return availB - availA;
      }
      case 'used-desc':
        return b.realUsed - a.realUsed;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: 2 }}>
              Gestão de Crédito
            </p>
            <h1 className="text-title-1" style={{ margin: 0 }}>
              Meus Cartões
            </h1>
          </div>
          <button 
            className="btn-primary" 
            onClick={openNewCard} 
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={16} /> Novo Cartão
          </button>
        </div>

        {/* ── Filtro de Data (Colocado EM CIMA do container dos cartões) ── */}
        <div style={{ marginBottom: 20 }}>
          <MonthSelector />
        </div>

        {cards.length === 0 ? (
          <GlassCard padding="32px" style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--blue-light)',
              color: 'var(--blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CreditCardIcon size={28} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
              Nenhum cartão cadastrado
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.5 }}>
              Cadastre seus cartões de crédito para acompanhar faturas, controlar limites disponíveis e monitorar o comprometimento da sua renda.
            </p>
            <button
              className="btn-primary"
              onClick={openNewCard}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '0 auto' }}
            >
              <Plus size={16} /> Cadastrar Primeiro Cartão
            </button>
          </GlassCard>
        ) : (
          /* ── 1. Primeiro Container: Carrossel de Cartões ── */
          <div className="cards-carousel-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 className="section-title" style={{ margin: 0, fontSize: 17 }}>
                  Seus Cartões
                </h2>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                  {sortedCards.length}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  • Deslize para navegar
                </span>
              </div>

            {/* Controles de Ordenação e Setas do Carrossel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowUpDown size={14} color="var(--blue)" />
                <select
                  className="form-select"
                  value={sortOption}
                  onChange={(e) => handleSortChange(e.target.value as CardSortOption)}
                  style={{
                    padding: '6px 28px 6px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 10,
                    background: 'var(--surface)',
                    border: '1px solid var(--separator)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="priority">⭐ Prioridade (1º, 2º...)</option>
                  <option value="limit-desc">Maior Limite</option>
                  <option value="available-desc">Maior Disponível</option>
                  <option value="used-desc">Mais Utilizado (Fatura)</option>
                  <option value="limit-asc">Menor Limite</option>
                  <option value="name-asc">Nome (A - Z)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => handleScroll('left')}
                  disabled={!canScrollLeft}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: '1px solid var(--separator)',
                    background: 'var(--surface)',
                    color: canScrollLeft ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    cursor: canScrollLeft ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: canScrollLeft ? 1 : 0.4,
                    transition: 'all 0.15s ease',
                  }}
                  title="Anterior"
                  aria-label="Cartão anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => handleScroll('right')}
                  disabled={!canScrollRight}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: '1px solid var(--separator)',
                    background: 'var(--surface)',
                    color: canScrollRight ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    cursor: canScrollRight ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: canScrollRight ? 1 : 0.4,
                    transition: 'all 0.15s ease',
                  }}
                  title="Próximo"
                  aria-label="Próximo cartão"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Track do Carrossel */}
          <div 
            ref={carouselRef}
            onScroll={updateScrollButtons}
            className="cards-carousel"
          >
            {sortedCards.map((card, index) => {
              const usagePct = card.limit > 0 ? (card.realUsed / card.limit) * 100 : 0;
              const available = Math.max(0, card.limit - card.realUsed);
              const bank = getBankById(card.bankId);
              const rawCardColor = bank?.color || card.color || '#1E1E1E';
              const isLight = isLightCardColor(rawCardColor);
              const last4 = card.lastDigits ? card.lastDigits.split('-').pop() : '••••';

              return (
                <div key={card.id} className="cards-carousel-item">
                  <div 
                    className={`real-physical-card stagger ${isLight ? 'card-theme-light' : ''}`}
                    style={{ animationDelay: `${index * 60}ms`, height: '100%' }}
                  >
                    {/* ── Realistic Physical Card Face ── */}
                    <div 
                      className={`card-face-preview ${isLight ? 'is-white-card' : ''}`}
                      style={{
                        background: isLight 
                          ? 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 50%, #ECEEF1 100%)'
                          : `linear-gradient(135deg, ${rawCardColor} 0%, ${darkenColor(rawCardColor, 35)} 100%)`,
                        color: isLight ? '#1D1D1F' : '#FFFFFF',
                      }}
                    >
                      <div className="card-sheen" />

                      {/* Card Top: Bank/Card Name + Priority Badge + Edit Action */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {bank ? (
                            <img 
                              src={`https://www.google.com/s2/favicons?domain=${bank.domain}&sz=64`} 
                              alt={bank.name}
                              width={22}
                              height={22}
                              style={{ objectFit: 'contain', borderRadius: 5, background: '#FFFFFF', padding: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : null}
                          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', textShadow: isLight ? 'none' : '0 1px 2px rgba(0,0,0,0.35)' }}>
                            {card.name}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {card.priority ? (
                            <div style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 6,
                              background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.2)',
                              color: isLight ? '#1D1D1F' : '#FFFFFF',
                              backdropFilter: 'blur(4px)',
                              letterSpacing: '0.02em',
                            }}>
                              {card.priority === 1 ? '⭐ 1º Principal' : `${card.priority}º`}
                            </div>
                          ) : null}

                          <button 
                            onClick={() => openEditCard(card)}
                            style={{
                              background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.18)',
                              border: 'none',
                              color: isLight ? '#1D1D1F' : '#FFFFFF',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              padding: 0,
                              transition: 'opacity 0.15s ease',
                            }}
                            title="Editar Cartão"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Card Middle: EMV Chip + Contactless Wave */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 10px', zIndex: 1 }}>
                        <EmvChip />
                        <ContactlessWave color={isLight ? '#1D1D1F' : '#FFFFFF'} />
                      </div>

                      {/* Card Bottom: Masked Number & Brand Emblem */}
                      <div style={{ zIndex: 1 }}>
                        <div 
                          className="card-number-embossed" 
                          style={{ 
                            color: isLight ? '#2C2C2E' : '#FFFFFF',
                            textShadow: isLight ? '0 1px 0 rgba(255,255,255,0.9), 0 -1px 0 rgba(0,0,0,0.15)' : '0 -1px 0 rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.2)',
                            marginBottom: 6,
                          }}
                        >
                          •••• •••• •••• {last4}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', opacity: 0.7 }}>
                            VALID THRU
                          </span>
                          {renderBrandLogo(card.brand, isLight)}
                        </div>
                      </div>
                    </div>

                    {/* ── Financial Details & Metrics ── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Crédito Utilizado</div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrency(card.realUsed)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Limite Disponível</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>{formatCurrency(available)}</div>
                      </div>
                    </div>

                    {/* High usage alert */}
                    {usagePct >= 80 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--red)', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                        <AlertTriangle size={12} />
                        <span>Atenção: {usagePct.toFixed(0)}% do limite comprometido</span>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--separator)', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${Math.min(usagePct, 100)}%`, 
                        background: rawCardColor,
                        borderRadius: 3
                      }} />
                    </div>
                    
                    {/* Invoice Footer */}
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

                    {/* Pay Invoice Action */}
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

            {/* End Item: + Novo Cartão */}
            <div className="cards-carousel-item" style={{ display: 'flex' }}>
              <button
                onClick={openNewCard}
                style={{
                  width: '100%',
                  minHeight: 320,
                  borderRadius: 20,
                  border: '2px dashed var(--separator)',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  color: 'var(--text-tertiary)',
                  transition: 'all 0.2s ease',
                  padding: 24,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--blue)';
                  e.currentTarget.style.color = 'var(--blue)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--separator)';
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'var(--blue-light)',
                  color: 'var(--blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Plus size={24} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Novo Cartão</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Adicionar novo limite de crédito</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

        {/* ── 2. Cabeçalho de Análises ── */}
        <div style={{ marginBottom: 20 }}>
          <h2 className="section-title" style={{ margin: 0, fontSize: 18 }}>
            Análise de Crédito & Faturas
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '2px 0 0 0' }}>
            Composição de limites, impacto salarial e gastos por categoria
          </p>
        </div>

        {/* ── 3. Componente de Análise de Crédito (com display amplo para categorias) ── */}
        <CreditAnalytics
          cards={cardsWithRealData}
          salary={salary}
          transactions={transactions}
          selectedMonth={selectedMonth}
        />

        {/* ── 4. Gráfico Redesenhado de Projeção de Liberação de Crédito ── */}
        <div style={{ marginTop: 28, marginBottom: 32 }}>
          <h2 className="section-title" style={{ marginBottom: 16, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="var(--green)" />
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
        </div>

      </main>

      {/* FAB - Estilo Padrão do Sistema */}
      <button className="fab" onClick={openNewCard} aria-label="Novo Cartão">
        <Plus size={24} strokeWidth={2.5} />
      </button>

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
