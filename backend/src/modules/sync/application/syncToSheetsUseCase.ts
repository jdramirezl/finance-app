import { getGoogleClients } from '../infrastructure/googleSheetsClient';
import {
  formatAccounts,
  formatPockets,
  formatMovements,
  formatNetWorth,
  formatFixedExpenses,
  formatSummary,
  formatSettings,
} from './formatters';
import { createSpreadsheet, writeAllTabs } from './spreadsheetManager';
import { applyFormatting } from './spreadsheetFormatter';

export class SyncToSheetsUseCase {
  async execute(
    userId: string,
    supabase: any
  ): Promise<{ spreadsheetUrl: string }> {
    const { sheets, drive } = getGoogleClients();

    // Fetch all user data
    const [
      { data: accounts },
      { data: pockets },
      { data: subPockets },
      { data: movements },
      { data: snapshots },
      { data: groups },
      { data: settings },
    ] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', userId),
      supabase.from('pockets').select('*').eq('user_id', userId),
      supabase.from('sub_pockets').select('*').eq('user_id', userId),
      supabase
        .from('movements')
        .select('*')
        .eq('user_id', userId)
        .order('displayed_date', { ascending: false }),
      supabase.from('net_worth_snapshots').select('*').eq('user_id', userId),
      supabase.from('fixed_expense_groups').select('*').eq('user_id', userId),
      supabase.from('settings').select('*').eq('user_id', userId).single(),
    ]);

    // Resolve or create spreadsheet
    let spreadsheetId = settings?.google_sheet_id;
    if (!spreadsheetId) {
      spreadsheetId = await createSpreadsheet(
        drive,
        'Finance App Backup',
        'julian.loperamirez@gmail.com'
      );
      await supabase
        .from('settings')
        .update({ google_sheet_id: spreadsheetId })
        .eq('user_id', userId);
    }

    // Build lookup maps for human-readable joins
    const accountMap = new Map(
      (accounts || []).map((a: any) => [a.id, a.name])
    );
    const pocketMap = new Map(
      (pockets || []).map((p: any) => [p.id, p.name])
    );
    const subPocketMap = new Map(
      (subPockets || []).map((sp: any) => [sp.id, sp.name])
    );
    const groupMap = new Map(
      (groups || []).map((g: any) => [g.id, g.name])
    );

    // Enrich data with joined names
    const enrichedPockets = (pockets || []).map((p: any) => ({
      ...p,
      account_name: accountMap.get(p.account_id) || '',
    }));

    const enrichedMovements = (movements || []).map((m: any) => ({
      ...m,
      account_name: accountMap.get(m.account_id) || '',
      pocket_name: pocketMap.get(m.pocket_id) || '',
      sub_pocket_name: m.sub_pocket_id ? subPocketMap.get(m.sub_pocket_id) || '' : '',
    }));

    const enrichedSubPockets = (subPockets || []).map((sp: any) => ({
      ...sp,
      group_name: groupMap.get(sp.group_id) || '',
      monthly_contribution: sp.periodicity_months > 0
        ? Math.ceil((sp.value_total - sp.balance) / sp.periodicity_months)
        : 0,
    }));

    // Sort snapshots by date descending for latest net worth
    const sortedSnapshots = [...(snapshots || [])].sort(
      (a: any, b: any) => (b.snapshot_date || '').localeCompare(a.snapshot_date || '')
    );

    // Format all tabs
    const tabData = new Map<string, string[][]>();
    tabData.set('Summary', formatSummary({
      lastSynced: new Date().toISOString(),
      accountCount: (accounts || []).length,
      movementCount: (movements || []).length,
      netWorth: sortedSnapshots[0]?.total_net_worth || 0,
    }));
    tabData.set('Accounts', formatAccounts(accounts || []));
    tabData.set('Pockets', formatPockets(enrichedPockets));
    tabData.set('Fixed Expenses', formatFixedExpenses(enrichedSubPockets));
    const movementsByYear = formatMovements(enrichedMovements);
    for (const [year, rows] of movementsByYear) {
      tabData.set(`Movements ${year}`, rows);
    }
    tabData.set('Net Worth', formatNetWorth(sortedSnapshots));
    tabData.set('Settings', formatSettings(settings || {}));

    // Write to sheet
    await writeAllTabs(sheets, spreadsheetId, tabData);
    // Skip formatting on Vercel (10s timeout) — only apply locally
    if (!process.env.VERCEL) {
      await applyFormatting(sheets, spreadsheetId, tabData);
    }

    return {
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  }
}
