export interface BankConfig {
  id: string;
  name: string;
  domain: string;
}

export const BANKS: BankConfig[] = [
  { id: 'nubank', name: 'Nubank', domain: 'nubank.com.br' },
  { id: 'itau', name: 'Itaú', domain: 'itau.com.br' },
  { id: 'bradesco', name: 'Bradesco', domain: 'bradesco.com.br' },
  { id: 'santander', name: 'Santander', domain: 'santander.com.br' },
  { id: 'inter', name: 'Banco Inter', domain: 'bancointer.com.br' },
  { id: 'c6', name: 'C6 Bank', domain: 'c6bank.com.br' },
  { id: 'xp', name: 'XP Investimentos', domain: 'xpi.com.br' },
  { id: 'btg', name: 'BTG Pactual', domain: 'btgpactual.com' },
  { id: 'bb', name: 'Banco do Brasil', domain: 'bb.com.br' },
  { id: 'caixa', name: 'Caixa', domain: 'caixa.gov.br' },
  { id: 'rico', name: 'Rico', domain: 'rico.com.vc' },
  { id: 'neon', name: 'Neon', domain: 'neon.com.br' },
  { id: 'pan', name: 'Banco Pan', domain: 'bancopan.com.br' },
  { id: 'picpay', name: 'PicPay', domain: 'picpay.com' },
  { id: 'mercado-pago', name: 'Mercado Pago', domain: 'mercadopago.com.br' },
];

export function getBankById(id: string | null | undefined): BankConfig | undefined {
  if (!id) return undefined;
  return BANKS.find((b) => b.id === id);
}
