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

export function formatAccounts(
  accounts: Array<{
    id: string;
    name: string;
    currency: string;
    type: string;
    balance: number;
    stockSymbol?: string;
    archivedAt?: string | null;
  }>,
): string[][] {
  return [
    ['Name', 'Currency', 'Type', 'Balance', 'Stock Symbol', 'Archived', 'ID'],
    ...accounts.map((a) => [
      a.name,
      a.currency,
      a.type,
      String(a.balance),
      a.stockSymbol ?? '',
      a.archivedAt ? 'Yes' : '',
      a.id,
    ]),
  ];
}

export function formatPockets(
  pockets: Array<{
    id: string;
    name: string;
    accountName: string;
    type: string;
    balance: number;
    currency: string;
    archivedAt?: string | null;
  }>,
): string[][] {
  return [
    ['Account', 'Name', 'Type', 'Balance', 'Currency', 'Archived', 'ID'],
    ...pockets.map((p) => [
      p.accountName,
      p.name,
      p.type,
      String(p.balance),
      p.currency,
      p.archivedAt ? 'Yes' : '',
      p.id,
    ]),
  ];
}

export function formatFixedExpenses(
  expenses: Array<{
    id: string;
    groupName: string;
    name: string;
    valueTotal: number;
    periodicityMonths: number;
    balance: number;
    monthlyContribution: number;
  }>,
): string[][] {
  return [
    ['Group', 'Name', 'Target', 'Periodicity', 'Balance', 'Monthly Contribution', 'ID'],
    ...expenses.map((e) => [
      e.groupName,
      e.name,
      String(e.valueTotal),
      String(e.periodicityMonths),
      String(e.balance),
      String(e.monthlyContribution),
      e.id,
    ]),
  ];
}

export function formatMovements(
  movements: Array<{
    id: string;
    displayedDate: string;
    type: string;
    accountName: string;
    pocketName: string;
    subPocketName?: string;
    amount: number;
    notes?: string;
    isPending: boolean;
  }>,
): Map<number, string[][]> {
  const header = ['Date', 'Type', 'Account', 'Pocket', 'Sub-Pocket', 'Amount', 'Notes', 'Pending', 'ID'];
  const byYear = new Map<number, string[][]>();

  for (const m of movements) {
    const year = new Date(m.displayedDate).getFullYear();
    if (!byYear.has(year)) {
      byYear.set(year, [header]);
    }
    byYear.get(year)!.push([
      m.displayedDate,
      m.type,
      m.accountName,
      m.pocketName,
      m.subPocketName ?? '',
      String(m.amount),
      m.notes ?? '',
      m.isPending ? 'Yes' : '',
      m.id,
    ]);
  }

  return byYear;
}

export function formatNetWorth(
  snapshots: Array<{
    snapshotDate: string;
    total: number;
    breakdown?: Record<string, number>;
    source?: string;
    notes?: string;
  }>,
): string[][] {
  return [
    ['Date', 'Total', 'COP', 'USD', 'MXN', 'Source', 'Notes'],
    ...snapshots.map((s) => [
      s.snapshotDate,
      String(s.total),
      String(s.breakdown?.COP ?? ''),
      String(s.breakdown?.USD ?? ''),
      String(s.breakdown?.MXN ?? ''),
      s.source ?? '',
      s.notes ?? '',
    ]),
  ];
}

export function formatSettings(settings: Record<string, string>): string[][] {
  return [
    ['Key', 'Value'],
    ...Object.entries(settings).map(([k, v]) => [k, v]),
  ];
}
