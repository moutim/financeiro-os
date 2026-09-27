import { readTab, deleteRowById, appendRow, SHEET_TABS } from './src/lib/sheets';
import { rowToIncome, incomeToRow } from './src/lib/parsers';

import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf-8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2];
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[match[1]] = val;
  }
});

async function fix() {
  const rows = await readTab(SHEET_TABS.RECEITAS);
  const incomes = rows.filter(r => r[0]).map(rowToIncome);
  
  for (const inc of incomes) {
    if (inc.name === 'Salário PROA' && inc.monthKey >= '2025-03') {
      console.log('Deleting', inc.id, inc.monthKey);
      await deleteRowById(SHEET_TABS.RECEITAS, inc.id);
    }
  }

  const hasPlrSept = incomes.some(i => i.name === 'PLR' && i.monthKey === '2025-09');
  if (!hasPlrSept) {
    const plr = { id: `r-${Date.now()}`, name: 'PLR', amount: 8457, monthKey: '2025-09' };
    console.log('Adding PLR', plr);
    await appendRow(SHEET_TABS.RECEITAS, incomeToRow(plr));
  }
  
  console.log('Done');
}
fix().catch(console.error);
