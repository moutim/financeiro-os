'use client';

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { CURRENT_MONTH_KEY, useFinanceStore } from '@/lib/store';
import { monthKeyToShortLabel } from '@/lib/currency';

/** Meses passados visíveis no seletor; os mais antigos ficam escondidos */
const MAX_VISIBLE_PAST_MONTHS = 6;
/** Hover: atraso para abrir o baralho (só cruzar por cima não abre) e para fechar ao sair da barra */
const DECK_OPEN_DELAY_MS = 120;
const DECK_CLOSE_DELAY_MS = 150;
/** Baralho fechado: cartas que aparecem atrás da do topo, deslocamento e redução de cada camada */
const DECK_VISIBLE_LAYERS = 2;
const DECK_LAYER_OFFSET_PX = 6;
const DECK_LAYER_SCALE_STEP = 0.08;

function MonthChipLabel({ monthKey, active }: { monthKey: string; active: boolean }) {
  const [year, month] = monthKey.split('-').map(Number);
  const yearLabel = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { year: '2-digit' });

  return (
    <>
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        textTransform: 'capitalize',
        color: 'inherit',
      }}>
        {monthKeyToShortLabel(monthKey)}
      </span>
      <span style={{
        fontSize: 11,
        color: active ? 'rgba(255,255,255,0.75)' : 'var(--text-tertiary)',
      }}>
        {yearLabel}
      </span>
    </>
  );
}

interface MonthDeckProps {
  /** Meses depois do atual, em ordem cronológica */
  months: string[];
  selectedMonth: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (monthKey: string) => void;
  activeRef: RefObject<HTMLButtonElement | null>;
}

/**
 * Próximos meses empilhados como um baralho, ao lado do mês atual: no topo fica o
 * mês selecionado (ou o seguinte ao atual) e os demais aparecem atrás. Abre em leque
 * no hover, ou no toque.
 */
function MonthDeck({ months, selectedMonth, open, onOpenChange, onSelect, activeRef }: MonthDeckProps) {
  const deckRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastPointerType = useRef('mouse');

  const topIndex = Math.max(months.indexOf(selectedMonth), 0);
  const layers = Math.min(months.length - 1, DECK_VISIBLE_LAYERS);

  useEffect(() => () => clearTimeout(openTimer.current), []);

  // clique ou toque fora do baralho fecha o leque
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!deckRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, onOpenChange]);

  const cardStyle = (index: number): CSSProperties => {
    // profundidade na pilha: a do topo na frente e as outras atrás, em ordem cronológica
    const depth = index === topIndex ? 0 : index < topIndex ? index + 1 : index;
    const layer = Math.min(depth, layers);
    // o empilhamento não muda ao abrir: as cartas saem de trás da do topo, sem pular na frente dela
    const zIndex = depth > layers ? 0 : layers + 1 - layer;

    if (open) {
      return {
        transform: `translateX(calc((var(--month-chip-w) + var(--month-chip-gap)) * ${index}))`,
        transitionDelay: `${Math.min(index, 8) * 20}ms`,
        zIndex,
      };
    }
    // fechado: as de trás deslocadas para a direita
    return {
      transform: `translateX(${layer * DECK_LAYER_OFFSET_PX}px) scale(${1 - layer * DECK_LAYER_SCALE_STEP})`,
      opacity: depth > layers ? 0 : 1,
      zIndex,
    };
  };

  const width = open
    ? `calc(var(--month-chip-w) * ${months.length} + var(--month-chip-gap) * ${months.length - 1})`
    : `calc(var(--month-chip-w) + ${layers * DECK_LAYER_OFFSET_PX}px)`;

  return (
    <div
      ref={deckRef}
      role="group"
      aria-label="Próximos meses"
      className={`month-deck ${open ? 'open' : ''}`}
      style={{ width }}
      onPointerDown={(e) => { lastPointerType.current = e.pointerType; }}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse' || open) return;
        openTimer.current = setTimeout(() => onOpenChange(true), DECK_OPEN_DELAY_MS);
      }}
      onPointerLeave={() => clearTimeout(openTimer.current)}
      onBlur={(e) => {
        // teclado: Tab para fora do baralho fecha
        if (open && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) onOpenChange(false);
      }}
    >
      {months.map((mk, index) => {
        const active = mk === selectedMonth;
        const isTop = index === topIndex;

        return (
          <button
            key={mk}
            ref={active ? activeRef : null}
            type="button"
            className={`month-chip ${active ? 'active' : ''}`}
            style={{ ...cardStyle(index), color: active ? 'white' : undefined }}
            inert={!open && !isTop}
            aria-expanded={isTop ? open : undefined}
            onClick={(e) => {
              if (!open) {
                // fechado: abre o leque; no clique do mouse também seleciona o mês do topo
                clearTimeout(openTimer.current);
                onOpenChange(true);
                if (lastPointerType.current === 'mouse' && e.detail > 0) onSelect(mk);
                return;
              }
              onSelect(mk);
              // no toque não existe "sair com o mouse": fecha ao escolher
              if (lastPointerType.current !== 'mouse') onOpenChange(false);
            }}
          >
            <MonthChipLabel monthKey={mk} active={active} />
          </button>
        );
      })}
    </div>
  );
}

