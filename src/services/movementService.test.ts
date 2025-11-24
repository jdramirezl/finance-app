import { describe, it, expect, beforeEach } from 'vitest';
import { movementService } from './movementService';
import { accountService } from './accountService';
import { pocketService } from './pocketService';
import { subPocketService } from './subPocketService';

describe('movementService', () => {
    let accountId: string;
    let pocketId: string;
    let fixedPocketId: string;
    let subPocketId: string;

    beforeEach(async () => {
        localStorage.clear();
        const account = accountService.createAccount('Test Account', '#FF0000', 'USD');
        accountId = account.id;

        const pocket = await pocketService.createPocket(accountId, 'Savings', 'normal');
        pocketId = pocket.id;

        const fixedPocket = await pocketService.createPocket(accountId, 'Fixed', 'fixed');
        fixedPocketId = fixedPocket.id;

        const subPocket = await subPocketService.createSubPocket(fixedPocketId, 'Internet', 1200, 12);
        subPocketId = subPocket.id;
    });

    describe('createMovement', () => {
        it('should create IngresoNormal movement', async () => {
            const movement = await movementService.createMovement(
                'IngresoNormal',
                accountId,
                pocketId,
                500,
                'Salary'
            );

            expect(movement).toMatchObject({
                type: 'IngresoNormal',
                accountId,
                pocketId,
                amount: 500,
                notes: 'Salary',
            });
            expect(movement.id).toBeDefined();
            expect(movement.createdAt).toBeDefined();
            expect(movement.displayedDate).toBeDefined();
        });

        it('should throw error for zero amount', async () => {
            await expect(
                movementService.createMovement('IngresoNormal', accountId, pocketId, 0)
            ).rejects.toThrow('Movement amount must be greater than zero');
        });

        it('should throw error for negative amount', async () => {
            await expect(
                movementService.createMovement('IngresoNormal', accountId, pocketId, -100)
            ).rejects.toThrow('Movement amount must be greater than zero');
        });

        it('should throw error for non-existent account', async () => {
            await expect(
                movementService.createMovement('IngresoNormal', 'non-existent', pocketId, 100)
            ).rejects.toThrow('Account with id "non-existent" not found');
        });

        it('should throw error for non-existent pocket', async () => {
            await expect(
                movementService.createMovement('IngresoNormal', accountId, 'non-existent', 100)
            ).rejects.toThrow('Pocket with id "non-existent" not found');
        });

        it('should trim whitespace from notes', async () => {
            const movement = await movementService.createMovement(
                'IngresoNormal',
                accountId,
                pocketId,
                500,
                '  Salary  '
            );
            expect(movement.notes).toBe('Salary');
        });

        it('should create EgresoNormal movement', async () => {
            const movement = await movementService.createMovement(
                'EgresoNormal',
                accountId,
                pocketId,
                100,
                'Groceries'
            );

            expect(movement.type).toBe('EgresoNormal');
            expect(movement.amount).toBe(100);
        });

        it('should create IngresoFijo movement with subPocketId', async () => {
            const movement = await movementService.createMovement(
                'IngresoFijo',
                accountId,
                fixedPocketId,
                100,
                'Monthly contribution',
                undefined,
                subPocketId
            );

            expect(movement.type).toBe('IngresoFijo');
            expect(movement.subPocketId).toBe(subPocketId);
        });

        it('should use custom displayedDate if provided', async () => {
            const customDate = '2024-01-15T00:00:00.000Z';
            const movement = await movementService.createMovement(
                'IngresoNormal',
                accountId,
                pocketId,
                500,
                'Test',
                customDate
            );

            expect(movement.displayedDate).toBe(customDate);
        });

        it('should update pocket balance on IngresoNormal', async () => {
            await movementService.createMovement('IngresoNormal', accountId, pocketId, 500);

            const pocket = pocketService.getPocket(pocketId);
            expect(pocket?.balance).toBe(500);
        });

        it('should update pocket balance on EgresoNormal', async () => {
            await movementService.createMovement('IngresoNormal', accountId, pocketId, 500);
            await movementService.createMovement('EgresoNormal', accountId, pocketId, 100);

            const pocket = pocketService.getPocket(pocketId);
            expect(pocket?.balance).toBe(400);
        });

        it('should update sub-pocket balance on IngresoFijo', async () => {
            await movementService.createMovement(
                'IngresoFijo',
                accountId,
                fixedPocketId,
                100,
                'Test',
                undefined,
                subPocketId
            );

            const subPocket = subPocketService.getSubPocket(subPocketId);
            expect(subPocket?.balance).toBe(100);
        });

        it('should update sub-pocket balance on EgresoFijo', async () => {
            await movementService.createMovement('IngresoFijo', accountId, fixedPocketId, 200, '', undefined, subPocketId);
            await movementService.createMovement('EgresoFijo', accountId, fixedPocketId, 50, '', undefined, subPocketId);

            const subPocket = subPocketService.getSubPocket(subPocketId);
            expect(subPocket?.balance).toBe(150);
        });

        it('should allow negative balance (debt)', async () => {
            await movementService.createMovement('EgresoNormal', accountId, pocketId, 100);

            const pocket = pocketService.getPocket(pocketId);
            expect(pocket?.balance).toBe(-100);
        });
    });

    describe('updateMovement', () => {
        it('should update movement and recalculate balances', async () => {
            const movement = await movementService.createMovement('IngresoNormal', accountId, pocketId, 500);

            await movementService.updateMovement(movement.id, { amount: 600 });

            const pocket = pocketService.getPocket(pocketId);
            expect(pocket?.balance).toBe(600);
        });

        it('should update movement type and recalculate', async () => {
            const movement = await movementService.createMovement('IngresoNormal', accountId, pocketId, 500);

            await movementService.updateMovement(movement.id, { type: 'EgresoNormal' });

            const pocket = pocketService.getPocket(pocketId);
            expect(pocket?.balance).toBe(-500);
        });

        it('should update notes', async () => {
            const movement = await movementService.createMovement('IngresoNormal', accountId, pocketId, 500, 'Old');
            const updated = await movementService.updateMovement(movement.id, { notes: 'New' });

            expect(updated.notes).toBe('New');
        });

        it('should throw error for non-existent movement', async () => {
            await expect(
                movementService.updateMovement('non-existent', { amount: 100 })
            ).rejects.toThrow('Movement with id "non-existent" not found');
        });
    });

    describe('deleteMovement', () => {
        it('should delete movement and recalculate balances', async () => {
            const movement = await movementService.createMovement('IngresoNormal', accountId, pocketId, 500);

            await movementService.deleteMovement(movement.id);

            const pocket = pocketService.getPocket(pocketId);
            expect(pocket?.balance).toBe(0);

            const movements = movementService.getAllMovements();
            expect(movements).toHaveLength(0);
        });

        it('should throw error for non-existent movement', async () => {
            await expect(
                movementService.deleteMovement('non-existent')
            ).rejects.toThrow('Movement with id "non-existent" not found');
        });
    });

    describe('getMovementsGroupedByMonth', () => {
        it('should group movements by month', async () => {
            await movementService.createMovement('IngresoNormal', accountId, pocketId, 100, '', '2024-01-15T00:00:00.000Z');
            await movementService.createMovement('IngresoNormal', accountId, pocketId, 200, '', '2024-01-20T00:00:00.000Z');
            await movementService.createMovement('IngresoNormal', accountId, pocketId, 300, '', '2024-02-10T00:00:00.000Z');

            const grouped = movementService.getMovementsGroupedByMonth();

            expect(grouped.size).toBe(2);
            expect(grouped.get('2024-01')).toHaveLength(2);
            expect(grouped.get('2024-02')).toHaveLength(1);
        });

        it('should sort movements by createdAt within each month', async () => {
            await movementService.createMovement('IngresoNormal', accountId, pocketId, 100, '', '2024-01-15T00:00:00.000Z');
            await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different createdAt
            await movementService.createMovement('IngresoNormal', accountId, pocketId, 200, '', '2024-01-10T00:00:00.000Z');

            const grouped = movementService.getMovementsGroupedByMonth();
            const january = grouped.get('2024-01')!;

            // Movements sorted by createdAt descending (newest first)
            expect(january[0].amount).toBe(100); // Created first
            expect(january[1].amount).toBe(200); // Created second
        });
    });

    describe('balance recalculation', () => {
        it('should maintain correct balances through movement operations', async () => {
            await movementService.createMovement('IngresoNormal', accountId, pocketId, 500);
            await movementService.createMovement('EgresoNormal', accountId, pocketId, 100);

            const pocket = pocketService.getPocket(pocketId);
            expect(pocket?.balance).toBe(400);
        });
    });
});
