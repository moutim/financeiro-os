'use client';

import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatCompact, formatCurrency } from '@/lib/currency';
import { TrendingUp, ArrowUpRight, ShieldCheck, Sparkles, Calendar } from 'lucide-react';

interface ProjectionData {
  month: string;
  utilizado: number;
  disponivel: number;
}

interface CreditProjectionChartProps {
  data: ProjectionData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  totalLimit: number;
  initialDisponivel: number;
}

function CustomTooltip({ active, payload, label, totalLimit, initialDisponivel }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const disponivelItem = payload.find(p => p.dataKey === 'disponivel');
  const utilizadoItem = payload.find(p => p.dataKey === 'utilizado');
  const disponivelVal = disponivelItem?.value ?? 0;
  const utilizadoVal = utilizadoItem?.value ?? 0;
  const pct = totalLimit > 0 ? (disponivelVal / totalLimit) * 100 : 0;
  const gainFromStart = disponivelVal - initialDisponivel;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--separator)',
      borderRadius: 14,
      padding: '14px 18px',
      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.25)',
      backdropFilter: 'blur(20px)',
      minWidth: 220,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, borderBottom: '1px solid var(--separator)', paddingBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} color="var(--blue)" />
          {label}
        </div>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 6,
          background: 'var(--green-light)',
          color: 'var(--green)',
        }}>
          {pct.toFixed(0)}% livre
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
            Limite Liberado:
          </span>
          <span style={{ fontWeight: 700, color: 'var(--green)' }}>
            {formatCurrency(disponivelVal)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)' }} />
            Faturas Previstas:
          </span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatCurrency(utilizadoVal)}
          </span>
        </div>

        {gainFromStart > 0 && (
          <div style={{
            marginTop: 6,
            paddingTop: 6,
            borderTop: '1px dashed var(--separator)',
            fontSize: 11,
            color: 'var(--green)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <ArrowUpRight size={13} strokeWidth={2.5} />
            + {formatCurrency(gainFromStart)} liberados acumulados
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreditProjectionChart({ data }: CreditProjectionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-tertiary)', fontSize: 14 }}>
        Nenhuma projeção disponível no momento.
      </div>
    );
  }

  const currentDisponivel = data[0]?.disponivel ?? 0;
  const currentUtilizado = data[0]?.utilizado ?? 0;
  const totalLimit = currentDisponivel + currentUtilizado;
  const finalDisponivel = data[data.length - 1]?.disponivel ?? currentDisponivel;
  const finalUtilizado = data[data.length - 1]?.utilizado ?? currentUtilizado;
  const creditGain = Math.max(0, finalDisponivel - currentDisponivel);
  const currentAvailablePct = totalLimit > 0 ? (currentDisponivel / totalLimit) * 100 : 0;
  const projectedAvailablePct = totalLimit > 0 ? (finalDisponivel / totalLimit) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Top Micro Highlights ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {/* Card 1: Disponível Atual */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--separator)',
          borderRadius: 14,
          padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>DISPONÍVEL HOJE</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', letterSpacing: '-0.01em' }}>
            {formatCurrency(currentDisponivel)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {currentAvailablePct.toFixed(0)}% do limite total
          </div>
        </div>

        {/* Card 2: Projeção 6 Meses */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--separator)',
          borderRadius: 14,
          padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <TrendingUp size={12} color="var(--blue)" />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>EM 6 MESES</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--blue)', letterSpacing: '-0.01em' }}>
            {formatCurrency(finalDisponivel)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
            <ArrowUpRight size={12} strokeWidth={2.5} />
            +{formatCurrency(creditGain)} a liberar ({projectedAvailablePct.toFixed(0)}%)
          </div>
        </div>

        {/* Card 3: Redução de Parcelas */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--separator)',
          borderRadius: 14,
          padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <ShieldCheck size={12} color="var(--text-secondary)" />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>FATURAS RESTANTES</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {formatCurrency(finalUtilizado)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Redução de {currentUtilizado > 0 ? (((currentUtilizado - finalUtilizado) / currentUtilizado) * 100).toFixed(0) : 0}% no período
          </div>
        </div>
      </div>

      {/* ── Visual Area Curve ── */}
      <div style={{ width: '100%', height: 280, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="projGreenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34C759" stopOpacity={0.4} />
                <stop offset="60%" stopColor="#34C759" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#34C759" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="projBlueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#007AFF" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#007AFF" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" vertical={false} opacity={0.6} />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: 'var(--text-tertiary)', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />

            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCompact}
              width={54}
            />

            <Tooltip
              content={
                <CustomTooltip
                  totalLimit={totalLimit}
                  initialDisponivel={currentDisponivel}
                />
              }
            />

            {/* Linha e Área do Limite Disponível (em ascensão) */}
            <Area
              type="monotone"
              dataKey="disponivel"
              name="Limite Disponível"
              stroke="#34C759"
              strokeWidth={2.8}
              fill="url(#projGreenGrad)"
              dot={{ r: 4, fill: '#34C759', stroke: 'var(--surface)', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#34C759', stroke: '#FFF', strokeWidth: 2 }}
            />

            {/* Linha do Comprometimento / Faturas (em declínio) */}
            <Area
              type="monotone"
              dataKey="utilizado"
              name="Comprometimento"
              stroke="#007AFF"
              strokeWidth={2}
              strokeDasharray="4 4"
              fill="url(#projBlueGrad)"
              dot={{ r: 3, fill: '#007AFF', stroke: 'var(--surface)', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: '#007AFF', stroke: '#FFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Legend & Guide ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        flexWrap: 'wrap',
        paddingTop: 8,
        borderTop: '1px solid var(--separator)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          <span style={{ width: 12, height: 4, borderRadius: 2, background: '#34C759' }} />
          <span>Limite Liberado (Disponível)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          <span style={{ width: 12, height: 0, borderTop: '2px dashed #007AFF' }} />
          <span>Faturas Previstas (Comprometido)</span>
        </div>
      </div>
    </div>
  );
}
