import { useState } from 'react';
import { investmentService } from '../../services/investmentService';
import Button from '../Button';
import Input from '../Input';
import Card from '../Card';
import { Search, RotateCw } from 'lucide-react';
import { currencyService } from '../../services/currencyService';

const DebugStockPrice = () => {
    const [symbol, setSymbol] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        symbol: string;
        price: number;
        cachedAt: string;
        source?: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!symbol) return;

        setLoading(true);
        setError(null);
        try {
            const data = await investmentService.getDebugPrice(symbol);
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch price');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card padding="md" className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Debug Stock Price</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Check price source and freshness</p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                    placeholder="Symbol (e.g. VOO)"
                    value={symbol}
                    onChange={e => setSymbol(e.target.value.toUpperCase())}
                    className="flex-1"
                />
                <Button type="submit" disabled={!symbol || loading}>
                    {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
            </form>

            {error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded">
                    {error}
                </div>
            )}

            {result && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm border dark:border-gray-700">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Price:</span>
                        <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                            {currencyService.formatCurrency(result.price, 'USD')}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Source:</span>
                        <span className={`font-mono px-1.5 py-0.5 rounded text-xs ${result.source === 'api'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : result.source === 'db'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                            {result.source || 'unknown'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Cached:</span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                            {new Date(result.cachedAt).toLocaleString()}
                        </span>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default DebugStockPrice;
