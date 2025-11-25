import { describe, it, expect, beforeEach, vi } from 'vitest';
import { accountService } from './accountService';
// import { StorageService } from './storageService';

describe('accountService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('createAccount', () => {
        it('should create a normal account', async () => {
            const account = await accountService.createAccount('Test Account', '#FF0000', 'USD');

            expect(account).toMatchObject({
                name: 'Test Account',
                color: '#FF0000',
                currency: 'USD',
                balance: 0,
                type: 'normal',
            });
            expect(account.id).toBeDefined();
        });

        it('should trim whitespace from name', async () => {
            const account = await accountService.createAccount('  Test Account  ', '#FF0000', 'USD');
            expect(account.name).toBe('Test Account');
        });

        it('should throw error for empty name', () => {
            expect(() => {
                accountService.createAccount('  ', '#FF0000', 'USD');
            }).toThrow('Account name cannot be empty');
        });

        it('should throw error for empty color', () => {
            expect(() => {
                accountService.createAccount('Test', '  ', 'USD');
            }).toThrow('Account color cannot be empty');
        });

        it('should create an investment account', async () => {
            const account = await accountService.createAccount(
                'VOO',
                '#8B5CF6',
                'USD',
                'investment',
                'VOO'
            );

            expect(account).toMatchObject({
                name: 'VOO',
                type: 'investment',
                stockSymbol: 'VOO',
                montoInvertido: 0,
                shares: 0,
            });
        });

        it('should throw error for duplicate account name + currency', async () => {
            await accountService.createAccount('Test', '#FF0000', 'USD');

            await expect(
                accountService.createAccount('Test', '#00FF00', 'USD')
            ).rejects.toThrow('An account with name "Test" and currency "USD" already exists');
        });

        it('should allow same name with different currency', async () => {
            await accountService.createAccount('Test', '#FF0000', 'USD');
            const account2 = await accountService.createAccount('Test', '#00FF00', 'MXN');

            expect(account2.name).toBe('Test');
            expect(account2.currency).toBe('MXN');
        });
    });

    describe('getAccount', () => {
        it('should retrieve account by ID', async () => {
            const created = await accountService.createAccount('Test', '#FF0000', 'USD');
            const retrieved = await accountService.getAccount(created.id);

            expect(retrieved).toEqual(created);
        });

        it('should return null for non-existent ID', () => {
            const account = accountService.getAccount('non-existent');
            expect(account).toBeNull();
        });
    });

    describe('updateAccount', () => {
        it('should update account name', async () => {
            const account = await accountService.createAccount('Old Name', '#FF0000', 'USD');
            const updated = await accountService.updateAccount(account.id, { name: 'New Name' });

            expect(updated.name).toBe('New Name');
            expect(updated.color).toBe('#FF0000');
        });

        it('should update account color', async () => {
            const account = await accountService.createAccount('Test', '#FF0000', 'USD');
            const updated = await accountService.updateAccount(account.id, { color: '#00FF00' });

            expect(updated.color).toBe('#00FF00');
        });

        it('should throw error when updating to duplicate name + currency', async () => {
            const acc1 = await accountService.createAccount('Account1', '#FF0000', 'USD');
            await accountService.createAccount('Account2', '#00FF00', 'USD');

            await expect(
                accountService.updateAccount(acc1.id, { name: 'Account2' })
            ).rejects.toThrow('An account with name "Account2" and currency "USD" already exists');
        });

        it('should throw error for non-existent account', async () => {
            await expect(
                accountService.updateAccount('non-existent', { name: 'Test' })
            ).rejects.toThrow('Account with id "non-existent" not found');
        });
    });

    describe('deleteAccount', () => {
        it('should delete account without pockets', async () => {
            const account = await accountService.createAccount('Test', '#FF0000', 'USD');
            await accountService.deleteAccount(account.id);

            const retrieved = accountService.getAccount(account.id);
            expect(retrieved).toBeNull();
        });

        it('should throw error when deleting account with pockets', async () => {
            const account = await accountService.createAccount('Test', '#FF0000', 'USD');

            // Mock pocketService to return pockets
            const pocketService = await import('./pocketService');
            vi.spyOn(pocketService.pocketService, 'getPocketsByAccount').mockReturnValue(Promise.resolve([
                {
                    id: 'pocket-1',
                    accountId: account.id,
                    name: 'Test Pocket',
                    type: 'normal',
                    balance: 0,
                    currency: 'USD',
                },
            ]));

            await expect(
                accountService.deleteAccount(account.id)
            ).rejects.toThrow('Cannot delete account "Test" because it has 1 pocket(s)');
        });

        it('should throw error for non-existent account', async () => {
            await expect(
                accountService.deleteAccount('non-existent')
            ).rejects.toThrow('Account with id "non-existent" not found');
        });
    });

    describe('validateAccountUniqueness', () => {
        it('should return true for unique combination', async () => {
            await accountService.createAccount('Test', '#FF0000', 'USD');
            const isUnique = await accountService.validateAccountUniqueness('Test', 'MXN');
            expect(isUnique).toBe(true);
        });

        it('should return false for duplicate combination', async () => {
            await accountService.createAccount('Test', '#FF0000', 'USD');
            const isUnique = await accountService.validateAccountUniqueness('Test', 'USD');
            expect(isUnique).toBe(false);
        });

        it('should exclude specified ID from validation', async () => {
            const account = await accountService.createAccount('Test', '#FF0000', 'USD');
            const isUnique = await accountService.validateAccountUniqueness('Test', 'USD', account.id);
            expect(isUnique).toBe(true);
        });
    });
});
