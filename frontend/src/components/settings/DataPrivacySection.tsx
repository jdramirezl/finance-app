import { useState } from 'react';
import { Camera, CloudUpload, Download, Sheet } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import DebugExchangeRate from './DebugExchangeRate';
import DebugStockPrice from './DebugStockPrice';
import { apiClient } from '../../services/apiClient';
import { budgetPlanningService } from '../../services/budgetPlanningService';
import { currencyService } from '../../services/currencyService';
import { useToast } from '../../hooks/useToast';
import { useAccountsQuery, useSettingsQuery, usePocketsQuery } from '../../hooks/queries';
import { useLatestSnapshotQuery, useNetWorthSnapshotMutations } from '../../hooks/queries/useNetWorthSnapshotQueries';
import { useInvestmentPrices } from '../../hooks/useInvestmentPrices';
import { useConsolidatedTotal } from '../../hooks/useConsolidatedTotal';
import type { Currency } from '../../types';

export interface DataPrivacySectionProps {
  isExporting: boolean;
  onExport: () => void | Promise<void>;
}

const DataPrivacySection = ({ isExporting, onExport }: DataPrivacySectionProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [syncResult, setSyncResult] = useState<{ spreadsheetUrl: string; syncedAt: string } | null>(null);
  const toast = useToast();

  // Snapshot capture hooks
  const { data: accounts = [] } = useAccountsQuery();
  const { data: settings } = useSettingsQuery();
  const { data: pockets = [] } = usePocketsQuery();
  const primaryCurrency = (settings?.primaryCurrency || 'COP') as Currency;
  const investmentAccounts = accounts.filter(a => a.type === 'investment' && a.stockSymbol);
  const { investmentData } = useInvestmentPrices({ accounts: investmentAccounts, pockets, toast });
  const { consolidatedTotal, totalsByCurrency, isConsolidatedReady } = useConsolidatedTotal({ accounts, primaryCurrency, investmentData });
  const { data: latestSnapshot } = useLatestSnapshotQuery();
  const { createMutation } = useNetWorthSnapshotMutations();

  const today = new Date().toISOString().slice(0, 10);
  const hasTodaySnapshot = latestSnapshot?.snapshotDate === today;

  const handleSaveBudget = async () => {
    setIsSavingBudget(true);
    try {
      const raw = localStorage.getItem('finance_app_budget_planning');
      if (!raw) {
        toast.error('No budget data found in local storage');
        return;
      }
      await budgetPlanningService.save(JSON.parse(raw));
      toast.success('Budget saved to cloud!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save budget');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await apiClient.post<{ spreadsheetUrl: string; syncedAt: string }>('/api/sync');
      setSyncResult(result);
      toast.success('Synced successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold text-gray-100 mb-1">Data &amp; Privacy</h3>
        <p className="text-gray-400 text-sm">
          Export your data or manage your privacy settings.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-100">Export Backup</h4>
            <p className="text-sm text-gray-400">
              Download all your data as JSON
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={onExport}
            loading={isExporting}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-100">Net Worth Snapshot</h4>
            <p className="text-sm text-gray-400">
              Manually capture your current net worth
            </p>
            {isConsolidatedReady && (
              <p className="text-sm text-gray-300 mt-1">
                Current: {currencyService.formatCurrency(consolidatedTotal, primaryCurrency)}
              </p>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={() => createMutation.mutate({ totalNetWorth: consolidatedTotal, baseCurrency: primaryCurrency, breakdown: totalsByCurrency })}
            loading={createMutation.isPending}
            disabled={!isConsolidatedReady || createMutation.isPending}
          >
            <Camera className="w-4 h-4 mr-2" />
            {hasTodaySnapshot ? "Overwrite Today's Snapshot" : 'Capture Snapshot'}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-100">Budget Cloud Sync</h4>
            <p className="text-sm text-gray-400">
              Save your current budget allocations and scenarios to the cloud
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleSaveBudget}
            loading={isSavingBudget}
            disabled={isSavingBudget}
          >
            <CloudUpload className="w-4 h-4 mr-2" />
            Save to Cloud
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-100">Sync to Google Sheets</h4>
            <p className="text-sm text-gray-400">
              Export all your data to a Google Sheet
            </p>
            {syncResult && (
              <div className="mt-2 text-xs text-gray-400">
                <a
                  href={syncResult.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Open Sheet
                </a>
                <span className="ml-2">
                  Last synced: {new Date(syncResult.syncedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={handleSync}
            loading={isSyncing}
            disabled={isSyncing}
          >
            <Sheet className="w-4 h-4 mr-2" />
            Sync Now
          </Button>
        </div>
      </Card>

      <div>
        <h3 className="text-xl font-semibold text-gray-100 mb-4">Force Refresh</h3>
        <div className="space-y-4">
          <DebugExchangeRate />
          <DebugStockPrice />
        </div>
      </div>
    </div>
  );
};

export default DataPrivacySection;
