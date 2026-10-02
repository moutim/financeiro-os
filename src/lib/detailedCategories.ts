import type { CategoryConfig, ExpenseMacro } from '@/lib/types';
import { 
  Home, 
  Utensils, 
  Car, 
  HeartPulse, 
  GraduationCap, 
  Sparkles, 
  PartyPopper, 
  Plane, 
  ShoppingBag, 
  Tv, 
  Gift, 
  PawPrint, 
  FileText, 
  Percent, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  Package 
} from 'lucide-react';

// ─── 14 CATEGORIAS MACRO DE DESPESAS ──────────────────────────────────────────
export const EXPENSE_MACROS: readonly ExpenseMacro[] = [
  'Moradia',
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Cuidados pessoais',
  'Lazer',
  'Viagens',
  'Compras e bens',
  'Serviços e assinaturas',
  'Família e presentes',
  'Pets',
  'Impostos e obrigações',
  'Financeiro',
] as const;

// ─── HIERARQUIA EXATA MACRO → MICRO DE DESPESAS ──────────────────────────────
export const EXPENSE_HIERARCHY: Record<ExpenseMacro, readonly string[]> = {
  Moradia: [
    'Aluguel',
    'Condomínio',
    'Parcela de imóvel',
    'IPTU',
    'Energia elétrica',
    'Água',
    'Gás',
    'Manutenção e reparos',
    'Móveis',
    'Eletrodomésticos',
    'Decoração',
    'Outros - Moradia',
  ],
  Alimentação: [
    'Mercado e supermercado',
    'Feira e hortifruti',
    'Delivery',
    'Fast food',
    'Restaurantes',
    'Café e confeitaria',
    'Refeições no trabalho',
    'Outros - Alimentação',
  ],
  Transporte: [
    'Transporte por aplicativo',
    'Transporte público',
    'Combustível',
    'Estacionamento e pedágio',
    'Manutenção do veículo',
    'Documentação e impostos do veículo',
    'Financiamento do veículo',
    'Seguro do veículo',
    'Outros - Transporte',
  ],
  Saúde: [
    'Consultas e terapias',
    'Exames',
    'Medicamentos e farmácia',
    'Odontologia',
    'Fisioterapia e reabilitação',
    'Procedimentos e cirurgias',
    'Plano de saúde',
    'Óptica',
    'Atividade física',
    'Outros - Saúde',
  ],
  Educação: [
    'Faculdade',
    'Pós-graduação e MBA',
    'Cursos',
    'Certificações',
    'Idiomas',
    'Livros e materiais de estudo',
    'Eventos e congressos',
    'Outros - Educação',
  ],
  'Cuidados pessoais': [
    'Roupas',
    'Calçados',
    'Bolsas e acessórios',
    'Joias',
    'Maquiagem e cosméticos',
    'Skincare',
    'Cabelo e barbearia',
    'Manicure e pedicure',
    'Estética',
    'Perfumaria',
    'Higiene pessoal',
    'Outros - Cuidados pessoais',
  ],
  Lazer: [
    'Cinema, teatro e shows',
    'Festas e eventos',
    'Bares',
    'Restaurantes',
    'Jogos e videogames',
    'Hobbies',
    'Esportes recreativos',
    'Passeios e parques',
    'Cultura',
    'Outros - Lazer',
  ],
  Viagens: [
    'Passagens',
    'Hospedagem',
    'Transporte',
    'Alimentação',
    'Seguro viagem',
    'Passeios e ingressos',
    'Compras',
    'Bagagem',
    'Câmbio e taxas',
    'Outros - Viagens',
  ],
  'Compras e bens': [
    'Eletrônicos',
    'Celular',
    'Computador e tablet',
    'Televisão',
    'Eletrodomésticos',
    'Móveis',
    'Decoração',
    'Utensílios domésticos',
    'Brinquedos e colecionáveis',
    'Produtos diversos',
    'Outros - Compras',
  ],
  'Serviços e assinaturas': [
    'Streaming',
    'Música',
    'Software e aplicativos',
    'Armazenamento em nuvem',
    'Assinaturas digitais',
    'Telefonia e internet',
    'Clubes',
    'Serviços profissionais',
    'Outros - Serviços',
  ],
  'Família e presentes': [
    'Ajuda financeira',
    'Mesada',
    'Dependentes',
    'Presentes',
    'Doações',
    'Contribuições familiares',
    'Eventos familiares',
    'Outros - Família',
  ],
  Pets: [
    'Alimentação',
    'Veterinário e medicamentos',
    'Banho, tosa e higiene',
    'Brinquedos e acessórios',
    'Creche e hotel',
    'Seguro pet',
    'Outros - Pets',
  ],
  'Impostos e obrigações': [
    'Imposto de renda',
    'Multas',
    'Documentação',
    'Cartório',
    'Taxas governamentais',
    'Taxas profissionais',
    'Outras obrigações',
  ],
  Financeiro: [
    'Empréstimos e financiamentos',
    'Dívidas e acordos',
    'Juros e encargos',
    'Tarifas bancárias',
    'Anuidade e taxas de cartão',
    'IOF',
    'Taxa de corretagem',
    'Taxa de administração',
    'Seguros financeiros',
    'Outros - Financeiro',
  ],
};

