import { describe, it, expect, beforeEach } from 'vitest';
import { pocketService } from './pocketService';
import { accountService } from './accountService';

describe('pocketService', () => {
    let accountId: string;

    beforeEach(() => {
        localStorage.clear();
        const account = accountService.createAccount('Test Account', '#FF0000', 'USD');
        accountId = account.id;
    });

    describe('createPocket', () => {
        it('should create a normal pocket', async () => {
            const pocket = await pocketService.createPocket(accountId, 'Savings', 'normal');

            expect(pocket).toMatchObject({
                accountId,
                name: 'Savings',
                type: 'normal',
                balance: 0,
                currency: 'USD',
            });
            expect(pocket.id).toBeDefined();
        });

        it('should trim whitespace from name', async () => {
            const pocket = await pocketService.createPocket(accountId, '  Savings  ', 'normal');
            expect(pocket.name).toBe('Savings');
        });

        it('should throw error for empty name', async () => {
            await expect(
                pocketService.createPocket(accountId, '  ', 'normal')
            ).rejects.toThrow('Pocket name cannot be empty');
        });

        it('should create a fixed pocket', async () => {
            const pocket = await pocketService.createPocket(accountId, 'Fixed Expenses', 'fixed');

            expect(pocket.type).toBe('fixed');
        });

        it('should throw error for duplicate pocket name in same account', async () => {
            await pocketService.createPocket(accountId, 'Savings', 'normal');

            await expect(
                pocketService.createPocket(accountId, 'Savings', 'normal')
            ).rejects.toThrow('A pocket with name "Savings" already exists in this account');
        });

        it('should allow same pocket name in different accounts', async () => {
            const account2 = accountService.createAccount('Account 2', '#00FF00', 'MXN');

            await pocketService.createPocket(accountId, 'Savings', 'normal');
            const pocket2 = await pocketService.createPocket(account2.id, 'Savings', 'normal');

            expect(pocket2.name).toBe('Savings');
            expect(pocket2.accountId).toBe(account2.id);
        });

        it('should throw error when creating second fixed pocket', async () => {
            await pocketService.createPocket(accountId, 'Fixed 1', 'fixed');

            const account2 = accountService.createAccount('Account 2', '#00FF00', 'MXN');
            await expect(
                pocketService.createPocket(account2.id, 'Fixed 2', 'fixed')
            ).rejects.toThrow('A fixed expenses pocket already exists');
        });

        it('should throw error for non-existent account', async () => {
            await expect(
                pocketService.createPocket('non-existent', 'Test', 'normal')
            ).rejects.toThrow('Account with id "non-existent" not found');
        });
    });

    describe('getPocketsByAccount', () => {
        it('should return pockets for specific account', async () => {
            await pocketService.createPocket(accountId, 'Pocket 1', 'normal');
            await pocketService.createPocket(accountId, 'Pocket 2', 'normal');

            const account2 = accountService.createAccount('Account 2', '#00FF00', 'MXN');
            await pocketService.createPocket(account2.id, 'Pocket 3', 'normal');

            const pockets = pocketService.getPocketsByAccount(accountId);
            expect(pockets).toHaveLength(2);
            expect(pockets.every(p => p.accountId === accountId)).toBe(true);
        });

        it('should return empty array for account with no pockets', () => {
            const pockets = pocketService.getPocketsByAccount(accountId);
            expect(pockets).toEqual([]);
        });
    });

    describe('updatePocket', () => {
        it('should update pocket name', async () => {
            const pocket = await pocketService.createPocket(accountId, 'Old Name', 'normal');
            const updated = await pocketService.updatePocket(pocket.id, { name: 'New Name' });

            expect(updated.name).toBe('New Name');
        });

        it('should throw error for duplicate name in same account', async () => {
            const pocket1 = await pocketService.createPocket(accountId, 'Pocket 1', 'normal');
            await pocketService.createPocket(accountId, 'Pocket 2', 'normal');

            await expect(
                pocketService.updatePocket(pocket1.id, { name: 'Pocket 2' })
            ).rejects.toThrow('A pocket with name "Pocket 2" already exists in this account');
        });

        it('should throw error for non-existent pocket', async () => {
            await expect(
                pocketService.updatePocket('non-existent', { name: 'Test' })
            ).rejects.toThrow('Pocket with id "non-existent" not found');
        });
    });

    describe('deletePocket', () => {
        it('should delete pocket without sub-pockets', async () => {
            const pocket = await pocketService.createPocket(accountId, 'Test', 'normal');
            await pocketService.deletePocket(pocket.id);

            const pockets = pocketService.getPocketsByAccount(accountId);
            expect(pockets).toHaveLength(0);
        });

        it('should throw error for non-existent pocket', async () => {
            await expect(
                pocketService.deletePocket('non-existent')
            ).rejects.toThrow('Pocket with id "non-existent" not found');
        });
    });

    describe('getFixedExpensesPocket', () => {
        it('should return fixed pocket if exists', async () => {
            const fixedPocket = await pocketService.createPocket(accountId, 'Fixed', 'fixed');
            const retrieved = pocketService.getFixedExpensesPocket();

            expect(retrieved).toEqual(fixedPocket);
        });

        it('should return null if no fixed pocket exists', () => {
            const pocket = pocketService.getFixedExpensesPocket();
            expect(pocket).toBeNull();
        });
    });
});
