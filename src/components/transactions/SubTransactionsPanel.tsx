'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatMask, parseMask } from '@/lib/currency';

/** Sub-transação em edição no formulário (valores como digitados) */
export interface SubTransactionDraft {
  name: string;
  rawAmount: string;
  installments: string;
}

/** Itens por página: a tela das subs nunca cresce além disso, então o modal não rola */
const PAGE_SIZE = 5;

const EMPTY_SUB: SubTransactionDraft = { name: '', rawAmount: '', installments: '' };

const isBlank = (s: SubTransactionDraft) => !s.name.trim() && !s.rawAmount && !s.installments.trim();

/** Número de parcelas aparece como "6x" */
const displayInstallments = (value: string) => (/^\d+$/.test(value) ? `${value}x` : value);

/**
 * Próximo valor do campo de parcelas. Apagar o "x" de "6x" apaga o último dígito; no
 * cadastro só entram dígitos, na edição o texto é livre (marcação "2/6" das parcelas gravadas).
 */
function nextInstallments(typed: string, current: string, digitsOnly: boolean): string {
  if (/^\d+$/.test(current) && typed === current) return current.slice(0, -1);
  return digitsOnly ? typed.replace(/\D/g, '') : typed.replace(/^(\d+)x/i, '$1');
}

/**
 * Alterna o modal entre o formulário e a tela das subs. Abre já com uma linha para
 * digitar quando ainda não há nenhuma; ao voltar, linhas totalmente vazias saem
 * (senão o campo Valor ficaria travado em R$ 0,00).
 */
export function useSubTransactionsView(
  subs: SubTransactionDraft[],
  setSubs: (subs: SubTransactionDraft[]) => void,
) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasReturned, setHasReturned] = useState(false);
  return {
    isOpen,
    /** Ao voltar, o formulário entra pelo lado oposto ao que a tela das subs saiu */
    formClassName: hasReturned ? 'modal-view-back' : undefined,
    open: () => {
      if (subs.length === 0) setSubs([{ ...EMPTY_SUB }]);
      setIsOpen(true);
    },
    close: () => {
      setSubs(subs.filter((s) => !isBlank(s)));
      setIsOpen(false);
      setHasReturned(true);
    },
  };
}

interface SubTransactionsSummaryProps {
  count: number;
  total: number;
  onOpen: () => void;
  disabled?: boolean;
}

/** Linha do formulário principal que leva à tela das sub-transações */
export function SubTransactionsSummary({ count, total, onOpen, disabled }: SubTransactionsSummaryProps) {
  return (
    <button type="button" className="sub-summary" onClick={onOpen} disabled={disabled}>
      <span className="sub-summary-label">Sub-transações</span>
      <span className="sub-summary-value">
        {count > 0 ? `${count} ${count === 1 ? 'item' : 'itens'} · ${formatCurrency(total)}` : 'Opcional · dividir em itens'}
      </span>
      <ChevronRight size={16} strokeWidth={2.25} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
    </button>
  );
}

interface SubTransactionsPanelProps {
  subs: SubTransactionDraft[];
  onChange: (subs: SubTransactionDraft[]) => void;
  onDone: () => void;
  /** Valor que entra neste mês (das subs parceladas, só a 1ª parcela) */
  monthAmount: number;
  totalAmount: number;
  /**
   * Cadastro: parcelas só com dígitos. Edição: texto livre, para mostrar a
   * marcação "2/6" das parcelas já gravadas.
   */
  installmentsDigitsOnly?: boolean;
  disabled?: boolean;
}

/**
 * Tela das sub-transações dentro do modal, no padrão de lista agrupada do iOS:
 * uma linha por item (remover à esquerda, nome, parcelas e valor), "Adicionar item"
 * no fim da lista e os totais numa seção à parte. Paginada, para a altura não
 * depender da quantidade de itens.
 */
