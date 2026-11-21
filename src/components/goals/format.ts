import type { GoalStatus } from '@/lib/goalPlanning';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2027-03" → "mar/27" */
export const shortMonth = (key: string | null | undefined) => {
  if (!key) return '—';
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1] ?? '?'}/${y.slice(2)}`;
};

/** "2026-10-05" → "05/10/26"; sem data, mostra o mês */
export const shortDate = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

export const pct = (v: number, digits = 1) => `${v.toFixed(digits).replace('.', ',')}%`;

export const STATUS_COLOR: Record<GoalStatus, string> = {
  completed: 'var(--green)',
  paused: 'var(--text-tertiary)',
  'on-track': 'var(--blue)',
  behind: 'var(--orange)',
  overdue: 'var(--red)',
  'no-forecast': 'var(--text-tertiary)',
};

/** Cores das pessoas nos gráficos de contribuição (a mesma pessoa tem a mesma cor em todos) */
export const PERSON_COLORS = ['var(--blue)', 'var(--green)', 'var(--orange)', 'var(--purple)', 'var(--teal)', 'var(--pink)'];
export const personColor = (people: string[], person: string) => PERSON_COLORS[Math.max(0, people.indexOf(person)) % PERSON_COLORS.length];

import type { SavingsGoal } from '@/lib/types';
import { getGoalIconDef } from '@/lib/goalIcons';

/** Cores oferecidas para as caixinhas */
export const GOAL_COLORS = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#32ADE6', '#FF2D55', '#5856D6', '#D9A400'];

/** Cor da caixinha: a escolhida, ou a do ícone */
export const goalColor = (goal: Pick<SavingsGoal, 'color' | 'icon' | 'name'>) => goal.color || getGoalIconDef(goal.icon, goal.name).color;

export const GOAL_CATEGORIES = ['Reserva', 'Viagem', 'Casa', 'Carro', 'Educação', 'Saúde', 'Tecnologia', 'Casamento', 'Aposentadoria', 'Outro'];

/** Estado que a caixinha mostra: em andamento, concluída ou pausada */
export const GOAL_STATE_LABEL = { active: 'Em andamento', completed: 'Concluída', paused: 'Pausada' } as const;
export type GoalState = keyof typeof GOAL_STATE_LABEL;
export const goalState = (status: string): GoalState => (status === 'completed' ? 'completed' : status === 'paused' ? 'paused' : 'active');
