/**
 * Unit tests for GetAllPocketsUseCase
 */

import 'reflect-metadata';
import { GetAllPocketsUseCase } from './GetAllPocketsUseCase';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import { Pocket } from '../../domain/Pocket';
import type { Currency } from '@shared-backend/types';

describe('GetAllPocketsUseCase', () => {
  let useCase: GetAllPocketsUseCase;
  let mockPocketRepo: jest.Mocked<IPocketRepository>;

  const userId = 'user-123';

  beforeEach(() => {
    mockPocketRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByNameInAccount: jest.fn(),
      existsByNameInAccountExcludingId: jest.fn(),
      existsFixedPocketInAccount: jest.fn(),
      existsFixedPocketForUser: jest.fn(),
      existsFixedPocketForUserExcludingId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteByAccountId: jest.fn(),
      archive: jest.fn(),
      unarchive: jest.fn(),
      updateDisplayOrders: jest.fn(),
    };

    useCase = new GetAllPocketsUseCase(mockPocketRepo);
  });

  it('should default includeArchived to false when omitted', async () => {
    // The default keeps the pre-archive contract for callers that expect
    // only active rows. Pages that opt in pass `true` explicitly.
    mockPocketRepo.findAllByUserId.mockResolvedValue([]);

    await useCase.execute(userId);

    expect(mockPocketRepo.findAllByUserId).toHaveBeenCalledWith(userId, false);
  });

  it('should forward includeArchived=true to the repository', async () => {
    mockPocketRepo.findAllByUserId.mockResolvedValue([]);

    await useCase.execute(userId, true);

    expect(mockPocketRepo.findAllByUserId).toHaveBeenCalledWith(userId, true);
  });

  it('should sort pockets by display order with undefined sorting last', async () => {
    // Same nulls-last convention as GetPocketsByAccountUseCase. Verifies
    // both that the comparator is wired up and that newly created pockets
    // (no displayOrder yet) don't accidentally float to the top.
    const ordered = new Pocket('p1', 'acc-1', 'A', 'normal', 0, 'USD' as Currency, 0);
    const noOrder = new Pocket('p2', 'acc-1', 'B', 'normal', 0, 'USD' as Currency, undefined);
    const ordered2 = new Pocket('p3', 'acc-1', 'C', 'normal', 0, 'USD' as Currency, 1);

    mockPocketRepo.findAllByUserId.mockResolvedValue([noOrder, ordered2, ordered]);

    const result = await useCase.execute(userId);

    expect(result.map((p) => p.id)).toEqual(['p1', 'p3', 'p2']);
  });

  it('should return DTOs with archivedAt set for archived pockets when included', async () => {
    // When the caller opts in we want the response to surface the archived
    // timestamp so the UI can split active vs archived without a second
    // request.
    const archived = new Pocket(
      'p-archived',
      'acc-1',
      'Old Travel',
      'normal',
      0,
      'USD' as Currency,
      undefined,
      new Date('2024-01-01T00:00:00.000Z')
    );
    mockPocketRepo.findAllByUserId.mockResolvedValue([archived]);

    const result = await useCase.execute(userId, true);

    expect(result).toHaveLength(1);
    expect(result[0].archivedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should return an empty array when the user has no pockets', async () => {
    mockPocketRepo.findAllByUserId.mockResolvedValue([]);

    const result = await useCase.execute(userId);

    expect(result).toEqual([]);
  });
});
