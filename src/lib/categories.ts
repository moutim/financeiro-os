import type { CategoryConfig } from '@/lib/types';
import { 
  ShoppingBag, 
  Utensils, 
  TrendingUp, 
  Activity, 
  BookOpen, 
  Handshake, 
  CircleDollarSign, 
  Package,
  Car,
  Ticket,
  Home,
  Tv,
  Plane,
  PawPrint,
  Sparkles,
  Gift,
  Landmark,
  Receipt,
  FileText,
  Shirt
} from 'lucide-react';

/**
 * Cores escolhidas para ficarem bem distintas entre si nos gráficos (todas as
 * categorias podem aparecer lado a lado no anel). As categorias que existem
 * nos dois modos usam a mesma cor do modo detalhado (Casa = Moradia…).
 * Ao trocar uma cor, confira se ela não ficou parecida com outra da lista.
 */
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  Compras: {
    label: 'Compras',
    color: '#A21CAF',
    bgColor: 'rgba(162,28,175,0.12)',
    icon: ShoppingBag,
  },
  Roupas: {
    label: 'Roupas',
    color: '#4F46E5',
    bgColor: 'rgba(79,70,229,0.12)',
    icon: Shirt,
  },
  Comida: {
    label: 'Comida',
    color: '#FF9500',
    bgColor: 'rgba(255,149,0,0.12)',
    icon: Utensils,
  },
  Transporte: {
    label: 'Transporte',
    color: '#FFCC00',
    bgColor: 'rgba(255,204,0,0.12)',
    icon: Car,
  },
  Lazer: {
    label: 'Lazer',
    color: '#D946EF',
    bgColor: 'rgba(217,70,239,0.12)',
    icon: Ticket,
  },
  Casa: {
    label: 'Casa',
    color: '#007AFF',
    bgColor: 'rgba(0,122,255,0.12)',
    icon: Home,
  },
  Assinaturas: {
    label: 'Assinaturas',
    color: '#0369A1',
    bgColor: 'rgba(3,105,161,0.12)',
    icon: Tv,
  },
  Investimentos: {
    label: 'Investimentos',
    color: '#34C759',
    bgColor: 'rgba(52,199,89,0.12)',
    icon: TrendingUp,
  },
  Saúde: {
    label: 'Saúde',
    color: '#DB2777',
    bgColor: 'rgba(219,39,119,0.12)',
    icon: Activity,
  },
  Estudos: {
    label: 'Estudos',
    color: '#8B5CF6',
    bgColor: 'rgba(139,92,246,0.12)',
    icon: BookOpen,
  },
  'Ajuda Financeira': {
    label: 'Ajuda Financeira',
    color: '#00C7BE',
    bgColor: 'rgba(0,199,190,0.12)',
    icon: Handshake,
  },
  // Viagens, Pets e Cuidados pessoais têm o mesmo nome das macros do modo
  // detalhado, então valem nos dois modos sem conversão
  Viagens: {
    label: 'Viagens',
    color: '#0EA5E9',
    bgColor: 'rgba(14,165,233,0.12)',
    icon: Plane,
  },
  Pets: {
    label: 'Pets',
    color: '#B4710C',
    bgColor: 'rgba(180,113,12,0.12)',
    icon: PawPrint,
  },
  'Cuidados pessoais': {
    label: 'Cuidados pessoais',
    color: '#F472B6',
    bgColor: 'rgba(244,114,182,0.12)',
    icon: Sparkles,
  },
  Presentes: {
    label: 'Presentes',
    color: '#A78BFA',
    bgColor: 'rgba(167,139,250,0.12)',
    icon: Gift,
  },
  Empréstimos: {
    label: 'Empréstimos',
    color: '#4D7C0F',
    bgColor: 'rgba(77,124,15,0.12)',
    icon: Landmark,
  },
  Dívidas: {
    label: 'Dívidas',
    color: '#FF3B30',
    bgColor: 'rgba(255,59,48,0.12)',
    icon: Receipt,
  },
  Impostos: {
    label: 'Impostos',
    color: '#B91C1C',
    bgColor: 'rgba(185,28,28,0.12)',
    icon: FileText,
  },
  Dividendos: {
    label: 'Dividendos',
    color: '#0D9488',
    bgColor: 'rgba(13,148,136,0.12)',
    icon: CircleDollarSign,
  },
  Outros: {
    label: 'Outros',
    color: '#8E8E93',
    bgColor: 'rgba(142,142,147,0.12)',
    icon: Package,
  },
};

/** Categorias em ordem alfabética (seletores, filtros e resumo), com "Outros" sempre por último */
export const CATEGORY_NAMES: readonly string[] = Object.keys(CATEGORY_CONFIG).sort((a, b) => {
  if (a === 'Outros') return 1;
  if (b === 'Outros') return -1;
  return a.localeCompare(b, 'pt-BR');
});

export function getCategoryConfig(cat: string): CategoryConfig {
  return CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG['Outros'];
}