// ─── RECEITAS ─────────────────────────────────────────────────────────────────
export const INCOME_CATEGORIES = [
  'Salário',
  '13º salário',
  'Férias',
  'PLR',
  'Freelance e trabalho autônomo',
  'Dividendos',
  'Juros e rendimentos',
  'Cashback',
  'Reembolso',
  'Aluguel recebido',
  'Venda de bens',
  'Benefícios',
  'Outros - Receita',
] as const;

// ─── INVESTIMENTOS ────────────────────────────────────────────────────────────
export const INVESTMENT_CATEGORIES = [
  'Renda fixa',
  'Fundos',
  'Ações',
  'ETFs',
  'FIIs',
  'Previdência',
  'Criptomoedas',
  'Poupança',
  'Outros investimentos',
] as const;

export const INVESTMENT_TYPES = [
  'Aporte',
  'Resgate',
  'Rendimento',
] as const;

// ─── CONFIGURAÇÃO VISUAL DAS CATEGORIAS (Cores e Ícones) ─────────────────────
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  // --- 14 Novas Macros de Despesas ---
  Moradia: {
    label: 'Moradia',
    color: '#007AFF', // Azul Apple
    bgColor: 'rgba(0,122,255,0.12)',
    icon: Home,
  },
  Alimentação: {
    label: 'Alimentação',
    color: '#FF9500', // Laranja
    bgColor: 'rgba(255,149,0,0.12)',
    icon: Utensils,
  },
  Transporte: {
    label: 'Transporte',
    color: '#FDD427', // Amarelo
    bgColor: 'rgba(253,212,39,0.14)',
    icon: Car,
  },
  Saúde: {
    label: 'Saúde',
    color: '#FF2D55', // Rosa avermelhado
    bgColor: 'rgba(255,45,85,0.12)',
    icon: HeartPulse,
  },
  Educação: {
    label: 'Educação',
    color: '#2942C1', // Azul índigo
    bgColor: 'rgba(41,66,193,0.12)',
    icon: GraduationCap,
  },
  'Cuidados pessoais': {
    label: 'Cuidados pessoais',
    color: '#AF52DE', // Roxo
    bgColor: 'rgba(175,82,222,0.12)',
    icon: Sparkles,
  },
  Lazer: {
    label: 'Lazer',
    color: '#1D9F81', // Verde-água
    bgColor: 'rgba(29,159,129,0.12)',
    icon: PartyPopper,
  },
  Viagens: {
    label: 'Viagens',
    color: '#49A3E1', // Azul céu
    bgColor: 'rgba(73,163,225,0.12)',
    icon: Plane,
  },
  'Compras e bens': {
    label: 'Compras e bens',
    color: '#AF038C', // Magenta
    bgColor: 'rgba(175,3,140,0.12)',
    icon: ShoppingBag,
  },
  'Serviços e assinaturas': {
    label: 'Serviços e assinaturas',
    color: '#036286', // Azul petróleo
    bgColor: 'rgba(3,98,134,0.12)',
    icon: Tv,
  },
  'Família e presentes': {
    label: 'Família e presentes',
    color: '#D88AB6', // Rosa claro
    bgColor: 'rgba(216,138,182,0.12)',
    icon: Gift,
  },
  Pets: {
    label: 'Pets',
    color: '#B4710C', // Caramelo
    bgColor: 'rgba(180,113,12,0.14)',
    icon: PawPrint,
  },
  'Impostos e obrigações': {
    label: 'Impostos e obrigações',
    color: '#883839', // Vinho
    bgColor: 'rgba(136,56,57,0.14)',
    icon: FileText,
  },
  Financeiro: {
    label: 'Financeiro',
    color: '#536D0C', // Verde oliva
    bgColor: 'rgba(83,109,12,0.12)',
    icon: Percent,
  },

  // --- Estruturas Especiais ---
  Investimentos: {
    label: 'Investimentos',
    color: '#30D158',
    bgColor: 'rgba(48,209,88,0.14)',
    icon: TrendingUp,
  },
  Receitas: {
    label: 'Receitas',
    color: '#34C759',
    bgColor: 'rgba(52,199,89,0.14)',
    icon: ArrowDownLeft,
  },
  Transferências: {
    label: 'Transferências',
    color: '#64D2FF',
    bgColor: 'rgba(100,210,255,0.14)',
    icon: ArrowLeftRight,
  },

  // --- Fallbacks para categorias legadas (compatibilidade retroativa completa) ---
  Compras: {
    label: 'Compras e bens',
    color: '#AF038C',
    bgColor: 'rgba(175,3,140,0.12)',
    icon: ShoppingBag,
  },
  Comida: {
    label: 'Alimentação',
    color: '#FF9500',
    bgColor: 'rgba(255,149,0,0.12)',
    icon: Utensils,
  },
  Casa: {
    label: 'Moradia',
    color: '#007AFF',
    bgColor: 'rgba(0,122,255,0.12)',
    icon: Home,
  },
  Assinaturas: {
    label: 'Serviços e assinaturas',
    color: '#036286',
    bgColor: 'rgba(3,98,134,0.12)',
    icon: Tv,
  },
  Estudos: {
    label: 'Educação',
    color: '#2942C1',
    bgColor: 'rgba(41,66,193,0.12)',
    icon: GraduationCap,
  },
  'Ajuda Financeira': {
    label: 'Família e presentes',
    color: '#D88AB6',
    bgColor: 'rgba(216,138,182,0.12)',
    icon: Gift,
  },
  Roupas: {
    label: 'Cuidados pessoais',
    color: '#AF52DE',
    bgColor: 'rgba(175,82,222,0.12)',
    icon: Sparkles,
  },
  Presentes: {
    label: 'Família e presentes',
    color: '#D88AB6',
    bgColor: 'rgba(216,138,182,0.12)',
    icon: Gift,
  },
  Empréstimos: {
    label: 'Financeiro',
    color: '#536D0C',
    bgColor: 'rgba(83,109,12,0.12)',
    icon: Percent,
  },
  Dívidas: {
    label: 'Financeiro',
    color: '#536D0C',
    bgColor: 'rgba(83,109,12,0.12)',
    icon: Percent,
  },
  Impostos: {
    label: 'Impostos e obrigações',
    color: '#883839',
    bgColor: 'rgba(136,56,57,0.14)',
    icon: FileText,
  },
  Dividendos: {
    label: 'Receitas',
    color: '#34C759',
    bgColor: 'rgba(52,199,89,0.14)',
    icon: ArrowDownLeft,
  },
  Fixos: {
    label: 'Fixos',
    color: '#8E8E93',
    bgColor: 'rgba(142,142,147,0.12)',
    icon: FileText,
  },
  Outros: {
    label: 'Outros',
    color: '#76757D',
    bgColor: 'rgba(118,117,125,0.12)',
    icon: Package,
  },
};

