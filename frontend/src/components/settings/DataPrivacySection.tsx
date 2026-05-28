import { useState } from 'react';
import { Download, Sheet } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import DebugExchangeRate from './DebugExchangeRate';
import DebugStockPrice from './DebugStockPrice';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../../hooks/useToast';

export interface DataPrivacySectionProps {
  isExporting: boolean;
  onExport: () => void | Promise<void>;
}

const DataPrivacySection = ({ isExporting, onExport }: DataPrivacySectionProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ spreadsheetUrl: string; syncedAt: string } | null>(null);
  const toast = useToast();

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
