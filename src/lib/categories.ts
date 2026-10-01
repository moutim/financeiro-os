import type { CategoryConfig } from '@/lib/types';
import { 
  ShoppingBag, 
  Paperclip, 
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
  Tv
} from 'lucide-react';

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  Compras: {
    label: 'Compras',
    color: '#007AFF',
    bgColor: 'rgba(0,122,255,0.12)',
    icon: ShoppingBag,
  },
  Fixos: {
    label: 'Fixos',
    color: '#FF9500',
    bgColor: 'rgba(255,149,0,0.12)',
    icon: Paperclip,
  },
  Comida: {
    label: 'Comida',
    color: '#FF3B30',
    bgColor: 'rgba(255,59,48,0.12)',
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
    color: '#BF5AF2',
    bgColor: 'rgba(191,90,242,0.12)',
    icon: Ticket,
  },
  Casa: {
    label: 'Casa',
    color: '#A2845E',
    bgColor: 'rgba(162,132,94,0.12)',
    icon: Home,
  },
  Assinaturas: {
    label: 'Assinaturas',
    color: '#5E5CE6',
    bgColor: 'rgba(94,92,230,0.12)',
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
    color: '#FF2D55',
    bgColor: 'rgba(255,45,85,0.12)',
    icon: Activity,
  },
  Estudos: {
    label: 'Estudos',
    color: '#5856D6',
    bgColor: 'rgba(88,86,214,0.12)',
    icon: BookOpen,
  },
  'Ajuda Financeira': {
    label: 'Ajuda Financeira',
    color: '#AF52DE',
    bgColor: 'rgba(175,82,222,0.12)',
    icon: Handshake,
  },
  Dividendos: {
    label: 'Dividendos',
    color: '#32ADE6',
    bgColor: 'rgba(50,173,230,0.12)',
    icon: CircleDollarSign,
  },
  Outros: {
    label: 'Outros',
    color: '#8E8E93',
    bgColor: 'rgba(142,142,147,0.12)',
    icon: Package,
  },
};

export function getCategoryConfig(cat: string): CategoryConfig {
  return CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG['Outros'];
}
