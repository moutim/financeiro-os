import React from 'react';
import {
  Car,
  Home,
  HeartPulse,
  Plane,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Laptop,
  TrendingUp,
  ShoppingBag,
  Baby,
  Gift,
  Target,
  Smartphone,
  Palmtree,
  Briefcase,
  LucideIcon
} from 'lucide-react';

export interface GoalIconDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const GOAL_ICONS: GoalIconDefinition[] = [
  { id: 'car', label: 'Carro / Moto', icon: Car, color: '#FF9500', bgColor: 'rgba(255, 149, 0, 0.14)' },
  { id: 'home', label: 'Casa / Apê', icon: Home, color: '#007AFF', bgColor: 'rgba(0, 122, 255, 0.14)' },
  { id: 'health', label: 'Cirurgia / Saúde', icon: HeartPulse, color: '#FF2D55', bgColor: 'rgba(255, 45, 85, 0.14)' },
  { id: 'plane', label: 'Viagem / Férias', icon: Plane, color: '#32ADE6', bgColor: 'rgba(50, 173, 230, 0.14)' },
  { id: 'graduation', label: 'Estudos / Cursos', icon: GraduationCap, color: '#AF52DE', bgColor: 'rgba(175, 82, 222, 0.14)' },
  { id: 'shield', label: 'Reserva de Emergência', icon: ShieldCheck, color: '#34C759', bgColor: 'rgba(52, 199, 89, 0.14)' },
  { id: 'sparkles', label: 'Casamento / Festa', icon: Sparkles, color: '#FFD60A', bgColor: 'rgba(255, 214, 10, 0.16)' },
  { id: 'laptop', label: 'Tech / Notebook', icon: Laptop, color: '#5856D6', bgColor: 'rgba(88, 86, 214, 0.14)' },
  { id: 'smartphone', label: 'Celular / iPhone', icon: Smartphone, color: '#5E5CE6', bgColor: 'rgba(94, 92, 230, 0.14)' },
  { id: 'trending', label: 'Investimentos', icon: TrendingUp, color: '#30D158', bgColor: 'rgba(48, 209, 88, 0.14)' },
  { id: 'shopping', label: 'Compras / Bens', icon: ShoppingBag, color: '#FF3B30', bgColor: 'rgba(255, 59, 48, 0.14)' },
  { id: 'baby', label: 'Família / Filhos', icon: Baby, color: '#FF6482', bgColor: 'rgba(255, 100, 130, 0.14)' },
  { id: 'palmtree', label: 'Aposentadoria', icon: Palmtree, color: '#34C759', bgColor: 'rgba(52, 199, 89, 0.14)' },
  { id: 'gift', label: 'Sonho / Presente', icon: Gift, color: '#FF375F', bgColor: 'rgba(255, 55, 95, 0.14)' },
  { id: 'briefcase', label: 'Negócio / Empresa', icon: Briefcase, color: '#8E8E93', bgColor: 'rgba(142, 142, 147, 0.14)' },
  { id: 'target', label: 'Meta Geral', icon: Target, color: '#007AFF', bgColor: 'rgba(0, 122, 255, 0.14)' },
];

/**
 * Returns the matching icon definition by ID or infers from the goal name keywords
 */
export function getGoalIconDef(iconId?: string | null, goalName?: string): GoalIconDefinition {
  if (iconId) {
    const found = GOAL_ICONS.find(item => item.id === iconId);
    if (found) return found;
  }

  const name = (goalName || '').toLowerCase().trim();
  if (/carro|ve[ií]culo|moto|cnh|autom[oó]vel/i.test(name)) return GOAL_ICONS.find(i => i.id === 'car')!;
  if (/casa|apartamento|ap[eê]|im[oó]vel|reforma|constru[cç]/i.test(name)) return GOAL_ICONS.find(i => i.id === 'home')!;
  if (/cirurgia|sa[uú]de|dente|odonto|m[eé]dic|tratamento|rinoplastia|silicone/i.test(name)) return GOAL_ICONS.find(i => i.id === 'health')!;
  if (/viagem|viajar|f[eé]rias|euro|disney|passagem|praia|hotel/i.test(name)) return GOAL_ICONS.find(i => i.id === 'plane')!;
  if (/estudo|faculdade|curso|p[oó]s|mba|livro|escola/i.test(name)) return GOAL_ICONS.find(i => i.id === 'graduation')!;
  if (/reserva|emerg[eê]ncia|seguran[cç]a/i.test(name)) return GOAL_ICONS.find(i => i.id === 'shield')!;
  if (/casamento|noivado|festa|anivers[aá]rio/i.test(name)) return GOAL_ICONS.find(i => i.id === 'sparkles')!;
  if (/notebook|computador|pc|macbook|setup|ipad/i.test(name)) return GOAL_ICONS.find(i => i.id === 'laptop')!;
  if (/celular|iphone|smartphone/i.test(name)) return GOAL_ICONS.find(i => i.id === 'smartphone')!;
  if (/invest|patrim[oô]nio|a[cç][oõ]es|fundo/i.test(name)) return GOAL_ICONS.find(i => i.id === 'trending')!;
  if (/beb[eê]|filho|filha|fam[ií]lia|enxoval/i.test(name)) return GOAL_ICONS.find(i => i.id === 'baby')!;
  if (/aposent|liberdade financeira/i.test(name)) return GOAL_ICONS.find(i => i.id === 'palmtree')!;

  return GOAL_ICONS.find(i => i.id === 'target')!;
}
