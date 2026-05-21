import { Download } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

export interface DataPrivacySectionProps {
  isExporting: boolean;
  onExport: () => void | Promise<void>;
}

const DataPrivacySection = ({ isExporting, onExport }: DataPrivacySectionProps) => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold text-on-surface mb-1">Data &amp; Privacy</h3>
        <p className="text-on-surface-variant text-sm">
          Export your data or manage your privacy settings.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-on-surface">Export Backup</h4>
            <p className="text-sm text-on-surface-variant">
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
    </div>
  );
};

export default DataPrivacySection;
