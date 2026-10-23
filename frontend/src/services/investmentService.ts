import type { Account } from '../types';
import { apiClient } from './apiClient';
import { parseDate } from '../utils/dateUtils';

export interface PriceCache {
    symbol: string;
    price: number;
    timestamp: number; // Unix timestamp in milliseconds
    stale?: boolean;
    staleReason?: string | null;
    provider?: string | null;
    freshUntil?: number | null;
}

export interface BackendStockPriceResponse {
    symbol: string;
    price: number;
    cachedAt: string;
    source?: string;
    /** true when the provider failed and this is the last saved price */
    stale?: boolean;
    staleReason?: string | null;
    freshUntil?: string | null;
    provider?: string | null;
}

/** Normalized price response used by the dashboard and settings. */
export interface PriceDetails {
    symbol: string;
    price: number;
    /** Unix ms when the price was fetched from the market */
    cachedAt: number;
    source?: string;
    stale: boolean;
    staleReason: string | null;
    freshUntil: number | null;
    provider: string | null;
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

    /**
     * Fetch a price with its freshness/provenance. `force` asks the backend
     * to skip its cache and call the market provider now.
     */
    async getPriceDetails(symbol: string, force = false): Promise<PriceDetails> {
        const url = force
            ? `/api/investments/prices/${symbol}?force=true`
            : `/api/investments/prices/${symbol}`;
        const response = await apiClient.get<BackendStockPriceResponse>(url);

        const details: PriceDetails = {
            symbol: response.symbol,
            price: response.price,
            // Backend cachedAt = when the price was actually fetched from the provider
            cachedAt: parseDate(response.cachedAt).getTime(),
            source: response.source,
            stale: response.stale ?? response.source === 'stale',
            staleReason: response.staleReason ?? null,
            freshUntil: response.freshUntil ? parseDate(response.freshUntil).getTime() : null,
            provider: response.provider ?? null,
        };

        this.priceCache.set(symbol, {
            symbol: details.symbol,
            price: details.price,
            timestamp: details.cachedAt,
            stale: details.stale,
            staleReason: details.staleReason,
            provider: details.provider,
            freshUntil: details.freshUntil,
        });
        this.savePriceCache();

        return details;
    }

    // Get current price for a symbol
    async getCurrentPrice(symbol: string, force = false): Promise<number> {
        return (await this.getPriceDetails(symbol, force)).price;
    }

    /** Last known price info for a symbol (from the local cache), or null. */
    getPriceInfo(symbol: string): PriceCache | null {
        this.loadPriceCache();
        return this.priceCache.get(symbol) ?? null;
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

    // Debug: Get full price details with source
    async getDebugPrice(symbol: string): Promise<BackendStockPriceResponse> {
        return await apiClient.get<BackendStockPriceResponse>(`/api/investments/prices/${symbol}`);
    }
}

export const investmentService = new InvestmentService();
