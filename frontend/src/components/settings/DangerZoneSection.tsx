import { RefreshCw } from 'lucide-react';
import Card from '../ui/Card';
import DebugStockPrice from './DebugStockPrice';
import DebugExchangeRate from './DebugExchangeRate';

const DangerZoneSection = () => {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 text-on-surface flex items-center gap-2">
        <span className="p-2 bg-[#ffb873]/10 rounded-lg text-[#ffb873]">
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
