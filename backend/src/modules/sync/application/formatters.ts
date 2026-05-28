/* eslint-disable @typescript-eslint/no-explicit-any */

export function formatSummary(stats: {
  lastSynced: string;
  accountCount: number;
  movementCount: number;
  netWorth: number;
}): string[][] {
  return [
    ['Last Synced', 'Accounts', 'Movements', 'Net Worth'],
    [stats.lastSynced, String(stats.accountCount), String(stats.movementCount), String(stats.netWorth)],
  ];
}

export function formatAccounts(accounts: any[]): string[][] {
  return [
    ['Name', 'Currency', 'Type', 'Balance', 'Principal', 'Interest Rate', 'Stock Symbol', 'Archived', 'ID'],
    ...accounts.map((a) => [
      a.name ?? '',
      a.currency ?? '',
      a.type ?? '',
      String(a.balance ?? 0),
      a.type === 'cd' ? String(a.principal ?? 0) : '',
      a.type === 'cd' ? String(a.interest_rate ?? 0) + '%' : '',
      a.stock_symbol ?? '',
      a.archived_at ? 'Yes' : '',
      a.id,
    ]),
  ];
}

export function formatPockets(pockets: any[]): string[][] {
  return [
    ['Account', 'Name', 'Type', 'Balance', 'Currency', 'Archived', 'ID'],
    ...pockets.map((p) => [
      p.account_name ?? '',
      p.name ?? '',
      p.type ?? '',
      String(p.balance ?? 0),
      p.currency ?? '',
      p.archived_at ? 'Yes' : '',
      p.id,
    ]),
  ];
}

export function formatFixedExpenses(expenses: any[]): string[][] {
  return [
    ['Group', 'Name', 'Target', 'Periodicity (months)', 'Balance', 'Monthly Contribution', 'ID'],
    ...expenses.map((e) => [
      e.group_name ?? '',
      e.name ?? '',
      String(e.value_total ?? 0),
      String(e.periodicity_months ?? 0),
      String(e.balance ?? 0),
      String(e.monthly_contribution ?? 0),
      e.id,
    ]),
  ];
}

export function formatMovements(movements: any[]): Map<number, string[][]> {
  const header = ['Date', 'Type', 'Account', 'Pocket', 'Sub-Pocket', 'Amount', 'Notes', 'Pending', 'ID'];
  const byYear = new Map<number, string[][]>();

  for (const m of movements) {
    const date = m.displayed_date ?? '';
    const year = date ? new Date(date).getFullYear() : 0;
    if (!Number.isFinite(year) || year === 0) continue;
    if (!byYear.has(year)) byYear.set(year, [header]);
    byYear.get(year)!.push([
      date,
      m.type ?? '',
      m.account_name ?? '',
      m.pocket_name ?? '',
      m.sub_pocket_name ?? '',
      String(m.amount ?? 0),
      m.notes ?? '',
      m.is_pending ? 'Yes' : '',
      m.id,
    ]);
  }

  return byYear;
}

export function formatNetWorth(snapshots: any[]): string[][] {
  return [
    ['Date', 'Total', 'COP', 'USD', 'MXN', 'Source', 'Notes'],
    ...snapshots.map((s) => [
      s.snapshot_date ?? '',
      String(s.total_net_worth ?? 0),
      String(s.breakdown?.COP ?? ''),
      String(s.breakdown?.USD ?? ''),
      String(s.breakdown?.MXN ?? ''),
      s.source ?? '',
      s.notes ?? '',
    ]),
  ];
}

export function formatSettings(settings: Record<string, any>): string[][] {
  return [
    ['Key', 'Value'],
    ...Object.entries(settings)
      .filter(([k]) => !['id', 'user_id', 'created_at', 'updated_at'].includes(k))
      .map(([k, v]) => [k, typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '')]),
  ];
}
