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
import { GetCurrentStockPriceUseCase } from '../application/useCases/GetCurrentStockPriceUseCase';
import { UpdateInvestmentAccountUseCase } from '../application/useCases/UpdateInvestmentAccountUseCase';
import type { UpdateInvestmentAccountDTO } from '../application/useCases/UpdateInvestmentAccountUseCase';

@injectable()
export class InvestmentController {
  constructor(
    @inject(GetCurrentStockPriceUseCase) private getCurrentStockPriceUseCase: GetCurrentStockPriceUseCase,
    @inject(UpdateInvestmentAccountUseCase) private updateInvestmentAccountUseCase: UpdateInvestmentAccountUseCase
  ) {}

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

      const stockPrice = await this.getCurrentStockPriceUseCase.execute(symbol);

      res.status(200).json({
        symbol: stockPrice.symbol,
        price: stockPrice.price,
        cachedAt: stockPrice.cachedAt.toISOString(),
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
