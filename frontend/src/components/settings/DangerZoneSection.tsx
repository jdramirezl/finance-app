import { RefreshCw } from 'lucide-react';
import Card from '../ui/Card';
import DebugStockPrice from './DebugStockPrice';
import DebugExchangeRate from './DebugExchangeRate';

/**
 * Houses operational/debug tools. The app has no true destructive operations
 * exposed in the UI yet (account close / clear data are not implemented), so
 * this section currently surfaces the stock price and exchange rate debug
 * helpers used to diagnose pricing issues.
 */
const DangerZoneSection = () => {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <span className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-400">
          <RefreshCw className="w-5 h-5" />
        </span>
        Debug Tools
      </h2>
      <Card>
        <div className="grid grid-cols-1 gap-4">
          <DebugStockPrice />
          <DebugExchangeRate />
        </div>
      </Card>
    </section>
  );
};

export default DangerZoneSection;
