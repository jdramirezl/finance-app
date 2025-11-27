import type { VercelRequest, VercelResponse } from '@vercel/node';

// FreeCurrencyAPI configuration
const API_KEY = process.env.FREECURRENCY_API_KEY || "";
const API_URL = 'https://api.freecurrencyapi.com/v1/latest';

// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

interface ExchangeRatesResponse {
  data: {
    [key: string]: number;
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base = 'USD', currencies } = req.query;
    
    // Validate base currency
    if (typeof base !== 'string' || !SUPPORTED_CURRENCIES.includes(base)) {
      return res.status(400).json({ 
        error: 'Invalid base currency',
        supported: SUPPORTED_CURRENCIES 
      });
    }

    // Parse target currencies
    const targetCurrencies = currencies 
      ? (typeof currencies === 'string' ? currencies.split(',') : currencies)
      : SUPPORTED_CURRENCIES.filter(c => c !== base);

    // Validate target currencies
    const invalidCurrencies = targetCurrencies.filter(c => !SUPPORTED_CURRENCIES.includes(c));
    if (invalidCurrencies.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid target currencies',
        invalid: invalidCurrencies,
        supported: SUPPORTED_CURRENCIES 
      });
    }

    // Build API URL
    const url = new URL(API_URL);
    url.searchParams.set('apikey', API_KEY);
    url.searchParams.set('base_currency', base);
    url.searchParams.set('currencies', targetCurrencies.join(','));

    console.log(`[Exchange Rates] Fetching rates: ${base} -> ${targetCurrencies.join(', ')}`);

    // Fetch from FreeCurrencyAPI
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`FreeCurrencyAPI error: ${response.status} ${response.statusText}`);
    }

    const data: ExchangeRatesResponse = await response.json();

    // Format response
    const rates = {
      base,
      rates: data.data,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Exchange Rates] Success: ${Object.keys(data.data).length} rates fetched`);

    // Cache for 24 hours
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    
    return res.status(200).json(rates);

  } catch (error) {
    console.error('[Exchange Rates] Error:', error);
    
    return res.status(500).json({ 
      error: 'Failed to fetch exchange rates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
