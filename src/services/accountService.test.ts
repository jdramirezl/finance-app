import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { accountService } from './accountService';
import { apiClient } from './apiClient';
import type { Account } from '../types';

describe('accountService', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
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

    describe('Feature Flag - Backend Integration', () => {
        const mockAccount: Account = {
            id: 'test-id',
            name: 'Test Account',
            color: '#FF0000',
            currency: 'USD',
            balance: 100,
            type: 'normal',
        };

        describe('when backend flag is enabled', () => {
            beforeEach(() => {
                // Mock the environment variable
                vi.stubEnv('VITE_USE_BACKEND_ACCOUNTS', 'true');
            });

            it('should call backend API for getAllAccounts', async () => {
                const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue([mockAccount]);

                const result = await accountService.getAllAccounts();

                expect(apiSpy).toHaveBeenCalledWith('/api/accounts');
                expect(result).toEqual([mockAccount]);
            });

            it('should call backend API for getAccount', async () => {
                const apiSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockAccount);

                const result = await accountService.getAccount('test-id');

                expect(apiSpy).toHaveBeenCalledWith('/api/accounts/test-id');
                expect(result).toEqual(mockAccount);
            });

            it('should call backend API for createAccount', async () => {
                const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockAccount);

                const result = await accountService.createAccount('Test Account', '#FF0000', 'USD');

                expect(apiSpy).toHaveBeenCalledWith('/api/accounts', {
                    name: 'Test Account',
                    color: '#FF0000',
                    currency: 'USD',
                    type: 'normal',
                    stockSymbol: undefined,
                });
                expect(result).toEqual(mockAccount);
            });

            it('should call backend API for updateAccount', async () => {
                const apiSpy = vi.spyOn(apiClient, 'put').mockResolvedValue(mockAccount);

                const result = await accountService.updateAccount('test-id', { name: 'Updated Name' });

                expect(apiSpy).toHaveBeenCalledWith('/api/accounts/test-id', { name: 'Updated Name' });
                expect(result).toEqual(mockAccount);
            });

            it('should call backend API for deleteAccount', async () => {
                const apiSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined);

                await accountService.deleteAccount('test-id');

                expect(apiSpy).toHaveBeenCalledWith('/api/accounts/test-id');
            });

            it('should call backend API for deleteAccountCascade', async () => {
                const cascadeResult = {
                    account: 'Test Account',
                    pockets: 2,
                    subPockets: 3,
                    movements: 10,
                };
                const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(cascadeResult);

                const result = await accountService.deleteAccountCascade('test-id', true);

                expect(apiSpy).toHaveBeenCalledWith('/api/accounts/test-id/cascade', { deleteMovements: true });
                expect(result).toEqual(cascadeResult);
            });

            it('should call backend API for reorderAccounts', async () => {
                const apiSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(undefined);
                const accountIds = ['id1', 'id2', 'id3'];

                await accountService.reorderAccounts(accountIds);

                expect(apiSpy).toHaveBeenCalledWith('/api/accounts/reorder', { accountIds });
            });
        });

        describe('when backend flag is disabled', () => {
            beforeEach(() => {
                // Mock the environment variable as disabled
                vi.stubEnv('VITE_USE_BACKEND_ACCOUNTS', 'false');
            });

            it('should use direct Supabase calls for getAllAccounts', async () => {
                const apiSpy = vi.spyOn(apiClient, 'get');
                
                // Create an account directly to test retrieval
                await accountService.createAccount('Test', '#FF0000', 'USD');
                const result = await accountService.getAllAccounts();

                expect(apiSpy).not.toHaveBeenCalled();
                expect(result).toHaveLength(1);
                expect(result[0].name).toBe('Test');
            });

            it('should use direct Supabase calls for createAccount', async () => {
                const apiSpy = vi.spyOn(apiClient, 'post');

                const result = await accountService.createAccount('Test', '#FF0000', 'USD');

                expect(apiSpy).not.toHaveBeenCalled();
                expect(result.name).toBe('Test');
                expect(result.id).toBeDefined();
            });

            it('should use direct Supabase calls for updateAccount', async () => {
                const apiSpy = vi.spyOn(apiClient, 'put');
                
                const account = await accountService.createAccount('Test', '#FF0000', 'USD');
                const result = await accountService.updateAccount(account.id, { name: 'Updated' });

                expect(apiSpy).not.toHaveBeenCalled();
                expect(result.name).toBe('Updated');
            });

            it('should use direct Supabase calls for deleteAccount', async () => {
                const apiSpy = vi.spyOn(apiClient, 'delete');
                
                const account = await accountService.createAccount('Test', '#FF0000', 'USD');
                await accountService.deleteAccount(account.id);

                expect(apiSpy).not.toHaveBeenCalled();
                const retrieved = await accountService.getAccount(account.id);
                expect(retrieved).toBeNull();
            });
        });

        describe('fallback on backend error', () => {
            beforeEach(() => {
                // Enable backend flag
                vi.stubEnv('VITE_USE_BACKEND_ACCOUNTS', 'true');
            });

            it('should fallback to Supabase when getAllAccounts fails', async () => {
                const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));

                // Create account directly in Supabase
                await accountService.createAccount('Test', '#FF0000', 'USD');
                
                const result = await accountService.getAllAccounts();

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Backend API failed, falling back to Supabase:',
                    expect.any(Error)
                );
                expect(result).toHaveLength(1);
                expect(result[0].name).toBe('Test');
            });

            it('should fallback to Supabase when getAccount fails', async () => {
                const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Backend unavailable'));

                const account = await accountService.createAccount('Test', '#FF0000', 'USD');
                const result = await accountService.getAccount(account.id);

                expect(consoleErrorSpy).toHaveBeenCalled();
                expect(result).toEqual(account);
            });

            it('should fallback to Supabase when createAccount fails', async () => {
                const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));

                const result = await accountService.createAccount('Test', '#FF0000', 'USD');

                expect(consoleErrorSpy).toHaveBeenCalled();
                expect(result.name).toBe('Test');
                expect(result.id).toBeDefined();
            });

            it('should fallback to Supabase when updateAccount fails', async () => {
                const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                
                const account = await accountService.createAccount('Test', '#FF0000', 'USD');
                vi.spyOn(apiClient, 'put').mockRejectedValue(new Error('Backend unavailable'));
                
                const result = await accountService.updateAccount(account.id, { name: 'Updated' });

                expect(consoleErrorSpy).toHaveBeenCalled();
                expect(result.name).toBe('Updated');
            });

            it('should fallback to Supabase when deleteAccount fails', async () => {
                const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                
                const account = await accountService.createAccount('Test', '#FF0000', 'USD');
                vi.spyOn(apiClient, 'delete').mockRejectedValue(new Error('Backend unavailable'));
                
                await accountService.deleteAccount(account.id);

                expect(consoleErrorSpy).toHaveBeenCalled();
                const retrieved = await accountService.getAccount(account.id);
                expect(retrieved).toBeNull();
            });

            it('should fallback to Supabase when deleteAccountCascade fails', async () => {
                const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                
                const account = await accountService.createAccount('Test', '#FF0000', 'USD');
                vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
                
                const result = await accountService.deleteAccountCascade(account.id, false);

                expect(consoleErrorSpy).toHaveBeenCalled();
                expect(result.account).toBe('Test');
                expect(result.pockets).toBe(0);
            });

            it('should fallback to Supabase when reorderAccounts fails', async () => {
                const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                
                const acc1 = await accountService.createAccount('Test1', '#FF0000', 'USD');
                const acc2 = await accountService.createAccount('Test2', '#00FF00', 'USD');
                
                vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Backend unavailable'));
                
                await accountService.reorderAccounts([acc2.id, acc1.id]);

                expect(consoleErrorSpy).toHaveBeenCalled();
                
                const accounts = await accountService.getAllAccounts();
                expect(accounts[0].displayOrder).toBe(1);
                expect(accounts[1].displayOrder).toBe(0);
            });

            it('should log error message when backend fails', async () => {
                const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                const testError = new Error('Network timeout');
                vi.spyOn(apiClient, 'get').mockRejectedValue(testError);

                await accountService.getAllAccounts();

                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Backend API failed, falling back to Supabase:',
                    testError
                );
            });
        });
    });
});
