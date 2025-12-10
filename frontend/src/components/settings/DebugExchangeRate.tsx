import { useState } from 'react';
import { currencyService } from '../../services/currencyService';
import Button from '../Button';
import Card from '../Card';
import Select from '../Select';
import { Search, RotateCw, ArrowRight } from 'lucide-react';
import type { Currency } from '../../types';

const DebugExchangeRate = () => {
    const [from, setFrom] = useState<Currency>('USD');
    const [to, setTo] = useState<Currency>('MXN');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        rate: number;
        cachedAt: string;
        source?: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const currencies: { value: Currency; label: string }[] = [
        { value: 'USD', label: 'USD' },
        { value: 'MXN', label: 'MXN' },
        { value: 'COP', label: 'COP' },
        { value: 'EUR', label: 'EUR' },
        { value: 'GBP', label: 'GBP' },
    ];

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const data = await currencyService.getDebugRate(from, to);
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch rate');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card padding="md" className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Debug Exchange Rate</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Check rate source and freshness</p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2 items-end">
                <Select
                    label="From"
                    value={from}
                    onChange={e => setFrom(e.target.value as Currency)}
                    options={currencies}
                    className="w-24"
                />
                <div className="pb-3 text-gray-400">
                    <ArrowRight className="w-4 h-4" />
                </div>
                <Select
                    label="To"
                    value={to}
                    onChange={e => setTo(e.target.value as Currency)}
                    options={currencies}
                    className="w-24"
                />
                <div className="flex-1"></div>
                <Button type="submit" disabled={loading}>
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
                        <span className="text-gray-500">Rate:</span>
                        <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                            {result.rate.toFixed(4)}
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

export default DebugExchangeRate;
