export interface BankConfig {
  id: string;
  name: string;
  domain: string;
  color: string;
}

export const BANKS: BankConfig[] = [
  { id: 'nubank', name: 'Nubank', domain: 'nubank.com.br', color: '#8A05BE' },
  { id: 'itau', name: 'Itaú', domain: 'itau.com.br', color: '#EC7000' },
  { id: 'bradesco', name: 'Bradesco', domain: 'bradesco.com.br', color: '#CC092F' },
  { id: 'santander', name: 'Santander', domain: 'santander.com.br', color: '#EC0000' },
  { id: 'inter', name: 'Banco Inter', domain: 'bancointer.com.br', color: '#FF7A00' },
  { id: 'c6', name: 'C6 Bank', domain: 'c6bank.com.br', color: '#242424' },
  { id: 'xp', name: 'XP Investimentos', domain: 'xpi.com.br', color: '#000000' },
  { id: 'btg', name: 'BTG Pactual', domain: 'btgpactual.com', color: '#002753' },
  { id: 'bb', name: 'Banco do Brasil', domain: 'bb.com.br', color: '#003DA5' },
  { id: 'caixa', name: 'Caixa', domain: 'caixa.gov.br', color: '#005CA9' },
  { id: 'rico', name: 'Rico', domain: 'rico.com.vc', color: '#FF5A00' },
  { id: 'neon', name: 'Neon', domain: 'neon.com.br', color: '#00A9E0' },
  { id: 'pan', name: 'Banco Pan', domain: 'bancopan.com.br', color: '#00A2E2' },
  { id: 'picpay', name: 'PicPay', domain: 'picpay.com', color: '#11C76F' },
  { id: 'mercado-pago', name: 'Mercado Pago', domain: 'mercadopago.com.br', color: '#009EE3' },
];

export function getBankById(id: string | null | undefined): BankConfig | undefined {
  if (!id) return undefined;
  return BANKS.find((b) => b.id === id);
}
