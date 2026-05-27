/**
 * Investment Controller
 * 
 * Handles HTTP requests for investment account operations.
 * Delegates business logic to use cases.
 * 
 * Requirements: 13.1-13.6
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { SupabaseClient } from '@supabase/supabase-js';
import { GetCurrentStockPriceUseCase } from '../application/useCases/GetCurrentStockPriceUseCase';
import { UpdateInvestmentAccountUseCase } from '../application/useCases/UpdateInvestmentAccountUseCase';
import type { UpdateInvestmentAccountDTO } from '../application/useCases/UpdateInvestmentAccountUseCase';

/**
 * Default lookback window for stock price history queries. Caller can
 * override via the `?days=N` query string. We cap defensively to keep
 * a malformed/huge value from triggering a wide table scan.
 */
const DEFAULT_HISTORY_DAYS = 365;
const MAX_HISTORY_DAYS = 365 * 5; // 5 years

@injectable()
export class InvestmentController {
  constructor(
    @inject(GetCurrentStockPriceUseCase) private getCurrentStockPriceUseCase: GetCurrentStockPriceUseCase,
    @inject(UpdateInvestmentAccountUseCase) private updateInvestmentAccountUseCase: UpdateInvestmentAccountUseCase,
    @inject('SupabaseClient') private supabase: SupabaseClient
  ) { }

  /**
   * Get current stock price for an investment account
   * GET /api/investments/:accountId/price
   * 
   * Requirements: 13.1, 13.2, 13.3, 13.4
   */
  async getPrice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { accountId } = req.params;

      // Note: In a full implementation, we would fetch the account first to get the stock symbol
      // For now, we'll accept the symbol as a query parameter
      const symbol = req.query.symbol as string;

      if (!symbol) {
        res.status(400).json({ error: 'Stock symbol is required' });
        return;
      }

      const stockPrice = await this.getCurrentStockPriceUseCase.execute(symbol);

      res.status(200).json({
        symbol: stockPrice.symbol,
        price: stockPrice.price,
        cachedAt: stockPrice.cachedAt.toISOString(),
        source: stockPrice.source,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stock price by symbol (without account context)
   * GET /api/investments/prices/:symbol
   * 
   * Requirements: 13.1, 13.2, 13.3, 13.4
   */
  async getPriceBySymbol(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { symbol } = req.params;
      const force = req.query.force === 'true';

      const stockPrice = await this.getCurrentStockPriceUseCase.execute(symbol, force);

      res.status(200).json({
        symbol: stockPrice.symbol,
        price: stockPrice.price,
        cachedAt: stockPrice.cachedAt.toISOString(),
        source: stockPrice.source,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get historical stock prices for a symbol over the last N days.
   * GET /api/investments/prices/:symbol/history?days=365
   *
   * Reads from the `stock_price_history` table (populated as a side
   * effect of every successful API fetch in GetCurrentStockPriceUseCase).
   * The date range filter is applied at the database to avoid pulling
   * the full series back when the caller only wants a recent window.
   */
  async getPriceHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { symbol } = req.params;
      const normalizedSymbol = symbol.toUpperCase();

      // Parse and clamp the lookback window. Bad input falls back to the
      // default rather than 400-ing — chart data is non-critical and we'd
      // rather render something than break the page on a typo.
      const rawDays = Number(req.query.days);
      const days = Number.isFinite(rawDays) && rawDays > 0
        ? Math.min(Math.floor(rawDays), MAX_HISTORY_DAYS)
        : DEFAULT_HISTORY_DAYS;

      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await this.supabase
        .from('stock_price_history')
        .select('recorded_at, price')
        .eq('symbol', normalizedSymbol)
        .gte('recorded_at', since.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) {
        // Surface as 500 via the shared error handler — the caller can
        // retry; we don't have a meaningful partial response to give.
        throw new Error(`Failed to load price history: ${error.message}`);
      }

      const series = (data ?? []).map((row: { recorded_at: string; price: number }) => ({
        date: row.recorded_at,
        price: Number(row.price),
      }));

      res.status(200).json({
        symbol: normalizedSymbol,
        data: series,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update investment account (shares and montoInvertido)
   * POST /api/investments/:accountId/update
   * 
   * Requirements: 13.6
   */
  async updateInvestment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { accountId } = req.params;
      const dto: UpdateInvestmentAccountDTO = req.body;

      await this.updateInvestmentAccountUseCase.execute(accountId, dto, userId);

      res.status(200).json({ message: 'Investment account updated successfully' });
    } catch (error) {
      next(error);
    }
  }
}