export default function MonthSelector() {
  const { selectedMonth, setSelectedMonth, availableMonths, addAvailableMonth } = useFinanceStore();
  const activeRef = useRef<HTMLButtonElement>(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedMonth]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const monthsToRender = [...availableMonths];
  if (!monthsToRender.includes(selectedMonth)) {
    monthsToRender.push(selectedMonth);
    monthsToRender.sort();
  }

  // passados: só os 6 mais recentes (e o selecionado, se for mais antigo); mês atual solto; seguintes: baralho
  const pastMonths = monthsToRender.filter(mk => mk < CURRENT_MONTH_KEY);
  const recentPastMonths = pastMonths.slice(-MAX_VISIBLE_PAST_MONTHS);
  const visiblePastMonths = pastMonths.filter(mk => recentPastMonths.includes(mk) || mk === selectedMonth);
  const currentMonths = monthsToRender.filter(mk => mk === CURRENT_MONTH_KEY);
  const deckMonths = monthsToRender.filter(mk => mk > CURRENT_MONTH_KEY);

  const handleAddNextMonth = () => {
    const lastMonth = monthsToRender[monthsToRender.length - 1];
    const [y, m] = lastMonth.split('-').map(Number);
    let nextM = m + 1;
    let nextY = y;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    const nextMonthKey = `${nextY}-${nextM.toString().padStart(2, '0')}`;
    addAvailableMonth(nextMonthKey);
    setSelectedMonth(nextMonthKey);
  };

  const handleAddPrevMonth = () => {
    const firstMonth = monthsToRender[0];
    const [y, m] = firstMonth.split('-').map(Number);
    let prevM = m - 1;
    let prevY = y;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    const prevMonthKey = `${prevY}-${prevM.toString().padStart(2, '0')}`;
    addAvailableMonth(prevMonthKey);
    setSelectedMonth(prevMonthKey);
  };

  const renderMonthChip = (mk: string) => {
    const active = mk === selectedMonth;

    return (
      <button
        key={mk}
        ref={active ? activeRef : null}
        className={`month-chip ${active ? 'active' : ''}`}
        onClick={() => setSelectedMonth(mk)}
        style={{ color: active ? 'white' : undefined }}
      >
        <MonthChipLabel monthKey={mk} active={active} />
      </button>
    );
  };

  return (
    <div
      className="month-selector"
      onPointerEnter={() => clearTimeout(closeTimer.current)}
      onPointerLeave={(e) => {
        // mouse: o baralho segue aberto enquanto o ponteiro estiver na barra, para o + ao lado não fugir
        if (e.pointerType !== 'mouse') return;
        closeTimer.current = setTimeout(() => setDeckOpen(false), DECK_CLOSE_DELAY_MS);
      }}
    >
      <button
        className="month-chip"
        onClick={handleAddPrevMonth}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          color: 'var(--blue)',
          background: 'var(--blue-light)',
          minWidth: 48,
        }}
        title="Adicionar mês anterior"
      >
        <span style={{ fontSize: 18, fontWeight: 600 }}>+</span>
      </button>

      {visiblePastMonths.map(renderMonthChip)}
      {currentMonths.map(renderMonthChip)}

      {/* um mês sozinho não vira baralho */}
      {deckMonths.length > 1 ? (
        <MonthDeck
          months={deckMonths}
          selectedMonth={selectedMonth}
          open={deckOpen}
          onOpenChange={setDeckOpen}
          onSelect={setSelectedMonth}
          activeRef={activeRef}
        />
      ) : (
        deckMonths.map(renderMonthChip)
      )}

      <button
        className="month-chip"
        onClick={handleAddNextMonth}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 16px',
          color: 'var(--blue)',
          background: 'var(--blue-light)',
          minWidth: 48,
        }}
        title="Iniciar próximo mês"
      >
        <span style={{ fontSize: 18, fontWeight: 600 }}>+</span>
      </button>
    </div>
  );
}
