import type { Transaction, Income, Pending, SavingsGoal } from '@/lib/types';

// ─── INCOMES ──────────────────────────────────────────────────────────────────
// Fixed monthly incomes (recurring)
export const SEED_INCOMES: Income[] = [
  // --- Fixed monthly salaries across all months ---
  ...(['2025-02','2025-03','2025-04','2025-05','2025-06','2025-07','2025-08','2025-09','2025-10'] as const).flatMap((m, i) => [
    { id: `sal-itau-${m}`, name: 'Salário Itaú', amount: 5000, monthKey: m },
    { id: `sal-proa-${m}`, name: 'Salário PROA', amount: 2040, monthKey: m },
  ]),
  { id: 'plr-2025-02', name: 'PLR', amount: 8457.8, monthKey: '2025-02' },
  { id: 'div-2025-02', name: 'Dividendos', amount: 108.66, monthKey: '2025-02' },
];

// ─── PENDING / "A RESOLVER" ───────────────────────────────────────────────────
export const SEED_PENDING: Pending[] = [
  { id: 'pend-1', name: 'Judicial FIAP', amount: 5304.04 },
  { id: 'pend-2', name: 'Camile PS5', amount: 1600.0 },
];

// ─── SAVINGS GOALS ────────────────────────────────────────────────────────────
export const SEED_GOALS: SavingsGoal[] = [
  { id: 'goal-casa-1', name: 'Reserva da Casa', current: 31200, target: 41800, monthlyPrediction: 1000 },
];

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
export const SEED_TRANSACTIONS: Transaction[] = [
  // ──────────────── FEVEREIRO 2025 ───────────────────
  { id: 't-0201', name: 'Cartão Nubank', amount: 4132.32, category: 'Compras', monthKey: '2025-02' },
  { id: 't-0202', name: 'Emprestimo Nubank', amount: 1018.01, category: 'Compras', monthKey: '2025-02' },
  { id: 't-0203', name: 'Internet', amount: 102.20, category: 'Fixos', monthKey: '2025-02' },
  { id: 't-0204', name: 'Celular', amount: 60.98, category: 'Fixos', monthKey: '2025-02' },
  { id: 't-0205', name: 'Faculdade', amount: 414.98, category: 'Fixos', monthKey: '2025-02' },
  { id: 't-0206', name: 'Acordo certo (PAN)', amount: 108.66, category: 'Fixos', monthKey: '2025-02' },
  { id: 't-0207', name: 'Restaurante', amount: 260.00, category: 'Comida', monthKey: '2025-02' },
  { id: 't-0208', name: 'Sidnelson', amount: 200.00, category: 'Compras', monthKey: '2025-02' },
  { id: 't-0209', name: 'Restaurante Lolla', amount: 260.00, category: 'Comida', monthKey: '2025-02' },
  { id: 't-0210', name: 'Ingresso Lolla', amount: 1145.00, category: 'Compras', monthKey: '2025-02' },
  { id: 't-0211', name: 'Vavas', amount: 78.90, category: 'Compras', monthKey: '2025-02' },
  { id: 't-0212', name: 'Caixinha Turbo Nubank', amount: 400.00, category: 'Investimentos', monthKey: '2025-02' },
  { id: 't-0213', name: 'Investimento Crédito', amount: 2240.00, category: 'Investimentos', monthKey: '2025-02' },
  { id: 't-0214', name: 'Mãe Fatura - Outubro', amount: 1286.43, category: 'Compras', monthKey: '2025-02' },
  { id: 't-0215', name: 'Camile Fatura - Outubro', amount: 954.30, category: 'Compras', monthKey: '2025-02' },
  { id: 't-0216', name: 'Mãe Fatura - Setembro', amount: 1456.44, category: 'Compras', monthKey: '2025-02' },
  { id: 't-0217', name: 'Camile Fatura - Setembro', amount: 1171.02, category: 'Compras', monthKey: '2025-02' },
  { id: 't-0218', name: 'Investimento Itaú Dahlia (Casa)', amount: 4000.00, category: 'Investimentos', monthKey: '2025-02' },

  // ──────────────── MARÇO 2025 ───────────────────────
  { id: 't-0301', name: 'Internet', amount: 102.20, category: 'Fixos', monthKey: '2025-03' },
  { id: 't-0302', name: 'Celular', amount: 60.98, category: 'Fixos', monthKey: '2025-03' },
  { id: 't-0303', name: 'Acordo certo (PAN)', amount: 108.66, category: 'Fixos', monthKey: '2025-03' },
  { id: 't-0304', name: 'FIAP', amount: 645.48, category: 'Fixos', monthKey: '2025-03' },
  { id: 't-0305', name: 'Reserva Casa', amount: 1800.00, category: 'Investimentos', monthKey: '2025-03' },
  { id: 't-0306', name: 'Fatura Nubank', amount: 1381.55, category: 'Compras', monthKey: '2025-03' },
  { id: 't-0307', name: 'Chinelo', amount: 99.99, category: 'Compras', monthKey: '2025-03' },
  { id: 't-0308', name: 'VIVARA', amount: 165.00, category: 'Compras', monthKey: '2025-03' },
  { id: 't-0309', name: 'FIFA 26', amount: 46.50, category: 'Compras', monthKey: '2025-03' },
  { id: 't-0310', name: 'DAS', amount: 90.00, category: 'Fixos', monthKey: '2025-03' },
  { id: 't-0311', name: 'Fatura Nubank (Fev)', amount: 3860.06, category: 'Compras', monthKey: '2025-03' },
  { id: 't-0312', name: 'Github Copilot', amount: 56.36, category: 'Compras', monthKey: '2025-03' },
  { id: 't-0313', name: 'Faculdade', amount: 200.00, category: 'Fixos', monthKey: '2025-03' },
  { id: 't-0314', name: 'Github Copilot', amount: 56.36, category: 'Compras', monthKey: '2025-03' },
  { id: 't-0315', name: 'Vavas', amount: 19.90, category: 'Compras', monthKey: '2025-03' },
  { id: 't-0316', name: 'Café da Manhã', amount: 21.00, category: 'Comida', monthKey: '2025-03' },
  { id: 't-0317', name: 'PSN', amount: 68.21, category: 'Compras', monthKey: '2025-03' },
  { id: 't-0318', name: 'Anticoncepcional', amount: 80.00, category: 'Fixos', monthKey: '2025-03' },
  { id: 't-0319', name: 'Akki', amount: 92.27, category: 'Comida', monthKey: '2025-03' },
  { id: 't-0320', name: 'Cacau Show', amount: 74.98, category: 'Comida', monthKey: '2025-03' },
  { id: 't-0321', name: 'Uber', amount: 145.46, category: 'Compras', monthKey: '2025-03' },

  // ──────────────── ABRIL 2025 ───────────────────────
  { id: 't-0401', name: 'Internet', amount: 102.20, category: 'Fixos', monthKey: '2025-04' },
  { id: 't-0402', name: 'Celular', amount: 60.98, category: 'Fixos', monthKey: '2025-04' },
  { id: 't-0403', name: 'Acordo certo (PAN)', amount: 108.66, category: 'Fixos', monthKey: '2025-04' },
  { id: 't-0404', name: 'FIAP', amount: 645.48, category: 'Fixos', monthKey: '2025-04' },
  { id: 't-0405', name: 'Reserva Casa', amount: 1700.00, category: 'Investimentos', monthKey: '2025-04' },
  { id: 't-0406', name: 'Fatura Nubank', amount: 1477.40, category: 'Compras', monthKey: '2025-04' },
  { id: 't-0407', name: 'Faculdade', amount: 200.00, category: 'Fixos', monthKey: '2025-04' },
  { id: 't-0408', name: 'DAS', amount: 90.00, category: 'Fixos', monthKey: '2025-04' },
  { id: 't-0409', name: 'Anticoncepcional', amount: 80.00, category: 'Fixos', monthKey: '2025-04' },
  { id: 't-0410', name: 'FIFA 26', amount: 46.50, category: 'Compras', monthKey: '2025-04' },
  { id: 't-0411', name: 'Github Copilot', amount: 56.36, category: 'Compras', monthKey: '2025-04' },
  { id: 't-0412', name: 'VIVARA', amount: 165.00, category: 'Compras', monthKey: '2025-04' },
  { id: 't-0413', name: 'Uber', amount: 145.46, category: 'Compras', monthKey: '2025-04' },

  // ──────────────── MAIO 2025 ────────────────────────
  { id: 't-0501', name: 'Internet', amount: 108.77, category: 'Fixos', monthKey: '2025-05' },
  { id: 't-0502', name: 'Celular', amount: 60.98, category: 'Fixos', monthKey: '2025-05' },
  { id: 't-0503', name: 'Acordo certo (PAN)', amount: 108.66, category: 'Fixos', monthKey: '2025-05' },
  { id: 't-0504', name: 'FIAP', amount: 645.48, category: 'Fixos', monthKey: '2025-05' },
  { id: 't-0505', name: 'Reserva Casa', amount: 2800.00, category: 'Investimentos', monthKey: '2025-05' },
  { id: 't-0506', name: 'Fatura Nubank', amount: 1068.54, category: 'Compras', monthKey: '2025-05' },
  { id: 't-0507', name: 'NewBalance', amount: 249.99, category: 'Compras', monthKey: '2025-05' },
  { id: 't-0508', name: 'Faculdade', amount: 200.00, category: 'Fixos', monthKey: '2025-05' },
  { id: 't-0509', name: 'DAS', amount: 90.00, category: 'Fixos', monthKey: '2025-05' },
  { id: 't-0510', name: 'Anticoncepcional', amount: 80.00, category: 'Fixos', monthKey: '2025-05' },
  { id: 't-0511', name: 'Pagar Camile', amount: 60.00, category: 'Compras', monthKey: '2025-05' },
  { id: 't-0512', name: 'Camile Almoço', amount: 70.00, category: 'Comida', monthKey: '2025-05' },
  { id: 't-0513', name: 'Bobs', amount: 25.00, category: 'Comida', monthKey: '2025-05' },
  { id: 't-0514', name: 'Github Copilot', amount: 56.36, category: 'Compras', monthKey: '2025-05' },
  { id: 't-0515', name: 'Akki', amount: 92.27, category: 'Comida', monthKey: '2025-05' },
  { id: 't-0516', name: 'Investimento Extra', amount: 3000.00, category: 'Investimentos', monthKey: '2025-05' },

  // ──────────────── JUNHO 2025 ───────────────────────
  { id: 't-0601', name: 'Internet', amount: 108.77, category: 'Fixos', monthKey: '2025-06' },
  { id: 't-0602', name: 'Celular', amount: 60.98, category: 'Fixos', monthKey: '2025-06' },
  { id: 't-0603', name: 'Acordo certo (PAN)', amount: 108.66, category: 'Fixos', monthKey: '2025-06' },
  { id: 't-0604', name: 'FIAP', amount: 645.48, category: 'Fixos', monthKey: '2025-06' },
  { id: 't-0605', name: 'Reserva Casa', amount: 2400.00, category: 'Investimentos', monthKey: '2025-06' },
  { id: 't-0606', name: 'Fatura Nubank', amount: 1780.97, category: 'Compras', monthKey: '2025-06' },
  { id: 't-0607', name: 'Faculdade', amount: 200.00, category: 'Fixos', monthKey: '2025-06' },
  { id: 't-0608', name: 'DAS', amount: 90.00, category: 'Fixos', monthKey: '2025-06' },
  { id: 't-0609', name: 'Anticoncepcional', amount: 80.00, category: 'Fixos', monthKey: '2025-06' },
  { id: 't-0610', name: 'Github Copilot', amount: 56.36, category: 'Compras', monthKey: '2025-06' },
  { id: 't-0611', name: 'Gamers Club', amount: 24.90, category: 'Compras', monthKey: '2025-06' },
  { id: 't-0612', name: 'Natação Sofia', amount: 236.55, category: 'Ajuda Financeira', monthKey: '2025-06' },

  // ──────────────── JULHO 2025 ───────────────────────
  { id: 't-0701', name: 'Internet', amount: 97.58, category: 'Fixos', monthKey: '2025-07' },
  { id: 't-0702', name: 'Celular', amount: 60.98, category: 'Fixos', monthKey: '2025-07' },
  { id: 't-0703', name: 'FIAP', amount: 572.09, category: 'Fixos', monthKey: '2025-07' },
  { id: 't-0704', name: 'Reserva Casa', amount: 0.00, category: 'Investimentos', monthKey: '2025-07' },
  { id: 't-0705', name: 'Fatura Nubank', amount: 1925.94, category: 'Compras', monthKey: '2025-07' },
  { id: 't-0706', name: 'Faculdade', amount: 221.54, category: 'Fixos', monthKey: '2025-07' },
  { id: 't-0707', name: '99 Corrida', amount: -16.20, category: 'Compras', monthKey: '2025-07' },
  { id: 't-0708', name: 'Rematricula Faculdade', amount: 195.65, category: 'Saúde', monthKey: '2025-07' },
  { id: 't-0709', name: 'PAGAMENTO TRYBE', amount: 10000.00, category: 'Compras', monthKey: '2025-07' },
  { id: 't-0710', name: 'Travesseiros', amount: 100.00, category: 'Saúde', monthKey: '2025-07' },
  { id: 't-0711', name: 'Gamers Club', amount: 24.90, category: 'Compras', monthKey: '2025-07' },
  { id: 't-0712', name: 'Natação Sofia', amount: 236.55, category: 'Ajuda Financeira', monthKey: '2025-07' },
  { id: 't-0713', name: 'DAS', amount: 90.00, category: 'Fixos', monthKey: '2025-07' },

  // ──────────────── AGOSTO 2025 ──────────────────────
  { id: 't-0801', name: 'Internet', amount: 108.77, category: 'Fixos', monthKey: '2025-08' },
  { id: 't-0802', name: 'Celular', amount: 60.98, category: 'Fixos', monthKey: '2025-08' },
  { id: 't-0803', name: 'Emprestimo Nubank', amount: 55.15, category: 'Comida', monthKey: '2025-08' },
  { id: 't-0804', name: 'Reserva Casa', amount: 1700.00, category: 'Investimentos', monthKey: '2025-08' },
  { id: 't-0805', name: 'Fatura Nubank', amount: 2546.67, category: 'Compras', monthKey: '2025-08' },
  { id: 't-0806', name: 'Faculdade', amount: 350.00, category: 'Fixos', monthKey: '2025-08' },
  { id: 't-0807', name: 'Emprestimo Itau', amount: 350.00, category: 'Compras', monthKey: '2025-08' },
  { id: 't-0808', name: 'Itaú Múltiplo', amount: 639.13, category: 'Compras', monthKey: '2025-08' },
  { id: 't-0809', name: 'Itaú Múltiplo 2', amount: 750.00, category: 'Compras', monthKey: '2025-08' },
  { id: 't-0810', name: 'Itaú Múltiplo 3', amount: 838.12, category: 'Compras', monthKey: '2025-08' },
  { id: 't-0811', name: 'Cartao Vo', amount: 169.90, category: 'Comida', monthKey: '2025-08' },
  { id: 't-0812', name: 'Gamers Club', amount: 24.90, category: 'Compras', monthKey: '2025-08' },
  { id: 't-0813', name: 'Natação Sofia', amount: 236.55, category: 'Ajuda Financeira', monthKey: '2025-08' },
  { id: 't-0814', name: 'Investimento PLR', amount: 8000.00, category: 'Investimentos', monthKey: '2025-08' },

  // ──────────────── SETEMBRO 2025 ────────────────────
  { id: 't-0901', name: 'Internet', amount: 108.77, category: 'Fixos', monthKey: '2025-09' },
  { id: 't-0902', name: 'Celular', amount: 60.98, category: 'Fixos', monthKey: '2025-09' },
  { id: 't-0903', name: 'Pagar Camile', amount: 684.64, category: 'Compras', monthKey: '2025-09' },
  { id: 't-0904', name: 'Reserva Casa', amount: 500.00, category: 'Investimentos', monthKey: '2025-09' },
  { id: 't-0905', name: 'Fatura Nubank', amount: 621.39, category: 'Compras', monthKey: '2025-09' },
  { id: 't-0906', name: 'Faculdade', amount: 220.00, category: 'Estudos', monthKey: '2025-09' },
  { id: 't-0907', name: 'Limite Conta Itaú', amount: 650.24, category: 'Compras', monthKey: '2025-09' },
  { id: 't-0908', name: 'Itaú Platinum', amount: 150.31, category: 'Compras', monthKey: '2025-09' },
  { id: 't-0909', name: 'Itaú Platinum 2', amount: 122.22, category: 'Compras', monthKey: '2025-09' },
  { id: 't-0910', name: 'Itaú Platinum 3', amount: 77.84, category: 'Compras', monthKey: '2025-09' },
  { id: 't-0911', name: 'Natação Sofia', amount: 236.55, category: 'Ajuda Financeira', monthKey: '2025-09' },
  { id: 't-0912', name: 'Investimento PLR', amount: 2000.00, category: 'Investimentos', monthKey: '2025-09' },
  { id: 't-0913', name: 'Coxinha Ragazzo', amount: -8.97, category: 'Comida', monthKey: '2025-09' },

  // ──────────────── OUTUBRO 2025 ─────────────────────
  { id: 't-1001', name: 'Internet', amount: 108.77, category: 'Fixos', monthKey: '2025-10' },
  { id: 't-1002', name: 'Celular', amount: 60.98, category: 'Fixos', monthKey: '2025-10' },
  { id: 't-1003', name: 'Reserva Casa', amount: 2500.00, category: 'Investimentos', monthKey: '2025-10' },
  { id: 't-1004', name: 'Fatura Nubank', amount: 1477.40, category: 'Compras', monthKey: '2025-10' },
  { id: 't-1005', name: 'Faculdade', amount: 220.00, category: 'Estudos', monthKey: '2025-10' },
  { id: 't-1006', name: 'Natação Sofia', amount: 236.55, category: 'Ajuda Financeira', monthKey: '2025-10' },
  { id: 't-1007', name: 'Gamers Club', amount: 24.90, category: 'Compras', monthKey: '2025-10' },
  { id: 't-1008', name: 'Github Copilot', amount: 56.36, category: 'Compras', monthKey: '2025-10' },
  { id: 't-1009', name: 'Acordo certo (PAN)', amount: 108.66, category: 'Fixos', monthKey: '2025-10' },
];
