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

/**
 * Single conversion entry in a batch request.
 * Uses the public-facing `from`/`to` keys instead of the internal
 * `fromCurrency`/`toCurrency` for a more compact wire format.
 */
interface BatchConversionRequestItem {
  amount: number;
  from: Currency;
  to: Currency;
}

/**
 * Single conversion entry in a batch response.
 */
interface BatchConversionResponseItem {
  amount: number;
  convertedAmount: number;
  rate: number;
  from: Currency;
  to: Currency;
}

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

  /**
   * Convert multiple currency amounts in a single request.
   * POST /api/currency/convert-batch
   * Body: { conversions: Array<{ amount: number, from: Currency, to: Currency }> }
   * Response: { results: Array<{ amount, convertedAmount, rate, from, to }> }
   *
   * Each entry is processed via the same ConvertCurrencyUseCase as the
   * single-conversion endpoint. Conversions run concurrently so the batch
   * latency is bounded by the slowest individual conversion rather than
   * the sum of all of them. If any conversion fails, the whole request
   * fails with that error — clients should validate inputs upfront.
   *
   * Order of results matches the order of the input array, so callers can
   * zip them back to the originating request entry.
   */
  async convertBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const conversions: unknown = req.body?.conversions;

      // Validate that conversions is a non-empty array
      if (!Array.isArray(conversions)) {
        throw new ValidationError('conversions must be an array');
      }

      if (conversions.length === 0) {
        throw new ValidationError('conversions must contain at least one entry');
      }

      // Validate each entry before doing any async work so that we fail fast
      // and never start conversions we know will be rejected.
      const validated: BatchConversionRequestItem[] = conversions.map((item, index) => {
        if (!item || typeof item !== 'object') {
          throw new ValidationError(`conversions[${index}] must be an object`);
        }

        const entry = item as Partial<BatchConversionRequestItem>;

        if (typeof entry.amount !== 'number' || Number.isNaN(entry.amount)) {
          throw new ValidationError(`conversions[${index}].amount must be a number`);
        }

        if (!entry.from || typeof entry.from !== 'string') {
          throw new ValidationError(`conversions[${index}].from is required`);
        }

        if (!entry.to || typeof entry.to !== 'string') {
          throw new ValidationError(`conversions[${index}].to is required`);
        }

        return {
          amount: entry.amount,
          from: entry.from as Currency,
          to: entry.to as Currency,
        };
      });

      // Run conversions concurrently. The use case itself handles caching of
      // exchange rates, so duplicate (from, to) pairs in the same batch will
      // not produce duplicate upstream calls in practice.
      const results: BatchConversionResponseItem[] = await Promise.all(
        validated.map(async (item) => {
          const result = await this.convertCurrencyUseCase.execute({
            amount: item.amount,
            fromCurrency: item.from,
            toCurrency: item.to,
          });

          return {
            amount: result.amount,
            convertedAmount: result.convertedAmount,
            rate: result.rate,
            from: result.fromCurrency,
            to: result.toCurrency,
          };
        })
      );

      res.status(200).json({ results });
    } catch (error) {
      next(error);
    }
  }
}
