import type { Account } from '../types';
import { apiClient } from './apiClient';
import { parseDate } from '../utils/dateUtils';

interface PriceCache {
    symbol: string;
    price: number;
    timestamp: number; // Unix timestamp in milliseconds
}

interface BackendStockPriceResponse {
    symbol: string;
    price: number;
    cachedAt: string;
    source?: string;
}

export interface StockPriceHistoryEntry {
    date: string;
    price: number;
}

export interface StockPriceHistoryResponse {
    data: StockPriceHistoryEntry[];
}

class InvestmentService {
    // Local cache used to surface a "last updated" timestamp to the UI without
    // re-hitting the backend on every render.
    private priceCache: Map<string, PriceCache> = new Map();

    // Load price cache from localStorage
    private loadPriceCache(): void {
        try {
            const cached = localStorage.getItem('investment_price_cache');
            if (cached) {
                const data = JSON.parse(cached);
                this.priceCache = new Map(data);
            }
        } catch {
            // localStorage unavailable or cache corrupt — start fresh.
        }
    }

    // Save price cache to localStorage
    private savePriceCache(): void {
        try {
            const cacheArray = Array.from(this.priceCache.entries());
            localStorage.setItem('investment_price_cache', JSON.stringify(cacheArray));
        } catch {
            // localStorage may be unavailable or full; cache write is best-effort.
        }
    }

    // Get current price for a symbol
    async getCurrentPrice(symbol: string, force = false): Promise<number> {
        const url = force
            ? `/api/investments/prices/${symbol}?force=true`
            : `/api/investments/prices/${symbol}`;
        const response = await apiClient.get<BackendStockPriceResponse>(url);

        // Always use backend's cachedAt — it reflects when the price was actually fetched from the API
        const cachedAt = parseDate(response.cachedAt).getTime();
        this.priceCache.set(symbol, {
            symbol: response.symbol,
            price: response.price,
            timestamp: cachedAt,
        });
        this.savePriceCache();

        return response.price;
    }

    // Calculate investment account values
    calculateInvestmentValues(
        account: Account,
        currentPrice: number
    ): {
        totalValue: number;
        gainsUSD: number;
        gainsPct: number;
    } {
        const montoInvertido = account.montoInvertido || 0;
        const shares = account.shares || 0;
        const totalValue = shares * currentPrice;
        const gainsUSD = totalValue - montoInvertido;
        const gainsPct = montoInvertido > 0 ? (gainsUSD / montoInvertido) * 100 : 0;

        return {
            totalValue,
            gainsUSD,
            gainsPct,
        };
    }

    // Get the timestamp of the cached price for a symbol
    getPriceTimestamp(symbol: string): number | null {
        this.loadPriceCache();
        const cached = this.priceCache.get(symbol);
        return cached ? cached.timestamp : null;
    }

    // Update investment account with current price
    async updateInvestmentAccount(account: Account): Promise<{
        precioActual: number;
        totalValue: number;
        gainsUSD: number;
        gainsPct: number;
        lastUpdated: number | null;
    }> {
        if (!account.stockSymbol) {
            throw new Error('Investment account must have a stock symbol');
        }

        const precioActual = await this.getCurrentPrice(account.stockSymbol);
        const values = this.calculateInvestmentValues(account, precioActual);
        const lastUpdated = this.getPriceTimestamp(account.stockSymbol);

        return {
            precioActual,
            ...values,
            lastUpdated,
        };
    }

    // Force refresh price (clears local cache so the next call reflects the freshly-fetched value)
    async forceRefreshPrice(symbol: string): Promise<number> {
        this.loadPriceCache();
        this.priceCache.delete(symbol);
        this.savePriceCache();
        return await this.getCurrentPrice(symbol);
    }

    // Get historical stock price data for charting / overlay rendering.
    async getStockPriceHistory(symbol: string, days: number = 365): Promise<StockPriceHistoryResponse> {
        return apiClient.get<StockPriceHistoryResponse>(
            `/api/investments/prices/${symbol}/history?days=${days}`
        );
    }

    // Debug: Get full price details with source
    async getDebugPrice(symbol: string): Promise<BackendStockPriceResponse> {
        return await apiClient.get<BackendStockPriceResponse>(`/api/investments/prices/${symbol}`);
    }

    // Get historical stock prices for a symbol over the last `days` days.
    // Used by chart overlays to plot the price series alongside net worth.
    // Returns an empty array if no history is available rather than throwing,
    // so a missing series renders an empty overlay instead of breaking the
    // whole chart.
    async getStockPriceHistory(symbol: string, days = 365): Promise<{ date: string; price: number }[]> {
        const response = await apiClient.get<{ data: { date: string; price: number }[] }>(
            `/api/investments/prices/${symbol}/history?days=${days}`
        );
        return response.data;
    }
}

export const investmentService = new InvestmentService();
