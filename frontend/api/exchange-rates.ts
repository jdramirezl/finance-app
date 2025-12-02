import type { VercelRequest, VercelResponse } from '@vercel/node';

// Exchange API configuration (https://github.com/fawazahmed0/exchange-api)
const API_BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1';

// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'MXN', 'COP', 'EUR', 'GBP'];

// Currency code mapping (API uses lowercase)
const toCurrencyCode = (currency: string) => currency.toLowerCase();

interface ExchangeRatesResponse {
  date: string;
  [key: string]: string | number | { [key: string]: number };
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

    // Build API URL - format: /currencies/{base_currency}.json
    const baseCode = toCurrencyCode(base);
    const url = `${API_BASE_URL}/currencies/${baseCode}.json`;

    console.log(`[Exchange Rates] Fetching rates: ${base} -> ${targetCurrencies.join(', ')}`);

    // Fetch from Exchange API
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Exchange API error: ${response.status} ${response.statusText}`);
    }

    const data: ExchangeRatesResponse = await response.json();

    // Extract rates for requested currencies
    const ratesData = data[baseCode] as { [key: string]: number };
    const filteredRates: { [key: string]: number } = {};
    
    targetCurrencies.forEach(currency => {
      const currencyCode = toCurrencyCode(currency);
      if (ratesData[currencyCode] !== undefined) {
        filteredRates[currency] = ratesData[currencyCode];
      }
    });

    // Format response
    const rates = {
      base,
      rates: filteredRates,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Exchange Rates] Success: ${Object.keys(filteredRates).length} rates fetched`);

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
