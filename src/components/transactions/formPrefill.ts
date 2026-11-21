/** Valores iniciais do formulário de nova transação (ex.: vindos do simulador de compras do dashboard) */
export interface TransactionFormPrefill {
  name?: string;
  /** Valor total em reais; o formulário divide pelas parcelas */
  amount?: number;
  /** Número de parcelas */
  installments?: number;
  cardId?: string | null;
  /** Mês da 1ª parcela ("YYYY-MM") */
  monthKey?: string;
}

/** Dígitos do campo de valor ("123456" = R$ 1.234,56) */
export const prefillDigits = (amount?: number) => (amount ? String(Math.round(amount * 100)) : '');
