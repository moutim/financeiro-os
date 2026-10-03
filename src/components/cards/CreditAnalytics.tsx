'use client';

import React, { useState } from 'react';
import SectionCard from '@/components/ui/SectionCard';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import { CategoryDistribution, CategoryRanking, MacroMicroGroups } from '@/components/charts/CategoryBreakdown';
import { isLightCardColor } from '@/components/cards/WalletCardFace';
import { formatCurrency } from '@/lib/currency';
import { getBankById } from '@/lib/banks';
import { useCategoryTaxonomy } from '@/lib/taxonomy';
import { availableCredit } from '@/lib/creditCards';
import {
  Wallet,
  CreditCard,
  AlertCircle,
  TrendingDown,
  PieChart,
  BarChart3,
  Layers,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';
import type { Transaction } from '@/lib/types';

// Mesmas visões da Análise Avançada de Gastos (Categorias), com os gastos no cartão
const CATEGORY_TABS = [
  { id: 'donut', label: 'Distribuição', icon: PieChart },
  { id: 'bars', label: 'Ranking', icon: BarChart3 },
  { id: 'micro', label: 'Macro › Micro', icon: Layers },
] as const;

type CategoryTab = (typeof CATEGORY_TABS)[number]['id'];

const formatPurchases = (count: number) => `${count} ${count === 1 ? 'compra' : 'compras'}`;

interface CardWithRealData {
  id: string;
  name: string;
  limit: number;
  used: number;
  realUsed: number;
  currentInvoiceAmount: number;
  unpaidCurrentMonth: Transaction[];
  color: string;
  brand: string;
  priority?: number | null;
  bankId?: string | null;
}

interface CreditAnalyticsProps {
  cards: CardWithRealData[];
  salary: number;
  transactions: Transaction[];
  selectedMonth: string;
}

export default function CreditAnalytics({
  cards,
  salary,
  transactions,
  selectedMonth,
}: CreditAnalyticsProps) {
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('donut');
  const taxonomy = useCategoryTaxonomy();
  const getCategoryConfig = taxonomy.getConfig;

  // Cálculos globais
  const totalUsed = cards.reduce((sum, c) => sum + c.realUsed, 0);
  const totalMonthInvoices = cards.reduce((sum, c) => sum + c.currentInvoiceAmount, 0);

  // Comprometimento com o Salário
  const invoiceSalaryPct = salary > 0 ? (totalMonthInvoices / salary) * 100 : 0;
  const totalDebtSalaryPct = salary > 0 ? (totalUsed / salary) * 100 : 0;

  // Gastos no Crédito por Categoria Macro e Micro
  const creditTxs = transactions
    .filter((t) => t.monthKey === selectedMonth && t.cardId && (!t.parentId || t.parentId === 'SHARED'))
    .map(taxonomy.normalize);

  const creditMacroMap: Record<string, { total: number; count: number; micros: Record<string, number> }> = {};
  creditTxs.forEach((t) => {
    const cat = t.category || 'Outros';
    if (!creditMacroMap[cat]) {
      creditMacroMap[cat] = { total: 0, count: 0, micros: {} };
    }
    creditMacroMap[cat].total += t.amount;
    creditMacroMap[cat].count += 1;

    const sub = (t.subcategory && t.subcategory.trim()) || `Geral (${cat})`;
    creditMacroMap[cat].micros[sub] = (creditMacroMap[cat].micros[sub] ?? 0) + t.amount;
  });

  // Base das proporções: a soma das categorias. Costuma ser igual ao total das faturas,
  // mas inclui compras de cartões já excluídos; assim o anel sempre fecha em 100%.
  const creditTotal = Object.values(creditMacroMap).reduce((sum, c) => sum + c.total, 0);

  const sortedCreditCategories = Object.entries(creditMacroMap)
    .map(([cat, info]) => ({
      cat,
      total: info.total,
      count: info.count,
      pct: creditTotal > 0 ? info.total / creditTotal : 0,
      config: getCategoryConfig(cat),
      micros: Object.entries(info.micros).sort((a, b) => b[1] - a[1]),
    }))
    .sort((a, b) => b.total - a.total);

  // Status de saúde financeira do comprometimento
  const getSalaryCommitmentBadge = () => {
    if (salary === 0) {
      return {
        label: 'Salário não informado',
        color: 'var(--text-tertiary)',
        bg: 'var(--bg-2)',
        icon: Info,
        desc: 'Cadastre suas receitas para calcular o comprometimento exato.',
      };
    }
    if (invoiceSalaryPct <= 30) {
      return {
        label: 'Comprometimento Saudável',
        color: 'var(--green)',
        bg: 'var(--green-light)',
        icon: ShieldCheck,
        desc: 'Faturas consom até 30% da sua renda. Padrão recomendado por consultores.',
      };
    }
    if (invoiceSalaryPct <= 50) {
      return {
        label: 'Comprometimento Moderado',
        color: 'var(--orange)',
        bg: 'var(--orange-light)',
        icon: AlertCircle,
        desc: 'Faturas entre 30% e 50% da renda. Monitore novas compras parceladas.',
      };
    }
    return {
      label: 'Comprometimento Elevado',
      color: 'var(--red)',
      bg: 'var(--red-light)',
      icon: ShieldAlert,
      desc: 'Faturas acima de 50% da sua renda. Risco alto de rolamento de dívida.',
    };
  };

  // Peso no salário: cartões da maior para a menor fatura
  const cardsByInvoice = [...cards].sort((a, b) => b.currentInvoiceAmount - a.currentInvoiceAmount);
  const maxInvoice = cardsByInvoice[0]?.currentInvoiceAmount || 1;

  const statusBadge = getSalaryCommitmentBadge();
  const StatusIcon = statusBadge.icon;

  if (cards.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── 1. Comprometimento da Renda (a Composição de Limite fica no topo da página) ── */}
      <SectionCard
        icon={Wallet}
        title="Impacto na Renda"
        description="Fatura do mês vs salário líquido"
        actions={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 20,
            background: statusBadge.bg,
            color: statusBadge.color,
            fontSize: 11,
            fontWeight: 700,
          }}>
            <StatusIcon size={13} />
            <span>{statusBadge.label}</span>
          </div>
        }
      >
        {/* Percentual em destaque e valores */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>COMPROMETIMENTO DA RENDA</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: statusBadge.color, letterSpacing: '-0.02em', marginTop: 2 }}>
              {salary > 0 ? `${invoiceSalaryPct.toFixed(1)}%` : '—'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>FATURAS DO MÊS / SALÁRIO</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
              {formatCurrency(totalMonthInvoices)} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>/ {salary > 0 ? formatCurrency(salary) : 'R$ 0'}</span>
            </div>
          </div>
        </div>

        {/* Barra de comprometimento do salário */}
        <div style={{ height: 8, borderRadius: 4, background: 'var(--separator)', overflow: 'hidden', marginBottom: 10 }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(invoiceSalaryPct, 100)}%`,
              background: statusBadge.color,
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.4 }}>
          {statusBadge.desc}
        </p>
      </SectionCard>

      {/* ── 2. Peso de cada cartão no salário: lista estilo iOS, como os rankings de Categorias ── */}
      <SectionCard
        icon={BarChart3}
        title="Peso de Cada Cartão no Salário"
        description="Comparativo de fatura e limites individuais"
      >
        {cardsByInvoice.map((card, index) => {
          const cardInvoicePct = salary > 0 ? (card.currentInvoiceAmount / salary) * 100 : 0;
          const cardLimitUsedPct = card.limit > 0 ? (card.realUsed / card.limit) * 100 : 0;
          // sem salário no mês, a barra compara com a maior fatura
          const barPct = salary > 0 ? cardInvoicePct : (card.currentInvoiceAmount / maxInvoice) * 100;
          const cardColor = getBankById(card.bankId)?.color || card.color || 'var(--blue)';
          const isLight = isLightCardColor(cardColor);
          const isLast = index === cardsByInvoice.length - 1;

          return (
            <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px', minWidth: 0 }}>
              {/* Mesmo ícone das transações, na cor do banco (cartões claros ganham contorno e ícone escuro) */}
              <div
                className="transaction-icon"
                style={{
                  background: cardColor,
                  color: isLight ? '#1D1D1F' : '#FFF',
                  boxShadow: isLight ? 'inset 0 0 0 1px var(--separator)' : 'none',
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                }}
              >
                <CreditCard size={14} />
              </div>

              {/* Separador começa depois do ícone, como nas listas do iOS */}
              <div style={{
                flex: 1,
                padding: '10px 0',
                borderBottom: isLast ? 'none' : '1px solid var(--separator)',
                minWidth: 0,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.name}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(card.currentInvoiceAmount)}
                  </span>
                </div>

                {/* Barra fina: quanto da renda a fatura do mês consome */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                  <div className="progress-bar-track" style={{ flex: 1, height: 4 }}>
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${Math.min(barPct, 100)}%`, background: isLight ? 'var(--text-tertiary)' : cardColor }}
                    />
                  </div>
                  {salary > 0 && (
                    <span style={{
                      fontSize: 12,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                      // mesmo alerta de antes: acima de 15% laranja, acima de 25% vermelho
                      color: cardInvoicePct > 25 ? 'var(--red)' : cardInvoicePct > 15 ? 'var(--orange)' : 'var(--text-tertiary)',
                      fontWeight: cardInvoicePct > 15 ? 600 : 400,
                    }}>
                      {cardInvoicePct.toFixed(1)}% do salário
                    </span>
                  )}
                </div>

                {/* Limite do cartão: na mesma linha quando cabe, quebra em duas no celular sem cortar valores */}
                <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 12, rowGap: 2, marginTop: 4, fontSize: 12, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                  <span>Usado {formatCurrency(card.realUsed)} ({cardLimitUsedPct.toFixed(0)}%)</span>
                  <span>Livre {formatCurrency(availableCredit(card))}</span>
                </div>
              </div>
            </div>
          );
        })}
      </SectionCard>

      {/* ── 3. Abertura Visual por Categoria no Crédito: mesmo padrão da Análise Avançada (Categorias) ── */}
      <SectionCard
        icon={PieChart}
        title="Abertura Visual por Categoria no Cartão"
        description="Proporção gráfica, ranking comparativo e desdobramento de despesas"
        actions={<SegmentedTabs tabs={CATEGORY_TABS} value={categoryTab} onChange={setCategoryTab} />}
      >
        {sortedCreditCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-tertiary)', fontSize: 14 }}>
            Nenhuma transação de cartão registrada no mês selecionado.
          </div>
        ) : (
          <>
            {categoryTab === 'donut' && (
              <CategoryDistribution
                items={sortedCreditCategories}
                total={creditTotal}
                totalLabel="Total no cartão"
                formatCount={formatPurchases}
              />
            )}

            {categoryTab === 'bars' && (
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 4px 8px' }}>
                  Categorias que mais pesaram nas faturas do mês
                </p>
                <CategoryRanking
                  entries={sortedCreditCategories.map((item) => ({
                    key: item.cat,
                    name: item.cat,
                    detail: formatPurchases(item.count),
                    total: item.total,
                    pct: item.pct,
                    config: item.config,
                  }))}
                />
              </div>
            )}

            {categoryTab === 'micro' && (
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 12px 8px' }}>
                  Como cada categoria se divide nas faturas
                </p>
                <MacroMicroGroups groups={sortedCreditCategories} formatCount={formatPurchases} shareLabel="do crédito" />
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
