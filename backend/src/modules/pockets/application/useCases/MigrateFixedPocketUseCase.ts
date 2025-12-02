/**
 * Migrate Fixed Pocket Use Case
 * 
 * Business logic for migrating a fixed pocket to a different account.
 * Updates all movements and recalculates balances for both accounts.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { injectable, inject } from 'tsyringe';
import type { Pocket } from '../../domain/Pocket';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { PocketResponseDTO, MigratePocketDTO } from '../dtos/PocketDTO';
import { PocketMapper } from '../mappers/PocketMapper';
import { ValidationError, NotFoundError } from '../../../../shared/errors/AppError';
import { AccountDomainService } from '../../../accounts/domain/AccountDomainService';
import { PocketDomainService } from '../../domain/PocketDomainService';

/**
 * Minimal movement repository interface for migration
 * Full interface will be defined in Phase 4
 */
interface IMovementRepository {
  updateAccountIdByPocketId(pocketId: string, newAccountId: string, userId: string): Promise<number>;
}

@injectable()
export class MigrateFixedPocketUseCase {
  private accountDomainService: AccountDomainService;
  private pocketDomainService: PocketDomainService;

  constructor(
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('AccountRepository') private accountRepo: IAccountRepository,
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) {
    this.accountDomainService = new AccountDomainService();
    this.pocketDomainService = new PocketDomainService();
  }

  async execute(
    pocketId: string,
    dto: MigratePocketDTO,
    userId: string
  ): Promise<PocketResponseDTO> {
    // Validation
    if (!dto.targetAccountId?.trim()) {
      throw new ValidationError('Target account ID is required');
    }

    // Verify pocket exists and belongs to user
    const pocket = await this.pocketRepo.findById(pocketId, userId);
    if (!pocket) {
      throw new NotFoundError('Pocket not found');
    }

    // Verify pocket is fixed type
    if (!pocket.isFixed()) {
      throw new ValidationError('Only fixed pockets can be migrated');
    }

    // Verify source account exists
    const sourceAccount = await this.accountRepo.findById(pocket.accountId, userId);
    if (!sourceAccount) {
      throw new NotFoundError('Source account not found');
    }

    // Verify target account exists and belongs to user
    const targetAccount = await this.accountRepo.findById(dto.targetAccountId, userId);
    if (!targetAccount) {
      throw new NotFoundError('Target account not found');
    }

    // Requirement 7.1: Validate target account is not investment
    if (targetAccount.isInvestment()) {
      throw new ValidationError('Cannot migrate fixed pocket to an investment account');
    }

    // Don't allow migration to the same account
    if (pocket.accountId === dto.targetAccountId) {
      throw new ValidationError('Pocket is already in the target account');
    }

    // Requirement 7.2: Update all movements to reference the new account
    await this.movementRepo.updateAccountIdByPocketId(pocketId, dto.targetAccountId, userId);

    // Requirement 7.3: Update pocket's account reference
    pocket.accountId = dto.targetAccountId;
    await this.pocketRepo.update(pocket, userId);

    // Requirement 7.4: Recalculate balances for both accounts
    // Recalculate source account balance
    const sourcePockets = await this.pocketRepo.findByAccountId(sourceAccount.id, userId);
    this.accountDomainService.updateAccountBalance(sourceAccount, sourcePockets);
    await this.accountRepo.update(sourceAccount, userId);

    // Recalculate target account balance
    const targetPockets = await this.pocketRepo.findByAccountId(targetAccount.id, userId);
    this.accountDomainService.updateAccountBalance(targetAccount, targetPockets);
    await this.accountRepo.update(targetAccount, userId);

    // Return updated pocket DTO
    return PocketMapper.toDTO(pocket);
  }
}
