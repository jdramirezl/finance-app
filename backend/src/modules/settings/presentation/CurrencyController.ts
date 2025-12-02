/**
 * Currency Controller
 * 
 * Handles HTTP requests for currency operations (exchange rates and conversion).
 * Delegates business logic to use cases.
 * 
 * Requirements: 15.1-15.4
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { GetExchangeRateUseCase } from '../application/useCases/GetExchangeRateUseCase';
import { ConvertCurrencyUseCase } from '../application/useCases/ConvertCurrencyUseCase';
import type { ConvertCurrencyDTO } from '../application/dtos/ExchangeRateDTO';
import type { Currency } from '@shared-backend/types';
import { ValidationError } from '../../../shared/errors/AppError';

@injectable()
export class CurrencyController {
  constructor(
    @inject(GetExchangeRateUseCase) private getExchangeRateUseCase: GetExchangeRateUseCase,
    @inject(ConvertCurrencyUseCase) private convertCurrencyUseCase: ConvertCurrencyUseCase
  ) {}

  /**
   * Get exchange rate between two currencies
   * GET /api/currency/rates?from=USD&to=MXN
   * 
   * Requirements: 15.1, 15.2
   */
  async getRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const fromCurrency = req.query.from as Currency;
      const toCurrency = req.query.to as Currency;

      // Validate query parameters
      if (!fromCurrency || !toCurrency) {
        throw new ValidationError('Both "from" and "to" query parameters are required');
      }

      const exchangeRate = await this.getExchangeRateUseCase.execute(fromCurrency, toCurrency);

      res.status(200).json(exchangeRate);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert currency amount
   * POST /api/currency/convert
   * Body: { amount: number, fromCurrency: Currency, toCurrency: Currency }
   * 
   * Requirements: 15.3, 15.4
   */
  async convert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: ConvertCurrencyDTO = req.body;

      // Validate request body
      if (!dto.amount || !dto.fromCurrency || !dto.toCurrency) {
        throw new ValidationError('amount, fromCurrency, and toCurrency are required');
      }

      const result = await this.convertCurrencyUseCase.execute(dto);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
