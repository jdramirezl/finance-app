import type { Account } from '../types';
import { supabase } from '../lib/supabase';

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
    private apiKeyHash: string = '';

    // Initialize API key hash (simple hash for identification)
    private async initApiKeyHash(): Promise<void> {
        if (this.apiKeyHash) {
            return; // Already initialized
        }
        
        if (!API_KEY) {
            console.error('VITE_ALPHA_VANTAGE_API_KEY not found in environment variables');
            return;
        }
        
        try {
            // Simple hash using Web Crypto API
            const encoder = new TextEncoder();
            const data = encoder.encode(API_KEY);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            this.apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            console.log('API key hash initialized:', this.apiKeyHash.substring(0, 8) + '...');
        } catch (error) {
            console.error('Error initializing API key hash:', error);
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

    // Get current call count from Supabase (global tracking)
    private async getCurrentCallCount(): Promise<number> {
        await this.initApiKeyHash();
        
        // Ensure hash is initialized
        if (!this.apiKeyHash) {
            console.error('API key hash not initialized');
            return 0;
        }
        
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        try {
            const { data, error } = await supabase
                .from('investment_api_calls')
                .select('call_count')
                .eq('api_key_hash', this.apiKeyHash)
                .eq('call_date', today)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('Error fetching call count:', error);
                return 0;
            }

            return data?.call_count || 0;
        } catch (error) {
            console.error('Error getting call count:', error);
            return 0;
        }
    }

    // Check if we can make an API call today (global check)
    private async canMakeApiCall(): Promise<boolean> {
        const currentCount = await this.getCurrentCallCount();
        return currentCount < MAX_CALLS_PER_DAY;
    }

    // Increment daily call count in Supabase (global tracking)
    private async incrementCallCount(): Promise<void> {
        await this.initApiKeyHash();
        
        // Ensure hash is initialized
        if (!this.apiKeyHash) {
            console.error('API key hash not initialized, cannot track call');
            return;
        }
        
        const today = new Date().toISOString().split('T')[0];

        try {
            // Get current count first
            const currentCount = await this.getCurrentCallCount();
            
            // Use upsert to insert or update
            const { error } = await supabase
                .from('investment_api_calls')
                .upsert({
                    api_key_hash: this.apiKeyHash,
                    call_date: today,
                    call_count: currentCount + 1,
                }, {
                    onConflict: 'api_key_hash,call_date'
                });

            if (error) {
                console.error('Error incrementing call count:', error);
            }
        } catch (error) {
            console.error('Error updating call count:', error);
        }
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

            // Cache the price (local storage for performance)
            this.priceCache.set(symbol, {
                symbol,
                price,
                timestamp: Date.now(),
            });
            this.savePriceCache();

            // Increment call count (global tracking in Supabase)
            await this.incrementCallCount();

            return price;
        } catch (error) {
            console.error('Error fetching stock price:', error);
            throw error;
        }
    }

    // Get current price for a symbol (with caching and rate limiting)
    async getCurrentPrice(symbol: string): Promise<number> {
        this.loadPriceCache();

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

    // Get remaining API calls for today (global tracking)
    async getRemainingCalls(): Promise<number> {
        const currentCount = await this.getCurrentCallCount();
        return Math.max(0, MAX_CALLS_PER_DAY - currentCount);
    }

    // Debug: Get current status (for testing)
    async getDebugStatus(): Promise<{
        cacheValid: boolean;
        cacheExpiry: Date | null;
        callsToday: number;
        callsRemaining: number;
        apiKeyHash: string;
    }> {
        await this.initApiKeyHash();
        this.loadPriceCache();
        
        const vooCache = this.priceCache.get('VOO');
        const callsToday = await this.getCurrentCallCount();
        
        return {
            cacheValid: vooCache ? this.isCacheValid('VOO') : false,
            cacheExpiry: vooCache ? new Date(vooCache.timestamp + CACHE_DURATION) : null,
            callsToday,
            callsRemaining: MAX_CALLS_PER_DAY - callsToday,
            apiKeyHash: this.apiKeyHash,
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

