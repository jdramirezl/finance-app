import type { VercelRequest, VercelResponse } from '@vercel/node';
import yahooFinance from 'yahoo-finance2';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbol } = req.query;

  // Validate symbol parameter
  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Symbol parameter is required' });
  }

  try {
    // Fetch stock data from Yahoo Finance
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: ['price']
    });

    // Extract relevant price data
    const priceData = result.price;
    
    if (!priceData || !priceData.regularMarketPrice) {
      return res.status(404).json({ error: 'Stock data not found' });
    }

    // Return formatted response
    return res.status(200).json({
      symbol: priceData.symbol,
      price: priceData.regularMarketPrice,
      currency: priceData.currency,
      marketState: priceData.marketState,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch stock price',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
