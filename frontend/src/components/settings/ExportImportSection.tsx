import { Download } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

export interface ExportImportSectionProps {
  isExporting: boolean;
  onExport: () => void | Promise<void>;
}

const ExportImportSection = ({ isExporting, onExport }: ExportImportSectionProps) => {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-6 text-on-surface flex items-center gap-3">
        <span className="p-2 bg-[#adc6ff]/10 rounded-lg text-[#adc6ff]">
          <Download className="w-5 h-5" />
        </span>
        Data Management
      </h2>
      <Card>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-surface-container-high/50 rounded-xl">
            <div>
              <h3 className="font-semibold text-on-surface">
                Export Backup
              </h3>
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
        </div>
      </Card>
    </section>
  );
};

export default ExportImportSection;
