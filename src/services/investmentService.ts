import type { Account } from '../types';
// import { StorageService } from './storageService';

interface PriceCache {
    symbol: string;
    price: number;
    timestamp: number; // Unix timestamp in milliseconds
}

interface AlphaVantageResponse {
    'Global Quote': {
        '01. symbol': string;
        '05. price': string;
        '09. change': string;
        '10. change percent': string;
    };
}

const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const MAX_CALLS_PER_DAY = 10; // Actually 25, but we're limiting it to 10 to avoid abuse
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;

class InvestmentService {
    private priceCache: Map<string, PriceCache> = new Map();
    private dailyCallCount: { date: string; count: number } = { date: '', count: 0 };

    // Load cache and call count from storage
    private loadCache(): void {
        try {
            const cached = localStorage.getItem('investment_price_cache');
            if (cached) {
                const data = JSON.parse(cached);
                this.priceCache = new Map(data);
            }

            const callCount = localStorage.getItem('investment_daily_calls');
            if (callCount) {
                this.dailyCallCount = JSON.parse(callCount);
            }
        } catch (error) {
            console.error('Error loading investment cache:', error);
        }
    }

    // Save cache to storage
    private saveCache(): void {
        try {
            const cacheArray = Array.from(this.priceCache.entries());
            localStorage.setItem('investment_price_cache', JSON.stringify(cacheArray));
            localStorage.setItem('investment_daily_calls', JSON.stringify(this.dailyCallCount));
        } catch (error) {
            console.error('Error saving investment cache:', error);
        }
    }

    // Check if we can make an API call today
    private canMakeApiCall(): boolean {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Reset count if it's a new day
        if (this.dailyCallCount.date !== today) {
            this.dailyCallCount = { date: today, count: 0 };
            this.saveCache();
        }

        return this.dailyCallCount.count < MAX_CALLS_PER_DAY;
    }

    // Increment daily call count
    private incrementCallCount(): void {
        const today = new Date().toISOString().split('T')[0];
        if (this.dailyCallCount.date !== today) {
            this.dailyCallCount = { date: today, count: 0 };
        }
        this.dailyCallCount.count++;
        this.saveCache();
    }

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

    // Fetch price from Alpha Vantage API
    private async fetchPriceFromAPI(symbol: string): Promise<number> {
        if (!this.canMakeApiCall()) {
            throw new Error(
                `Daily API call limit reached (${MAX_CALLS_PER_DAY} calls/day). Please try again tomorrow.`
            );
        }

        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const data: AlphaVantageResponse = await response.json();

            if (!data['Global Quote'] || !data['Global Quote']['05. price']) {
                throw new Error('Invalid API response format');
            }

            const price = parseFloat(data['Global Quote']['05. price']);
            if (isNaN(price)) {
                throw new Error('Invalid price value from API');
            }

            // Cache the price
            this.priceCache.set(symbol, {
                symbol,
                price,
                timestamp: Date.now(),
            });
            this.saveCache();

            // Increment call count
            this.incrementCallCount();

            return price;
        } catch (error) {
            console.error('Error fetching stock price:', error);
            throw error;
        }
    }

    // Get current price for a symbol (with caching and rate limiting)
    async getCurrentPrice(symbol: string): Promise<number> {
        this.loadCache();

        // Check cache first
        const cachedPrice = this.getCachedPrice(symbol);
        if (cachedPrice !== null) {
            return cachedPrice;
        }

        // If cache is invalid or doesn't exist, fetch from API
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

    // Update investment account with current price
    async updateInvestmentAccount(account: Account): Promise<{
        precioActual: number;
        totalValue: number;
        gainsUSD: number;
        gainsPct: number;
    }> {
        if (!account.stockSymbol) {
            throw new Error('Investment account must have a stock symbol');
        }

        const precioActual = await this.getCurrentPrice(account.stockSymbol);
        const values = this.calculateInvestmentValues(account, precioActual);

        return {
            precioActual,
            ...values,
        };
    }

    // Get remaining API calls for today
    getRemainingCalls(): number {
        this.loadCache();
        const today = new Date().toISOString().split('T')[0];
        if (this.dailyCallCount.date !== today) {
            return MAX_CALLS_PER_DAY;
        }
        return Math.max(0, MAX_CALLS_PER_DAY - this.dailyCallCount.count);
    }
}

export const investmentService = new InvestmentService();

