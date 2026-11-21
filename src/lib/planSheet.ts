import { SHEET_TABS } from '@/lib/sheets';
import { rowToGoal } from '@/lib/parsers';
import { readUserTab } from '@/lib/user-sheets-helpers';

/**
 * Onde o plano de uma meta é gravado: na planilha de quem criou a meta. Para meta compartilhada,
 * o dono precisa ser o registrado na minha lista de metas (o cliente não escolhe planilha arbitrária).
 */
export async function resolvePlanSheet(accessToken: string, mySpreadsheetId: string, goalId: string, ownerSpreadsheetId?: string | null): Promise<string> {
  if (!ownerSpreadsheetId || ownerSpreadsheetId === mySpreadsheetId) return mySpreadsheetId;
  const goals = (await readUserTab(accessToken, mySpreadsheetId, SHEET_TABS.METAS)).filter(r => r[0]).map(rowToGoal);
  const goal = goals.find(g => g.id === goalId);
  if (!goal?.isShared || goal.ownerSpreadsheetId !== ownerSpreadsheetId) throw new Error('Meta compartilhada não encontrada');
  return ownerSpreadsheetId;
}