/**
 * Retorna as microcategorias de uma categoria macro informada.
 */
export function getMicrosForMacro(macro: string): readonly string[] {
  if (macro in EXPENSE_HIERARCHY) {
    return EXPENSE_HIERARCHY[macro as ExpenseMacro];
  }
  return [];
}

/**
 * Retorna a macro correspondente de uma microcategoria, ou null se não encontrada.
 */
export function getMacroForMicro(micro: string): ExpenseMacro | null {
  for (const [macro, micros] of Object.entries(EXPENSE_HIERARCHY)) {
    if (micros.includes(micro)) {
      return macro as ExpenseMacro;
    }
  }
  return null;
}

/**
 * Valida se uma microcategoria pertence à macro especificada.
 */
export function isValidMicroForMacro(macro: string, micro: string): boolean {
  const micros = getMicrosForMacro(macro);
  return micros.includes(micro);
}

/**
 * Retorna a configuração visual da categoria (ícone, cor e fundo).
 */
export function getCategoryConfig(cat: string): CategoryConfig {
  if (CATEGORY_CONFIG[cat]) {
    return CATEGORY_CONFIG[cat];
  }
  // Se for uma micro, busca a macro mãe
  const parentMacro = getMacroForMicro(cat);
  if (parentMacro && CATEGORY_CONFIG[parentMacro]) {
    return CATEGORY_CONFIG[parentMacro];
  }
  return CATEGORY_CONFIG['Outros'];
}

