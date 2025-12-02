/**
 * Account Controller
 * 
 * Handles HTTP requests for account operations.
 * Delegates business logic to use cases.
 * 
 * Requirements: 4.1-4.7, 5.1-5.5
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { CreateAccountUseCase } from '../application/useCases/CreateAccountUseCase';
import { GetAllAccountsUseCase } from '../application/useCases/GetAllAccountsUseCase';
import { GetAccountByIdUseCase } from '../application/useCases/GetAccountByIdUseCase';
import { UpdateAccountUseCase } from '../application/useCases/UpdateAccountUseCase';
import { DeleteAccountUseCase } from '../application/useCases/DeleteAccountUseCase';
import { DeleteAccountCascadeUseCase } from '../application/useCases/DeleteAccountCascadeUseCase';
import { ReorderAccountsUseCase } from '../application/useCases/ReorderAccountsUseCase';
import type { CreateAccountDTO, UpdateAccountDTO } from '../application/dtos/AccountDTO';
import type { DeleteAccountCascadeDTO } from '../application/useCases/DeleteAccountCascadeUseCase';
import type { ReorderAccountsDTO } from '../application/useCases/ReorderAccountsUseCase';

@injectable()
export class AccountController {
  constructor(
    @inject(CreateAccountUseCase) private createAccountUseCase: CreateAccountUseCase,
    @inject(GetAllAccountsUseCase) private getAllAccountsUseCase: GetAllAccountsUseCase,
    @inject(GetAccountByIdUseCase) private getAccountByIdUseCase: GetAccountByIdUseCase,
    @inject(UpdateAccountUseCase) private updateAccountUseCase: UpdateAccountUseCase,
    @inject(DeleteAccountUseCase) private deleteAccountUseCase: DeleteAccountUseCase,
    @inject(DeleteAccountCascadeUseCase) private deleteCascadeUseCase: DeleteAccountCascadeUseCase,
    @inject(ReorderAccountsUseCase) private reorderAccountsUseCase: ReorderAccountsUseCase
  ) {}

  /**
   * Create new account
   * POST /api/accounts
   * 
   * Requirements: 4.1, 4.2, 4.3
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: CreateAccountDTO = req.body;
      const account = await this.createAccountUseCase.execute(dto, userId);

      res.status(201).json(account);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all accounts for user
   * GET /api/accounts
   * Query params: ?skipInvestmentPrices=true (optional)
   * 
   * Requirements: 4.4
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const skipInvestmentPrices = req.query.skipInvestmentPrices === 'true';
      const accounts = await this.getAllAccountsUseCase.execute(userId, skipInvestmentPrices);

      res.status(200).json(accounts);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get account by ID
   * GET /api/accounts/:id
   * 
   * Requirements: 4.4
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const accountId = req.params.id;
      const account = await this.getAccountByIdUseCase.execute(accountId, userId);

      res.status(200).json(account);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update account
   * PUT /api/accounts/:id
   * 
   * Requirements: 4.5
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const accountId = req.params.id;
      const dto: UpdateAccountDTO = req.body;
      const account = await this.updateAccountUseCase.execute(accountId, dto, userId);

      res.status(200).json(account);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete account (requires no pockets)
   * DELETE /api/accounts/:id
   * 
   * Requirements: 4.6
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const accountId = req.params.id;
      await this.deleteAccountUseCase.execute(accountId, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete account with cascade (deletes all related data)
   * POST /api/accounts/:id/cascade
   * Body: { deleteMovements: boolean }
   * 
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async deleteCascade(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const accountId = req.params.id;
      const dto: DeleteAccountCascadeDTO = req.body;
      const result = await this.deleteCascadeUseCase.execute(accountId, dto, userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reorder accounts
   * POST /api/accounts/reorder
   * Body: { accountIds: string[] }
   * 
   * Requirements: 4.7
   */
  async reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const dto: ReorderAccountsDTO = req.body;
      await this.reorderAccountsUseCase.execute(dto, userId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
