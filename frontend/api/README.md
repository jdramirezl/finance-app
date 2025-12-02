# Vercel Serverless Functions

This directory contains serverless functions that run on Vercel's edge network.

## `/api/stock-price`

Fetches real-time stock prices from Yahoo Finance using the `yahoo-finance2` library.

### Endpoint
```
GET /api/stock-price?symbol=VOO
```

### Parameters
- `symbol` (required): Stock ticker symbol (e.g., VOO, AAPL, TSLA)

### Response
```json
{
  "symbol": "VOO",
  "price": 450.23,
  "currency": "USD",
  "marketState": "REGULAR",
  "lastUpdated": "2025-11-25T10:30:00.000Z"
}
```

### Error Responses
- `400`: Missing or invalid symbol parameter
- `404`: Stock data not found
- `405`: Method not allowed (only GET supported)
- `500`: Server error fetching stock price

### Why Serverless?
- **No CORS issues**: Server-side API calls bypass browser CORS restrictions
- **Free tier friendly**: Vercel provides 100GB bandwidth and 100 hours execution/month
- **Better than Alpha Vantage**: No strict rate limits (25 calls/day)
- **Reliable**: Yahoo Finance is more stable and widely used

### Local Development
The function works in local dev mode via Vite's proxy or by running `vercel dev`.

### Deployment
Automatically deployed when pushing to Vercel. No additional configuration needed.
