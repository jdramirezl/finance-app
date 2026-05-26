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
    async getCurrentPrice(symbol: string): Promise<number> {
        const response = await apiClient.get<BackendStockPriceResponse>(`/api/investments/prices/${symbol}`);

        // Update local cache — but preserve a newer local timestamp (from markRefreshed)
        const cachedAt = parseDate(response.cachedAt).getTime();
        this.loadPriceCache();
        const existing = this.priceCache.get(symbol);
        const bestTimestamp = existing && existing.timestamp > cachedAt ? existing.timestamp : cachedAt;
        this.priceCache.set(symbol, {
            symbol: response.symbol,
            price: response.price,
            timestamp: bestTimestamp,
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

    // Mark a symbol as just refreshed (updates local timestamp to now)
    markRefreshed(symbol: string): void {
        this.loadPriceCache();
        const cached = this.priceCache.get(symbol);
        if (cached) {
            cached.timestamp = Date.now();
            this.savePriceCache();
        }
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

    // Debug: Get full price details with source
    async getDebugPrice(symbol: string): Promise<BackendStockPriceResponse> {
        return await apiClient.get<BackendStockPriceResponse>(`/api/investments/prices/${symbol}`);
    }
}

export const investmentService = new InvestmentService();
