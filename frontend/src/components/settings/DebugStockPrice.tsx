import { useState } from 'react';
import { investmentService } from '../../services/investmentService';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Select from '../ui/Select';
import { RotateCw } from 'lucide-react';
import { currencyService } from '../../services/currencyService';
import { parseDate } from '../../utils/dateUtils';
import { useAccountsQuery } from '../../hooks/queries';

const DebugStockPrice = () => {
    const { data: accounts } = useAccountsQuery();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        symbol: string;
        price: number;
        cachedAt: string;
        source?: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Get unique symbols from investment accounts
    const symbols = [...new Set(
        (accounts ?? [])
            .filter(a => a.stockSymbol)
            .map(a => a.stockSymbol!)
    )];

    const [symbol, setSymbol] = useState(symbols[0] || 'VOO');

    const handleForceRefresh = async () => {
        if (!symbol) return;
        setLoading(true);
        setError(null);
        try {
            await investmentService.getCurrentPrice(symbol, true);
            const data = await investmentService.getDebugPrice(symbol);
            setResult(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to refresh price');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const handleCheck = async () => {
        if (!symbol) return;
        setLoading(true);
        setError(null);
        try {
            const data = await investmentService.getDebugPrice(symbol);
            setResult(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to fetch price');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const symbolOptions = symbols.map(s => ({ value: s, label: s }));
    if (symbolOptions.length === 0) symbolOptions.push({ value: 'VOO', label: 'VOO' });

    return (
        <Card padding="md" className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-100">Stock Prices</h3>
                <p className="text-sm text-gray-400">Check or force-refresh cached prices (uses API token)</p>
            </div>

            <div className="flex gap-2 items-end">
                <Select
                    label="Symbol"
                    value={symbol}
                    onChange={e => setSymbol(e.target.value)}
                    options={symbolOptions}
                    className="w-32"
                />
                <div className="flex-1" />
                <Button variant="secondary" onClick={handleCheck} disabled={loading}>
                    Check
                </Button>
                <Button onClick={handleForceRefresh} disabled={loading}>
                    {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                    <span className="ml-1">Force Refresh</span>
                </Button>
            </div>

            {error && <div className="text-sm text-red-400 bg-red-900/10 p-2 rounded">{error}</div>}

            {result && (
                <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm border border-gray-700">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Price:</span>
                        <span className="font-mono font-bold text-gray-100">
                            {currencyService.formatCurrency(result.price, 'USD')}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Source:</span>
                        <span className={`font-mono px-1.5 py-0.5 rounded text-xs ${
                            result.source === 'api' ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'
                        }`}>{result.source || 'unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Cached:</span>
                        <span className="font-mono text-gray-300">{parseDate(result.cachedAt).toLocaleString()}</span>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default DebugStockPrice;
