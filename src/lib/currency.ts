export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return formatCurrency(value);
}

export function parseMonthKey(key: string): { year: number; month: number } | null {
  if (!key) return null;
  const cleaned = String(key).trim();
  
  // Pattern YYYY-MM or YYYY-M
  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})$/);
  if (isoMatch) {
    const yr = parseInt(isoMatch[1], 10);
    const mo = parseInt(isoMatch[2], 10);
    if (mo >= 1 && mo <= 12) return { year: yr, month: mo };
  }
  
  // Pattern MM/YYYY or M/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const yr = parseInt(slashMatch[2], 10);
    const mo = parseInt(slashMatch[1], 10);
    if (mo >= 1 && mo <= 12) return { year: yr, month: mo };
  }

  // Pattern like "fev-27" or "abr-26" or "fev/27"
  const shortPtMatch = cleaned.match(/^([a-zA-Z]{3})[-/](\d{2,4})$/i);
  if (shortPtMatch) {
    const ptMonths = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const mIdx = ptMonths.indexOf(shortPtMatch[1].toLowerCase());
    let yr = parseInt(shortPtMatch[2], 10);
    if (yr < 100) yr += 2000;
    if (mIdx !== -1) {
      return { year: yr, month: mIdx + 1 };
    }
  }

  // Pattern like "abril" or "abril 2026"
  const fullPtMatch = cleaned.match(/^([a-zA-Zç]+)(?:[-/\s]*(\d{2,4}))?$/i);
  if (fullPtMatch) {
    const fullMonths = [
      ['janeiro', 'jan'],
      ['fevereiro', 'fev'],
      ['março', 'marco', 'mar'],
      ['abril', 'abr'],
      ['maio', 'mai'],
      ['junho', 'jun'],
      ['julho', 'jul'],
      ['agosto', 'ago'],
      ['setembro', 'set'],
      ['outubro', 'out'],
      ['novembro', 'nov'],
      ['dezembro', 'dez']
    ];
    const name = fullPtMatch[1].toLowerCase();
    const mIdx = fullMonths.findIndex(list => list.includes(name));
    let yr = fullPtMatch[2] ? parseInt(fullPtMatch[2], 10) : new Date().getFullYear();
    if (yr < 100) yr += 2000;
    if (mIdx !== -1) {
      return { year: yr, month: mIdx + 1 };
    }
  }

  return null;
}

export function toCanonicalMonthKey(key: string): string {
  const parsed = parseMonthKey(key);
  if (!parsed) return key;
  return `${parsed.year}-${String(parsed.month).padStart(2, '0')}`;
}

export function sortMonthKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const parsedA = parseMonthKey(a);
    const parsedB = parseMonthKey(b);
    if (parsedA && parsedB) {
      return (parsedA.year * 12 + parsedA.month) - (parsedB.year * 12 + parsedB.month);
    }
    if (parsedA) return -1;
    if (parsedB) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Retorna uma sequência contínua de meses cronológicos entre o menor e o maior mês encontrado,
 * garantindo que não haja saltos (como ir direto de fev-27 para abril).
 */
export function getContinuousMonthKeys(keys: string[]): string[] {
  const valid = keys.map(k => parseMonthKey(k)).filter((p): p is { year: number; month: number } => p !== null);
  if (valid.length === 0) return keys;
  valid.sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
  const min = valid[0];
  const max = valid[valid.length - 1];

  const result: string[] = [];
  let curY = min.year;
  let curM = min.month;
  while (curY < max.year || (curY === max.year && curM <= max.month)) {
    result.push(`${curY}-${String(curM).padStart(2, '0')}`);
    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }
  return result;
}

export function addMonths(monthKey: string, add: number): string {
  const parsed = parseMonthKey(monthKey) || { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  const totalMonths = parsed.year * 12 + (parsed.month - 1) + add;
  const newY = Math.floor(totalMonths / 12);
  const newM = (totalMonths % 12 + 12) % 12 + 1;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

/**
 * Faz o parse flexível de parcelas digitadas pelo usuário:
 * "3/3", "2/5", "1/12", "12x", "12", "3 de 10", etc.
 */
export function parseInstallmentInput(input: string): { current: number; total: number } | null {
  if (!input || !input.trim()) return null;
  const cleaned = input.trim().toLowerCase();
  
  // Padrão: "X/Y" ou "X / Y" ou "X de Y"
  const matchFraction = cleaned.match(/^(\d+)\s*(?:\/|\s+de\s+)\s*(\d+)$/);
  if (matchFraction) {
    const current = parseInt(matchFraction[1], 10);
    const total = parseInt(matchFraction[2], 10);
    if (!isNaN(current) && !isNaN(total) && total >= 1 && current >= 1 && current <= total) {
      return { current, total };
    }
  }

  // Padrão: "X" ou "Xx"
  const matchSingle = cleaned.match(/^(\d+)\s*x?$/);
  if (matchSingle) {
    const total = parseInt(matchSingle[1], 10);
    if (!isNaN(total) && total > 1) {
      return { current: 1, total };
    }
  }

  return null;
}

/**
 * Divide um valor total em parcelas: as parcelas são arredondadas para baixo no centavo
 * e a primeira absorve a sobra, para a soma bater com o total.
 * Ex: 599,90 em 6x → primeira 100,00 e as demais 99,98.
 */
export function splitInstallments(total: number, count: number): { first: number; rest: number } {
  if (count <= 1) return { first: total, rest: total };
  const rest = Math.floor((total / count) * 100) / 100;
  const first = Math.round((total - rest * (count - 1)) * 100) / 100;
  return { first, rest };
}

export function monthKeyToLabel(monthKey: string): string {
  const canonical = toCanonicalMonthKey(monthKey);
  const [year, month] = canonical.split('-').map(Number);
  if (isNaN(year) || isNaN(month)) return monthKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function monthKeyToShortLabel(monthKey: string): string {
  const canonical = toCanonicalMonthKey(monthKey);
  const [year, month] = canonical.split('-').map(Number);
  if (isNaN(year) || isNaN(month)) return monthKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

export function formatMask(digits: string): string {
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parseMask(value: string): string {
  return value.replace(/\D/g, '');
}
