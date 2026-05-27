import { useState } from 'react';
import { currencyService } from '../../services/currencyService';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Select from '../ui/Select';
import { RotateCw, ArrowRight } from 'lucide-react';
import { parseDate } from '../../utils/dateUtils';
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from '../../constants';
import type { Currency } from '../../types';
import { apiClient } from '../../services/apiClient';

const DebugExchangeRate = () => {
    const [from, setFrom] = useState<Currency>(DEFAULT_CURRENCY);
    const [to, setTo] = useState<Currency>('MXN');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{
        rate: number;
        cachedAt: string;
        source?: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleForceRefresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.post<{ rate: number; cachedAt: string; source?: string }>(
                '/api/currency/force-refresh',
                { from, to, amount: 1 }
            );
            setResult(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to refresh rate');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const handleCheck = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await currencyService.getDebugRate(from, to);
            setResult(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to fetch rate');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card padding="md" className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-gray-100">Exchange Rates</h3>
                <p className="text-sm text-gray-400">Check or force-refresh cached rates</p>
            </div>

            <div className="flex gap-2 items-end">
                <Select
                    label="From"
                    value={from}
                    onChange={e => setFrom(e.target.value as Currency)}
                    options={CURRENCY_OPTIONS}
                    className="w-24"
                />
                <div className="pb-3 text-gray-400" aria-hidden="true">
                    <ArrowRight className="w-4 h-4" />
                </div>
                <Select
                    label="To"
                    value={to}
                    onChange={e => setTo(e.target.value as Currency)}
                    options={CURRENCY_OPTIONS}
                    className="w-24"
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
                        <span className="text-gray-400">Rate:</span>
                        <span className="font-mono font-bold text-gray-100">{result.rate.toFixed(4)}</span>
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

export default DebugExchangeRate;
