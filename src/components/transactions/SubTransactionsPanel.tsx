'use client';

import { useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatMask, parseMask } from '@/lib/currency';
import { EXPENSE_MACROS, getMicrosForMacro, isValidMicroForMacro } from '@/lib/detailedCategories';
import { useCategoryTaxonomy, type CategoryTaxonomy } from '@/lib/taxonomy';
import type { SubTransaction, Transaction } from '@/lib/types';

/** Sub-transação em edição no formulário (valores como digitados) */
export interface SubTransactionDraft {
  name: string;
  rawAmount: string;
  installments: string;
  /** Categoria própria do item, como gravada (vazia: fica na categoria da transação) */
  category: string;
  subcategory: string;
}

/** Itens por página: a tela das subs nunca cresce além disso, então o modal não rola */
const PAGE_SIZE = 5;

const EMPTY_SUB: SubTransactionDraft = { name: '', rawAmount: '', installments: '', category: '', subcategory: '' };

/** Rascunho de uma sub-transação já gravada, para a edição */
export function toSubTransactionDraft(sub: SubTransaction): SubTransactionDraft {
  return {
    name: sub.name,
    rawAmount: String(Math.round(sub.amount * 100)),
    installments: sub.installments || '',
    category: sub.category || '',
    subcategory: sub.subcategory || '',
  };
}

/** Categoria do item para gravar: nula quando ele fica na categoria da transação */
export function draftCategoryFields(sub: Pick<SubTransactionDraft, 'category' | 'subcategory'>): Pick<SubTransaction, 'category' | 'subcategory'> {
  return sub.category
    ? { category: sub.category, subcategory: sub.subcategory || null }
    : { category: null, subcategory: null };
}

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
 * Alterna o modal entre o formulário e a tela das subs. Abre já com uma linha vazia
 * quando ainda não há nenhuma; ao voltar, linhas totalmente vazias saem
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

// ─── Categoria do item ───────────────────────────────────────────────────────

type CategoryFields = Pick<Transaction, 'category' | 'subcategory'>;

/** Separa macro e micro no valor de uma opção do modo detalhado */
const MICRO_SEPARATOR = '::';

/** Categoria como o modo atual a exibe (legadas e do outro modo são convertidas) */
function viewCategory(taxonomy: CategoryTaxonomy, fields: CategoryFields, name: string): CategoryFields {
  const view = taxonomy.normalize({ id: '', name, amount: 0, monthKey: '', ...fields });
  const micro = view.subcategory && isValidMicroForMacro(view.category, view.subcategory) ? view.subcategory : null;
  return { category: view.category, subcategory: taxonomy.mode === 'detailed' ? micro : null };
}

const optionValue = ({ category, subcategory }: CategoryFields) =>
  subcategory ? `${category}${MICRO_SEPARATOR}${subcategory}` : category;

const optionLabel = ({ category, subcategory }: CategoryFields) =>
  subcategory ? `${category} › ${subcategory}` : category;

interface SubCategoryPickerProps {
  sub: SubTransactionDraft;
  /** Categoria da transação, que vale para o item sem categoria própria */
  parentCategory: CategoryFields;
  onChange: (fields: Pick<SubTransactionDraft, 'category' | 'subcategory'>) => void;
  itemLabel: string;
  disabled?: boolean;
}

/**
 * Ícone da categoria do item, com o seletor nativo por cima (transparente): no celular,
 * abre a roda de opções do sistema sem ocupar a linha. Cor cheia quando o item tem
 * categoria própria; clara quando segue a da transação. No modo detalhado, uma escolha
 * só já define Macro › Micro.
 */
function SubCategoryPicker({ sub, parentCategory, onChange, itemLabel, disabled }: SubCategoryPickerProps) {
  const taxonomy = useCategoryTaxonomy();
  const hasOwn = !!sub.category;
  const parentView = viewCategory(taxonomy, parentCategory, sub.name);
  // a categoria gravada só muda quando a pessoa escolhe outra: uma do outro modo continua como está
  const ownView = hasOwn ? viewCategory(taxonomy, { category: sub.category, subcategory: sub.subcategory || null }, sub.name) : null;
  const current = ownView ?? parentView;
  const cfg = taxonomy.getConfig(current.category);
  const value = ownView ? optionValue(ownView) : '';

  const groups = taxonomy.mode === 'detailed'
    ? EXPENSE_MACROS.map((macro) => ({ macro, micros: getMicrosForMacro(macro) }))
    : null;
  const knownValues = groups
    ? groups.flatMap(({ macro, micros }) => [macro, ...micros.map((micro) => optionValue({ category: macro, subcategory: micro }))])
    : taxonomy.categories;
  // categoria fora da lista (ex: Investimentos no detalhado) continua visível no seletor
  const extraOption = ownView && !knownValues.includes(value) ? ownView : null;

  const handleChange = (next: string) => {
    if (!next) return onChange({ category: '', subcategory: '' });
    const [category, subcategory = ''] = next.split(MICRO_SEPARATOR);
    onChange({ category, subcategory });
  };

  return (
    <label
      className={`sub-row-category${hasOwn ? ' is-own' : ''}`}
      style={{ '--cat-color': cfg.color, '--cat-bg': cfg.bgColor } as CSSProperties}
      title={optionLabel(current)}
    >
      <cfg.icon size={14} strokeWidth={2.25} aria-hidden />
      <select
        aria-label={`Categoria do ${itemLabel}: ${optionLabel(current)}${hasOwn ? '' : ' (da transação)'}`}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Da transação ({optionLabel(parentView)})</option>
        {extraOption && <option value={value}>{optionLabel(extraOption)}</option>}
        {groups
          ? groups.map(({ macro, micros }) => (
            <optgroup key={macro} label={macro}>
              <option value={macro}>Geral</option>
              {micros.map((micro) => (
                <option key={micro} value={optionValue({ category: macro, subcategory: micro })}>{micro}</option>
              ))}
            </optgroup>
          ))
          : taxonomy.categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
      </select>
    </label>
  );
}

// ─── Painel ──────────────────────────────────────────────────────────────────

interface SubTransactionsPanelProps {
  subs: SubTransactionDraft[];
  onChange: (subs: SubTransactionDraft[]) => void;
  onDone: () => void;
  /**
   * Categoria da transação (despesas): cada item mostra o seletor de categoria e, sem
   * escolha própria, fica nesta. Sem ela (receitas), os itens não têm categoria.
   */
  parentCategory?: CategoryFields | null;
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
 * uma linha por item (remover à esquerda, categoria, nome, parcelas e valor), "Adicionar item"
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
  parentCategory = null,
  disabled = false,
}: SubTransactionsPanelProps) {
  const [page, setPage] = useState(0);
  // abrir a tela não foca nada (no celular, abriria o teclado sem a pessoa pedir);
  // só "Adicionar item" leva o foco para a linha nova
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

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
              {parentCategory && (
                <SubCategoryPicker
                  sub={sub}
                  parentCategory={parentCategory}
                  onChange={(fields) => update(index, fields)}
                  itemLabel={`item ${index + 1}`}
                  disabled={disabled}
                />
              )}
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
        {parentCategory && ' Toque no ícone para mudar a categoria do item.'}
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
