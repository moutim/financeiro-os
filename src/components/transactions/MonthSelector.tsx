'use client';

import { useEffect, useRef } from 'react';
import { useFinanceStore } from '@/lib/store';
import { monthKeyToShortLabel } from '@/lib/currency';

export default function MonthSelector() {
  const { selectedMonth, setSelectedMonth, availableMonths, addAvailableMonth } = useFinanceStore();
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedMonth]);
  const monthsToRender = [...availableMonths];
  if (!monthsToRender.includes(selectedMonth)) {
    monthsToRender.push(selectedMonth);
    monthsToRender.sort();
  }

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

  return (
    <div className="month-selector">
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

      {monthsToRender.map((mk) => {
        const active = mk === selectedMonth;
        const [year, month] = mk.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        const shortMonth = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const yearLabel = date.toLocaleDateString('pt-BR', { year: '2-digit' });

        return (
          <button
            key={mk}
            ref={active ? activeRef : null}
            className={`month-chip ${active ? 'active' : ''}`}
            onClick={() => setSelectedMonth(mk)}
            style={{ color: active ? 'white' : undefined }}
          >
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'capitalize',
              color: 'inherit',
            }}>
              {shortMonth}
            </span>
            <span style={{
              fontSize: 11,
              color: active ? 'rgba(255,255,255,0.75)' : 'var(--text-tertiary)',
            }}>
              {yearLabel}
            </span>
          </button>
        );
      })}
      
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
