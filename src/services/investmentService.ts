import type { Account } from '../types';
import { supabase } from '../lib/supabase';

interface PriceCache {
    symbol: string;
    price: number;
    timestamp: number; // Unix timestamp in milliseconds
}

interface YahooFinanceResponse {
    chart: {
        result: Array<{
            meta: {
                symbol: string;
                regularMarketPrice: number;
                chartPreviousClose: number;
            };
        }>;
        error: any;
    };
}

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds (much more frequent!)
// No API key needed for Yahoo Finance!

class InvestmentService {
    private priceCache: Map<string, PriceCache> = new Map();

    // Load price cache from localStorage (cache stays local for performance)
    private loadPriceCache(): void {
        try {
            const cached = localStorage.getItem('investment_price_cache');
            if (cached) {
                const data = JSON.parse(cached);
                this.priceCache = new Map(data);
            }
        } catch (error) {
            console.error('Error loading investment cache:', error);
        }
    }

    // Save price cache to localStorage
    private savePriceCache(): void {
        try {
            const cacheArray = Array.from(this.priceCache.entries());
            localStorage.setItem('investment_price_cache', JSON.stringify(cacheArray));
        } catch (error) {
            console.error('Error saving investment cache:', error);
        }
    }

    // No rate limiting needed for Yahoo Finance - it's free and unlimited!

    // Check if cached price is still valid
    private isCacheValid(symbol: string): boolean {
        const cached = this.priceCache.get(symbol);
        if (!cached) return false;

        const now = Date.now();
        const age = now - cached.timestamp;
        return age < CACHE_DURATION;
    }

    // Get price from cache
    private getCachedPrice(symbol: string): number | null {
        const cached = this.priceCache.get(symbol);
        if (cached && this.isCacheValid(symbol)) {
            return cached.price;
        }
        return null;
    }

    // Fetch price from Yahoo Finance API (free, unlimited!)
    private async fetchPriceFromAPI(symbol: string): Promise<number> {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data: YahooFinanceResponse = await response.json();

            if (data.chart.error) {
                throw new Error(`Yahoo Finance API error: ${data.chart.error.description}`);
            }

            if (!data.chart.result || data.chart.result.length === 0) {
                throw new Error('No data returned from Yahoo Finance');
            }

            const price = data.chart.result[0].meta.regularMarketPrice;
            if (!price || isNaN(price)) {
                throw new Error('Invalid price value from API');
            }

            // Cache the price (local storage for performance)
            this.priceCache.set(symbol, {
                symbol,
                price,
                timestamp: Date.now(),
            });
            this.savePriceCache();

            console.log(`✅ Successfully fetched ${symbol}: $${price} (cached for 15 minutes)`);
            return price;
        } catch (error) {
            console.error('Error fetching stock price from Yahoo Finance:', error);
            throw error;
        }
    }

    // Get current price for a symbol (with caching and rate limiting)
    async getCurrentPrice(symbol: string): Promise<number> {
        this.loadPriceCache();

        // Check cache first
        const cachedPrice = this.getCachedPrice(symbol);
        if (cachedPrice !== null) {
            console.log(`📊 Using cached price for ${symbol}: $${cachedPrice}`);
            return cachedPrice;
        }

        // If cache is invalid or doesn't exist, fetch from API
        console.log(`🌐 Fetching fresh price for ${symbol} from API...`);
        return await this.fetchPriceFromAPI(symbol);
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

    // Debug: Get current status (for testing)
    async getDebugStatus(): Promise<{
        cacheValid: boolean;
        cacheExpiry: Date | null;
        cacheDuration: string;
    }> {
        this.loadPriceCache();
        
        const vooCache = this.priceCache.get('VOO');
        
        return {
            cacheValid: vooCache ? this.isCacheValid('VOO') : false,
            cacheExpiry: vooCache ? new Date(vooCache.timestamp + CACHE_DURATION) : null,
            cacheDuration: '15 minutes (Yahoo Finance - unlimited calls!)',
        };
    }

    // Debug: Force refresh price (ignores cache, respects rate limit)
    async forceRefreshPrice(symbol: string): Promise<number> {
        // Clear cache for this symbol
        this.loadPriceCache();
        this.priceCache.delete(symbol);
        this.savePriceCache();
        
        // Fetch fresh price (will check rate limit)
        return await this.getCurrentPrice(symbol);
    }
}

export const investmentService = new InvestmentService();

// Expose to window for debugging (development only)
if (import.meta.env.DEV) {
    (window as any).investmentService = investmentService;
}

