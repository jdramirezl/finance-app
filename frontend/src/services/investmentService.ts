import type { Account } from '../types';
import { supabase } from '../lib/supabase';
import { apiClient } from './apiClient';

interface PriceCache {
    symbol: string;
    price: number;
    timestamp: number; // Unix timestamp in milliseconds
}

interface StockPriceAPIResponse {
    symbol: string;
    price: number;
    currency: string;
    marketState: string;
    lastUpdated: string;
}

interface BackendStockPriceResponse {
    symbol: string;
    price: number;
    cachedAt: string;
}

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const API_RATE_LIMIT_MINUTES = 15; // Global rate limit across all devices

class InvestmentService {
    // Feature flag to control backend usage
    private useBackend = import.meta.env.VITE_USE_BACKEND_INVESTMENTS === 'true';
    
    private priceCache: Map<string, PriceCache> = new Map();

    constructor() {
        // Log which mode we're in
        if (this.useBackend) {
            console.log('🚀 InvestmentService: Using BACKEND API at', import.meta.env.VITE_API_URL);
        } else {
            console.log('📦 InvestmentService: Using DIRECT Supabase calls');
        }
    }

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

    // Check global rate limit via Supabase (prevents hitting API too frequently across devices)
    private async checkGlobalRateLimit(symbol: string): Promise<boolean> {
        try {
            const cutoffTime = new Date(Date.now() - API_RATE_LIMIT_MINUTES * 60 * 1000).toISOString();

            const { data, error } = await supabase
                .from('investment_api_calls')
                .select('called_at')
                .eq('symbol', symbol)
                .gte('called_at', cutoffTime)
                .order('called_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error checking rate limit:', error);
                return false; // Allow call if we can't check (fail open)
            }

            return data && data.length > 0; // true = rate limited, false = can call
        } catch (error) {
            console.error('Error checking rate limit:', error);
            return false; // Allow call if error (fail open)
        }
    }

    // Record API call in Supabase for global rate limiting
    private async recordAPICall(symbol: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('investment_api_calls')
                .insert({
                    symbol,
                    called_at: new Date().toISOString(),
                });

            if (error) {
                console.error('Error recording API call:', error);
            }
        } catch (error) {
            console.error('Error recording API call:', error);
        }
    }

    // Check if cached price is still valid (local cache)
    private isCacheValid(symbol: string): boolean {
        const cached = this.priceCache.get(symbol);
        if (!cached) return false;

        const now = Date.now();
        const age = now - cached.timestamp;
        return age < CACHE_DURATION;
    }

    // Get price from local cache
    private getCachedPrice(symbol: string): number | null {
        const cached = this.priceCache.get(symbol);
        if (cached && this.isCacheValid(symbol)) {
            return cached.price;
        }
        return null;
    }

    // Get price from database (shared cache across devices)
    private async getPriceFromDatabase(symbol: string): Promise<number | null> {
        try {
            const { data, error } = await supabase
                .from('stock_prices')
                .select('*')
                .eq('symbol', symbol)
                .single();

            if (error) throw error;
            if (!data) return null;

            // Check if price is stale (> 15 minutes old)
            const lastUpdated = new Date(data.last_updated).getTime();
            const now = Date.now();
            if (now - lastUpdated > CACHE_DURATION) {
                return null;
            }

            // Cache locally for performance
            this.priceCache.set(symbol, {
                symbol,
                price: parseFloat(data.price),
                timestamp: lastUpdated,
            });
            this.savePriceCache();

            return parseFloat(data.price);
        } catch (err) {
            console.error('[Investment] Database error:', err);
            return null;
        }
    }

    // Save price to database (shared cache)
    private async savePriceToDatabase(symbol: string, price: number, marketState?: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('stock_prices')
                .upsert({
                    id: symbol,
                    symbol,
                    price: price.toString(),
                    currency: 'USD',
                    market_state: marketState || 'REGULAR',
                    last_updated: new Date().toISOString(),
                }, {
                    onConflict: 'id',
                });

            if (error) throw error;
        } catch (err) {
            console.error('[Investment] Failed to save to database:', err);
        }
    }

    // Fetch price from our Vercel serverless API (uses yahoo-finance2, no CORS issues!)
    private async fetchPriceFromAPI(symbol: string): Promise<number> {
        // Use relative URL - works in both dev and production
        const url = `/api/stock-price?symbol=${encodeURIComponent(symbol)}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API request failed: ${response.statusText}`);
            }

            const data: StockPriceAPIResponse = await response.json();

            if (!data.price || isNaN(data.price)) {
                throw new Error('Invalid price value from API');
            }

            const now = Date.now();

            // Cache the price locally for performance
            this.priceCache.set(symbol, {
                symbol,
                price: data.price,
                timestamp: now,
            });
            this.savePriceCache();

            // Save to database for shared cache across devices
            await this.savePriceToDatabase(symbol, data.price, data.marketState);

            // Record API call in Supabase for global rate limiting
            await this.recordAPICall(symbol);

            return data.price;
        } catch (error) {
            console.error('Error fetching stock price from API:', error);
            throw error;
        }
    }

    // Get current price for a symbol (with 3-tier caching and rate limiting)
    async getCurrentPrice(symbol: string): Promise<number> {
        if (this.useBackend) {
            try {
                const response = await apiClient.get<BackendStockPriceResponse>(`/api/investments/prices/${symbol}`);
                
                // Cache the price locally for performance
                const cachedAt = new Date(response.cachedAt).getTime();
                this.priceCache.set(symbol, {
                    symbol: response.symbol,
                    price: response.price,
                    timestamp: cachedAt,
                });
                this.savePriceCache();
                
                return response.price;
            } catch (error) {
                console.error('❌ Backend API failed, falling back to direct implementation:', error);
                return await this.getCurrentPriceDirect(symbol);
            }
        }
        return await this.getCurrentPriceDirect(symbol);
    }

    // Direct implementation (fallback)
    private async getCurrentPriceDirect(symbol: string): Promise<number> {
        this.loadPriceCache();

        // 1. Check local cache first (fastest)
        const cachedPrice = this.getCachedPrice(symbol);
        if (cachedPrice !== null) {
            return cachedPrice;
        }

        // 2. Check database cache (fast, shared across devices)
        try {
            const dbPrice = await this.getPriceFromDatabase(symbol);
            if (dbPrice !== null) {
                return dbPrice;
            }
        } catch (err) {
            console.warn('[Investment] DB lookup failed:', err);
        }

        // 3. Check global rate limit before making API call
        const isRateLimited = await this.checkGlobalRateLimit(symbol);
        if (isRateLimited) {
            console.warn(`⏱️ Rate limited for ${symbol}. Please wait ${API_RATE_LIMIT_MINUTES} minutes between price updates`);
            // Try to use stale cache as fallback
            const staleCache = this.priceCache.get(symbol);
            if (staleCache) {
                console.log(`📊 Using stale cached price for ${symbol}: $${staleCache.price} (${Math.round((Date.now() - staleCache.timestamp) / 1000 / 60)} minutes old)`);
                return staleCache.price;
            }
            throw new Error(`Rate limited: Please wait ${API_RATE_LIMIT_MINUTES} minutes between price updates`);
        }

        // 4. Fetch from API (slowest, updates DB)
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
            cacheDuration: '15 minutes (via Vercel serverless + yahoo-finance2)',
        };
    }

    // Debug: Force refresh price (ignores cache, respects rate limit)
    async forceRefreshPrice(symbol: string): Promise<number> {
        // Clear cache for this symbol
        this.loadPriceCache();
        this.priceCache.delete(symbol);
        this.savePriceCache();
        
        // Fetch fresh price (will check rate limit)
        // Note: Backend doesn't have a force refresh endpoint, so we just call getCurrentPrice
        // which will use cached data if available
        return await this.getCurrentPrice(symbol);
    }
}

export const investmentService = new InvestmentService();

// Expose to window for debugging (development only)
if (import.meta.env.DEV) {
    (window as any).investmentService = investmentService;
}
