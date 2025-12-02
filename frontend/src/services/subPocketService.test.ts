import { describe, it, expect, beforeEach } from 'vitest';
import { subPocketService } from './subPocketService';
import { pocketService } from './pocketService';
import { accountService } from './accountService';

describe('subPocketService', () => {
    let fixedPocketId: string;

    beforeEach(async () => {
        localStorage.clear();
        const account = await accountService.createAccount('Test Account', '#FF0000', 'USD');
        const fixedPocket = await pocketService.createPocket(account.id, 'Fixed Expenses', 'fixed');
        fixedPocketId = fixedPocket.id;
    });

    describe('createSubPocket', () => {
        it('should create a sub-pocket', async () => {
            const subPocket = await subPocketService.createSubPocket(
                fixedPocketId,
                'Internet',
                1200,
                12
            );

            expect(subPocket).toMatchObject({
                pocketId: fixedPocketId,
                name: 'Internet',
                valueTotal: 1200,
                periodicityMonths: 12,
                balance: 0,
                enabled: true,
            });
            expect(subPocket.id).toBeDefined();
        });

        it('should throw error for non-fixed pocket', async () => {
            const account = await accountService.createAccount('Account 2', '#00FF00', 'MXN');
            const normalPocket = await pocketService.createPocket(account.id, 'Normal', 'normal');

            await expect(
                subPocketService.createSubPocket(normalPocket.id, 'Test', 1000, 12)
            ).rejects.toThrow('Sub-pockets can only be created for fixed expenses pockets');
        });

        it('should throw error for duplicate name in same pocket', async () => {
            await subPocketService.createSubPocket(fixedPocketId, 'Internet', 1200, 12);
            
            await expect(
                subPocketService.createSubPocket(fixedPocketId, 'Internet', 1000, 6)
            ).rejects.toThrow('A sub-pocket with name "Internet" already exists in this pocket');
        });

        it('should throw error for non-existent pocket', async () => {
            await expect(
                subPocketService.createSubPocket('non-existent', 'Test', 1000, 12)
            ).rejects.toThrow('Pocket with id "non-existent" not found');
        });

        it('should throw error for empty name', async () => {
            await expect(
                subPocketService.createSubPocket(fixedPocketId, '  ', 1000, 12)
            ).rejects.toThrow('Sub-pocket name cannot be empty');
        });

        it('should throw error for negative valueTotal', async () => {
            await expect(
                subPocketService.createSubPocket(fixedPocketId, 'Test', -100, 12)
            ).rejects.toThrow('Sub-pocket total value must be greater than zero');
        });

        it('should throw error for zero periodicityMonths', async () => {
            await expect(
                subPocketService.createSubPocket(fixedPocketId, 'Test', 1000, 0)
            ).rejects.toThrow('Sub-pocket periodicity must be greater than zero');
        });

        it('should trim whitespace from name', async () => {
            const subPocket = await subPocketService.createSubPocket(fixedPocketId, '  Internet  ', 1200, 12);
            expect(subPocket.name).toBe('Internet');
        });
    });

    describe('calculateAporteMensual', () => {
        it('should calculate monthly contribution correctly', () => {
            const monthly = subPocketService.calculateAporteMensual(1200, 12);
            expect(monthly).toBe(100);
        });

        it('should handle non-divisible amounts', () => {
            const monthly = subPocketService.calculateAporteMensual(1000, 3);
            expect(monthly).toBeCloseTo(333.33, 2);
        });
    });

    describe('calculateProgress', () => {
        it('should calculate progress ratio', () => {
            const progress = subPocketService.calculateProgress(500, 1000);
            expect(progress).toBe(0.5);
        });

        it('should handle zero total', () => {
            const progress = subPocketService.calculateProgress(100, 0);
            expect(progress).toBe(0);
        });

        it('should handle over 100% progress', () => {
            const progress = subPocketService.calculateProgress(1500, 1000);
            expect(progress).toBe(1.5);
        });

        it('should handle negative balance (debt)', () => {
            const progress = subPocketService.calculateProgress(-100, 1000);
            expect(progress).toBe(-0.1);
        });
    });

    describe('updateSubPocket', () => {
        it('should update sub-pocket name', async () => {
            const subPocket = await subPocketService.createSubPocket(fixedPocketId, 'Old', 1000, 12);
            const updated = await subPocketService.updateSubPocket(subPocket.id, { name: 'New' });

            expect(updated.name).toBe('New');
        });

        it('should update valueTotal', async () => {
            const subPocket = await subPocketService.createSubPocket(fixedPocketId, 'Test', 1000, 12);
            const updated = await subPocketService.updateSubPocket(subPocket.id, { valueTotal: 2000 });

            expect(updated.valueTotal).toBe(2000);
        });

        it('should update periodicityMonths', async () => {
            const subPocket = await subPocketService.createSubPocket(fixedPocketId, 'Test', 1000, 12);
            const updated = await subPocketService.updateSubPocket(subPocket.id, { periodicityMonths: 6 });

            expect(updated.periodicityMonths).toBe(6);
        });

        it('should throw error for empty name on update', async () => {
            const subPocket = await subPocketService.createSubPocket(fixedPocketId, 'Test', 1000, 12);
            
            await expect(
                subPocketService.updateSubPocket(subPocket.id, { name: '  ' })
            ).rejects.toThrow('Sub-pocket name cannot be empty');
        });

        it('should throw error for negative valueTotal on update', async () => {
            const subPocket = await subPocketService.createSubPocket(fixedPocketId, 'Test', 1000, 12);
            
            await expect(
                subPocketService.updateSubPocket(subPocket.id, { valueTotal: -100 })
            ).rejects.toThrow('Sub-pocket total value must be greater than zero');
        });

        it('should throw error for duplicate name on update', async () => {
            const sp1 = await subPocketService.createSubPocket(fixedPocketId, 'SubPocket 1', 1000, 12);
            await subPocketService.createSubPocket(fixedPocketId, 'SubPocket 2', 1000, 12);

            await expect(
                subPocketService.updateSubPocket(sp1.id, { name: 'SubPocket 2' })
            ).rejects.toThrow('A sub-pocket with name "SubPocket 2" already exists in this pocket');
        });
    });

    describe('toggleSubPocketEnabled', () => {
        it('should toggle enabled status', async () => {
            const subPocket = await subPocketService.createSubPocket(fixedPocketId, 'Test', 1000, 12);
            expect(subPocket.enabled).toBe(true);

            const toggled = await subPocketService.toggleSubPocketEnabled(subPocket.id);
            expect(toggled.enabled).toBe(false);

            const toggledAgain = await subPocketService.toggleSubPocketEnabled(subPocket.id);
            expect(toggledAgain.enabled).toBe(true);
        });
    });

    describe('deleteSubPocket', () => {
        it('should delete sub-pocket', async () => {
            const subPocket = await subPocketService.createSubPocket(fixedPocketId, 'Test', 1000, 12);
            await subPocketService.deleteSubPocket(subPocket.id);

            const subPockets = subPocketService.getSubPocketsByPocket(fixedPocketId);
            expect(subPockets).toHaveLength(0);
        });

        it('should throw error for non-existent sub-pocket', async () => {
            await expect(
                subPocketService.deleteSubPocket('non-existent')
            ).rejects.toThrow('Sub-pocket with id "non-existent" not found');
        });
    });

    describe('calculateTotalFijosMes', () => {
        it('should calculate total for enabled sub-pockets', async () => {
            await subPocketService.createSubPocket(fixedPocketId, 'Internet', 1200, 12); // 100/month
            await subPocketService.createSubPocket(fixedPocketId, 'Insurance', 2400, 12); // 200/month
            const sp3 = await subPocketService.createSubPocket(fixedPocketId, 'Gym', 600, 6); // 100/month
            await subPocketService.toggleSubPocketEnabled(sp3.id); // Disable

            const total = subPocketService.calculateTotalFijosMes(fixedPocketId);
            expect(total).toBe(300); // Only enabled ones
        });

        it('should return 0 for pocket with no sub-pockets', () => {
            const total = subPocketService.calculateTotalFijosMes(fixedPocketId);
            expect(total).toBe(0);
        });
    });
});
