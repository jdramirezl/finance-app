import { Download } from 'lucide-react';
import Button from '../Button';
import Card from '../Card';

export interface ExportImportSectionProps {
  isExporting: boolean;
  onExport: () => void | Promise<void>;
}

/**
 * Data management card. Currently only exposes JSON backup export — import is
 * not implemented in the backend yet but the section is named to leave room
 * for it.
 */
const ExportImportSection = ({ isExporting, onExport }: ExportImportSectionProps) => {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100 flex items-center gap-3">
        <span className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
          <Download className="w-5 h-5" />
        </span>
        Data Management
      </h2>
      <Card>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Export Backup
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
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