export default function SubTransactionsPanel({
  subs,
  onChange,
  onDone,
  monthAmount,
  totalAmount,
  installmentsDigitsOnly = false,
  disabled = false,
}: SubTransactionsPanelProps) {
  const [page, setPage] = useState(0);
  const [focusIndex, setFocusIndex] = useState<number | null>(subs.length === 1 && isBlank(subs[0]) ? 0 : null);

  const pageCount = Math.max(1, Math.ceil(subs.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = subs.slice(start, start + PAGE_SIZE);
  const hasInstallments = monthAmount !== totalAmount;

  const update = (index: number, patch: Partial<SubTransactionDraft>) =>
    onChange(subs.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const add = () => {
    const next = [...subs, { ...EMPTY_SUB }];
    onChange(next);
    setPage(Math.ceil(next.length / PAGE_SIZE) - 1);
    setFocusIndex(next.length - 1);
  };

  const remove = (index: number) => onChange(subs.filter((_, i) => i !== index));

  return (
    <div className="sub-panel modal-view-in">
      <div className="sub-panel-header">
        <button type="button" className="sub-panel-back" onClick={onDone}>
          <ChevronLeft size={20} strokeWidth={2.5} />
          Voltar
        </button>
        <h2 className="sub-panel-title">Sub-transações</h2>
      </div>

      <div className="grouped-header">
        <span>Itens</span>
        {pageCount > 1 && (
          <span className="grouped-pager">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0}
              aria-label="Itens anteriores"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            {start + 1}–{Math.min(start + PAGE_SIZE, subs.length)} de {subs.length}
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === pageCount - 1}
              aria-label="Próximos itens"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </span>
        )}
      </div>

      <div className="grouped-list">
        {visible.map((sub, offset) => {
          const index = start + offset;
          return (
            <div key={index} className="grouped-row sub-row">
              <button
                type="button"
                className="sub-row-remove"
                onClick={() => remove(index)}
                disabled={disabled}
                aria-label={`Remover item ${index + 1}`}
              >
                <span className="list-icon list-icon-remove" aria-hidden />
              </button>
              <input
                className="sub-row-name"
                placeholder="Item"
                aria-label={`Nome do item ${index + 1}`}
                value={sub.name}
                autoFocus={index === focusIndex}
                onChange={(e) => update(index, { name: e.target.value })}
                disabled={disabled}
              />
              <input
                className="sub-row-installments"
                placeholder="1x"
                aria-label={`Parcelas do item ${index + 1}`}
                inputMode={installmentsDigitsOnly ? 'numeric' : undefined}
                value={displayInstallments(sub.installments)}
                onChange={(e) => update(index, {
                  installments: nextInstallments(e.target.value, sub.installments, installmentsDigitsOnly),
                })}
                disabled={disabled}
              />
              <input
                className="sub-row-amount"
                placeholder="R$ 0,00"
                aria-label={`Valor do item ${index + 1}`}
                inputMode="numeric"
                value={formatMask(sub.rawAmount)}
                onChange={(e) => update(index, { rawAmount: parseMask(e.target.value) })}
                disabled={disabled}
              />
            </div>
          );
        })}
        <button type="button" className="grouped-row sub-row-add" onClick={add} disabled={disabled}>
          <span className="list-icon list-icon-add" aria-hidden />
          Adicionar item
        </button>
      </div>
      <p className="grouped-footer">
        Informe o valor total de cada item. Com parcelas, entra só a 1ª neste mês.
      </p>

      <div className="grouped-list">
        {hasInstallments && (
          <div className="grouped-row grouped-row-value">
            <span>Este mês</span>
            <span>{formatCurrency(monthAmount)}</span>
          </div>
        )}
        <div className="grouped-row grouped-row-value">
          <span>{hasInstallments ? 'Total parcelado' : 'Total'}</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <button type="button" className="btn-primary sub-panel-done" onClick={onDone}>
        Concluir
      </button>
    </div>
  );
}
