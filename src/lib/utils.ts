import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Junta classes condicionais e resolve conflitos do Tailwind (padrão shadcn, usado pelos componentes da Spell UI) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