/**
 * Migra de forma segura qualquer categoria antiga para a nova hierarquia Macro → Micro,
 * preservando atributos de comportamento (Fixo, Investimento, Receita).
 */
export function migrateTransactionCategory(
  rawCategory: string = '',
  rawSubcategory?: string | null,
  name: string = ''
): {
  macro: ExpenseMacro | string;
  micro: string;
  recurrency?: 'Fixo' | 'Variável' | 'Pontual';
  transactionType?: 'expense' | 'income' | 'investment' | 'transfer';
} {
  const trimmedCat = (rawCategory || '').trim();
  const trimmedSub = (rawSubcategory || '').trim();
  const lowerName = (name || '').toLowerCase();

  // Caso 1: String composta (ex: "Alimentação > Delivery" ou "Alimentação: Delivery")
  if (trimmedCat.includes('>') || trimmedCat.includes(':')) {
    const parts = trimmedCat.split(/[>:]/).map(p => p.trim());
    const candidateMacro = parts[0];
    const candidateMicro = parts[1];
    if (candidateMacro in EXPENSE_HIERARCHY) {
      const validMicros = EXPENSE_HIERARCHY[candidateMacro as ExpenseMacro];
      const foundMicro = validMicros.find(m => m.toLowerCase() === candidateMicro.toLowerCase());
      return {
        macro: candidateMacro as ExpenseMacro,
        micro: foundMicro || `Outros - ${candidateMacro}`,
        transactionType: 'expense',
      };
    }
  }

  // Caso 2: Categoria informada já é uma das 14 Macros novas
  if (trimmedCat in EXPENSE_HIERARCHY) {
    const macro = trimmedCat as ExpenseMacro;
    const validMicros = EXPENSE_HIERARCHY[macro];
    if (trimmedSub && validMicros.includes(trimmedSub)) {
      return { macro, micro: trimmedSub, transactionType: 'expense' };
    }
    // Tenta inferir a micro com base no nome
    const foundByText = validMicros.find(m => lowerName.includes(m.toLowerCase()));
    return {
      macro,
      micro: foundByText || `Outros - ${macro}`,
      transactionType: 'expense',
    };
  }

  // Caso 3: Mapeamento de categorias legadas
  switch (trimmedCat) {
    case 'Comida': {
      let micro = 'Outros - Alimentação';
      if (lowerName.includes('delivery') || lowerName.includes('ifood') || lowerName.includes('rappi')) micro = 'Delivery';
      else if (lowerName.includes('restaurante') || lowerName.includes('lolla') || lowerName.includes('almoço') || lowerName.includes('jantar')) micro = 'Restaurantes';
      else if (lowerName.includes('mercado') || lowerName.includes('supermercado') || lowerName.includes('pão de açúcar') || lowerName.includes('carrefour')) micro = 'Mercado e supermercado';
      else if (lowerName.includes('feira') || lowerName.includes('hortifruti')) micro = 'Feira e hortifruti';
      else if (lowerName.includes('café') || lowerName.includes('padaria') || lowerName.includes('confeitaria')) micro = 'Café e confeitaria';
      else if (lowerName.includes('mcdonald') || lowerName.includes('burger') || lowerName.includes('fast food')) micro = 'Fast food';
      return { macro: 'Alimentação', micro, transactionType: 'expense' };
    }

    case 'Compras': {
      let micro = 'Outros - Compras';
      if (lowerName.includes('celular') || lowerName.includes('iphone') || lowerName.includes('samsung')) micro = 'Celular';
      else if (lowerName.includes('roupa') || lowerName.includes('camisa')) {
        return { macro: 'Cuidados pessoais', micro: 'Roupas', transactionType: 'expense' };
      } else if (lowerName.includes('chinelo') || lowerName.includes('tenis') || lowerName.includes('calçado')) {
        return { macro: 'Cuidados pessoais', micro: 'Calçados', transactionType: 'expense' };
      } else if (lowerName.includes('vivara') || lowerName.includes('joia') || lowerName.includes('relogio')) {
        return { macro: 'Cuidados pessoais', micro: 'Joias', transactionType: 'expense' };
      } else if (lowerName.includes('fifa') || lowerName.includes('jogo') || lowerName.includes('game') || lowerName.includes('playstation') || lowerName.includes('ps5')) {
        return { macro: 'Lazer', micro: 'Jogos e videogames', transactionType: 'expense' };
      } else if (lowerName.includes('ingresso') || lowerName.includes('show') || lowerName.includes('cinema') || lowerName.includes('teatro')) {
        return { macro: 'Lazer', micro: 'Cinema, teatro e shows', transactionType: 'expense' };
      } else if (lowerName.includes('computador') || lowerName.includes('notebook') || lowerName.includes('tablet')) {
        micro = 'Computador e tablet';
      } else if (lowerName.includes('eletronico') || lowerName.includes('fone')) {
        micro = 'Eletrônicos';
      }
      return { macro: 'Compras e bens', micro, transactionType: 'expense' };
    }

    case 'Transporte': {
      let micro = 'Outros - Transporte';
      if (lowerName.includes('uber') || lowerName.includes('99') || lowerName.includes('cabify')) micro = 'Transporte por aplicativo';
      else if (lowerName.includes('combustivel') || lowerName.includes('gasolina') || lowerName.includes('etanol') || lowerName.includes('posto')) micro = 'Combustível';
      else if (lowerName.includes('onibus') || lowerName.includes('metro') || lowerName.includes('trem') || lowerName.includes('passagem')) micro = 'Transporte público';
      else if (lowerName.includes('estacionamento') || lowerName.includes('pedagio') || lowerName.includes('sem parar')) micro = 'Estacionamento e pedágio';
      else if (lowerName.includes('ipva') || lowerName.includes('licenciamento')) micro = 'Documentação e impostos do veículo';
      return { macro: 'Transporte', micro, transactionType: 'expense' };
    }

    case 'Casa': {
      let micro = 'Outros - Moradia';
      if (lowerName.includes('aluguel')) micro = 'Aluguel';
      else if (lowerName.includes('condominio')) micro = 'Condomínio';
      else if (lowerName.includes('iptu')) micro = 'IPTU';
      else if (lowerName.includes('luz') || lowerName.includes('energia') || lowerName.includes('enel')) micro = 'Energia elétrica';
      else if (lowerName.includes('agua') || lowerName.includes('sabesp')) micro = 'Água';
      else if (lowerName.includes('gas') || lowerName.includes('comgas')) micro = 'Gás';
      return { macro: 'Moradia', micro, transactionType: 'expense' };
    }

    case 'Assinaturas': {
      let micro = 'Outros - Serviços';
      if (lowerName.includes('netflix') || lowerName.includes('spotify') || lowerName.includes('prime') || lowerName.includes('disney') || lowerName.includes('streaming') || lowerName.includes('musica')) micro = 'Streaming';
      else if (lowerName.includes('internet') || lowerName.includes('celular') || lowerName.includes('claro') || lowerName.includes('vivo') || lowerName.includes('tim')) micro = 'Telefonia e internet';
      else if (lowerName.includes('github') || lowerName.includes('copilot') || lowerName.includes('chatgpt') || lowerName.includes('software')) micro = 'Software e aplicativos';
      else if (lowerName.includes('academia') || lowerName.includes('smart fit') || lowerName.includes('gym')) {
        return { macro: 'Saúde', micro: 'Atividade física', transactionType: 'expense' };
      }
      return { macro: 'Serviços e assinaturas', micro, transactionType: 'expense' };
    }

    case 'Saúde': {
      let micro = 'Outros - Saúde';
      if (lowerName.includes('farmacia') || lowerName.includes('medicamento') || lowerName.includes('drogasil') || lowerName.includes('droga raia')) micro = 'Medicamentos e farmácia';
      else if (lowerName.includes('consulta') || lowerName.includes('terapia') || lowerName.includes('psicolog')) micro = 'Consultas e terapias';
      else if (lowerName.includes('exame') || lowerName.includes('laboratorio')) micro = 'Exames';
      else if (lowerName.includes('dentista') || lowerName.includes('odonto')) micro = 'Odontologia';
      else if (lowerName.includes('plano') || lowerName.includes('convenio') || lowerName.includes('unimed') || lowerName.includes('bradesco saude') || lowerName.includes('amil')) micro = 'Plano de saúde';
      else if (lowerName.includes('academia') || lowerName.includes('treino')) micro = 'Atividade física';
      return { macro: 'Saúde', micro, transactionType: 'expense' };
    }

    case 'Estudos': {
      let micro = 'Outros - Educação';
      if (lowerName.includes('faculdade') || lowerName.includes('universidade')) micro = 'Faculdade';
      else if (lowerName.includes('fiap') || lowerName.includes('curso')) micro = 'Cursos';
      else if (lowerName.includes('pos') || lowerName.includes('mba')) micro = 'Pós-graduação e MBA';
      else if (lowerName.includes('ingles') || lowerName.includes('idioma')) micro = 'Idiomas';
      else if (lowerName.includes('livro') || lowerName.includes('apostila')) micro = 'Livros e materiais de estudo';
      return { macro: 'Educação', micro, transactionType: 'expense' };
    }

    case 'Lazer': {
      let micro = 'Outros - Lazer';
      if (lowerName.includes('bar') || lowerName.includes('balada') || lowerName.includes('festa')) micro = 'Bares';
      else if (lowerName.includes('cinema') || lowerName.includes('show') || lowerName.includes('teatro')) micro = 'Cinema, teatro e shows';
      else if (lowerName.includes('jogo') || lowerName.includes('game')) micro = 'Jogos e videogames';
      return { macro: 'Lazer', micro, transactionType: 'expense' };
    }

    case 'Ajuda Financeira': {
      return { macro: 'Família e presentes', micro: 'Ajuda financeira', transactionType: 'expense' };
    }

    case 'Roupas': {
      let micro = 'Roupas';
      if (lowerName.includes('tenis') || lowerName.includes('tênis') || lowerName.includes('sapato') || lowerName.includes('chinelo') || lowerName.includes('calçado') || lowerName.includes('sandalia') || lowerName.includes('sandália')) micro = 'Calçados';
      else if (lowerName.includes('bolsa') || lowerName.includes('mochila') || lowerName.includes('cinto') || lowerName.includes('oculos') || lowerName.includes('óculos')) micro = 'Bolsas e acessórios';
      return { macro: 'Cuidados pessoais', micro, transactionType: 'expense' };
    }

    case 'Presentes': {
      return { macro: 'Família e presentes', micro: 'Presentes', transactionType: 'expense' };
    }

    case 'Empréstimos': {
      return { macro: 'Financeiro', micro: 'Empréstimos e financiamentos', transactionType: 'expense' };
    }

    case 'Dívidas': {
      return { macro: 'Financeiro', micro: 'Dívidas e acordos', transactionType: 'expense' };
    }

    case 'Impostos': {
      let micro = 'Outras obrigações';
      if (lowerName.includes('imposto de renda') || lowerName.includes('irpf')) micro = 'Imposto de renda';
      else if (lowerName.includes('multa')) micro = 'Multas';
      else if (lowerName.includes('cartorio') || lowerName.includes('cartório')) micro = 'Cartório';
      return { macro: 'Impostos e obrigações', micro, transactionType: 'expense' };
    }

    case 'Investimentos': {
      let micro = 'Outros investimentos';
      if (lowerName.includes('cdb') || lowerName.includes('tesouro') || lowerName.includes('lci') || lowerName.includes('lca')) micro = 'Renda fixa';
      else if (lowerName.includes('acao') || lowerName.includes('ações')) micro = 'Ações';
      else if (lowerName.includes('fii')) micro = 'FIIs';
      else if (lowerName.includes('fundo') || lowerName.includes('dahlia')) micro = 'Fundos';
      else if (lowerName.includes('caixinha') || lowerName.includes('reserva')) micro = 'Renda fixa';
      else if (lowerName.includes('cripto') || lowerName.includes('bitcoin')) micro = 'Criptomoedas';
      return { macro: 'Investimentos', micro, transactionType: 'investment' };
    }

    case 'Dividendos': {
      return { macro: 'Receitas', micro: 'Dividendos', transactionType: 'income' };
    }

    case 'Fixos': {
      // Regra da Seção 9: Para "Fixos", preservar a informação como atributo de comportamento/tipo Fixo
      if (lowerName.includes('internet') || lowerName.includes('celular') || lowerName.includes('telefone') || lowerName.includes('vivo') || lowerName.includes('claro') || lowerName.includes('tim')) {
        return { macro: 'Serviços e assinaturas', micro: 'Telefonia e internet', recurrency: 'Fixo', transactionType: 'expense' };
      }
      if (lowerName.includes('faculdade') || lowerName.includes('fiap') || lowerName.includes('escola')) {
        return { macro: 'Educação', micro: 'Faculdade', recurrency: 'Fixo', transactionType: 'expense' };
      }
      if (lowerName.includes('acordo') || lowerName.includes('pan') || lowerName.includes('emprestimo') || lowerName.includes('juros') || lowerName.includes('das')) {
        if (lowerName.includes('das')) {
          return { macro: 'Impostos e obrigações', micro: 'Taxas governamentais', recurrency: 'Fixo', transactionType: 'expense' };
        }
        const micro = lowerName.includes('emprestimo') ? 'Empréstimos e financiamentos'
          : lowerName.includes('acordo') ? 'Dívidas e acordos'
          : 'Juros e encargos';
        return { macro: 'Financeiro', micro, recurrency: 'Fixo', transactionType: 'expense' };
      }
      if (lowerName.includes('aluguel') || lowerName.includes('condominio') || lowerName.includes('iptu') || lowerName.includes('luz') || lowerName.includes('energia') || lowerName.includes('agua') || lowerName.includes('gas')) {
        return { macro: 'Moradia', micro: 'Outros - Moradia', recurrency: 'Fixo', transactionType: 'expense' };
      }
      return { macro: 'Serviços e assinaturas', micro: 'Outros - Serviços', recurrency: 'Fixo', transactionType: 'expense' };
    }

    default: {
      return { macro: 'Compras e bens', micro: 'Outros - Compras', transactionType: 'expense' };
    }
  }
}
