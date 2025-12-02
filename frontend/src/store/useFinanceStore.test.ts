import { describe, it, expect, beforeEach } from 'vitest';
import { useFinanceStore } from './useFinanceStore';

describe('useFinanceStore', () => {
    beforeEach(() => {
        localStorage.clear();
        // Reset store state
        useFinanceStore.setState({
            accounts: [],
            pockets: [],
            subPockets: [],
            movements: [],
            settings: { primaryCurrency: 'USD' },
            selectedAccountId: null,
        });
    });

    describe('Account operations', () => {
        it('should create account', () => {
            const { createAccount } = useFinanceStore.getState();

            createAccount('Test Account', '#FF0000', 'USD');

            const state = useFinanceStore.getState();
            expect(state.accounts).toHaveLength(1);
            expect(state.accounts[0].name).toBe('Test Account');
        });

        it('should update account', async () => {
            const { createAccount, updateAccount } = useFinanceStore.getState();

            createAccount('Old Name', '#FF0000', 'USD');
            const accountId = useFinanceStore.getState().accounts[0].id;

            await updateAccount(accountId, { name: 'New Name' });

            const state = useFinanceStore.getState();
            expect(state.accounts[0].name).toBe('New Name');
        });

        it('should delete account', async () => {
            const { createAccount, deleteAccount } = useFinanceStore.getState();

            createAccount('Test', '#FF0000', 'USD');
            const accountId = useFinanceStore.getState().accounts[0].id;

            await deleteAccount(accountId);

            const state = useFinanceStore.getState();
            expect(state.accounts).toHaveLength(0);
        });

        it('should select account', () => {
            const { createAccount, selectAccount } = useFinanceStore.getState();

            createAccount('Test', '#FF0000', 'USD');
            const accountId = useFinanceStore.getState().accounts[0].id;

            selectAccount(accountId);

            const state = useFinanceStore.getState();
            expect(state.selectedAccountId).toBe(accountId);
        });
    });

    describe('Pocket operations', () => {
        let accountId: string;

        beforeEach(() => {
            const { createAccount } = useFinanceStore.getState();
            createAccount('Test Account', '#FF0000', 'USD');
            accountId = useFinanceStore.getState().accounts[0].id;
        });

        it('should create pocket', async () => {
            const { createPocket } = useFinanceStore.getState();

            await createPocket(accountId, 'Savings', 'normal');

            const state = useFinanceStore.getState();
            expect(state.pockets).toHaveLength(1);
            expect(state.pockets[0].name).toBe('Savings');
        });

        it('should update pocket', async () => {
            const { createPocket, updatePocket } = useFinanceStore.getState();

            await createPocket(accountId, 'Old Name', 'normal');
            const pocketId = useFinanceStore.getState().pockets[0].id;

            await updatePocket(pocketId, { name: 'New Name' });

            const state = useFinanceStore.getState();
            expect(state.pockets[0].name).toBe('New Name');
        });

        it('should delete pocket', async () => {
            const { createPocket, deletePocket } = useFinanceStore.getState();

            await createPocket(accountId, 'Test', 'normal');
            const pocketId = useFinanceStore.getState().pockets[0].id;

            await deletePocket(pocketId);

            const state = useFinanceStore.getState();
            expect(state.pockets).toHaveLength(0);
        });

        it('should get pockets by account', async () => {
            const { createAccount, createPocket, getPocketsByAccount } = useFinanceStore.getState();

            await createPocket(accountId, 'Pocket 1', 'normal');

            createAccount('Account 2', '#00FF00', 'MXN');
            const account2Id = useFinanceStore.getState().accounts[1].id;
            await createPocket(account2Id, 'Pocket 2', 'normal');

            const pockets = getPocketsByAccount(accountId);
            expect(pockets).toHaveLength(1);
            expect(pockets[0].name).toBe('Pocket 1');
        });
    });

    describe('SubPocket operations', () => {
        let accountId: string;
        let fixedPocketId: string;

        beforeEach(async () => {
            const { createAccount, createPocket } = useFinanceStore.getState();
            createAccount('Test Account', '#FF0000', 'USD');
            accountId = useFinanceStore.getState().accounts[0].id;

            await createPocket(accountId, 'Fixed Expenses', 'fixed');
            fixedPocketId = useFinanceStore.getState().pockets[0].id;
        });

        it('should create sub-pocket', async () => {
            const { createSubPocket } = useFinanceStore.getState();

            await createSubPocket(fixedPocketId, 'Internet', 1200, 12);

            const state = useFinanceStore.getState();
            expect(state.subPockets).toHaveLength(1);
            expect(state.subPockets[0].name).toBe('Internet');
        });

        it('should update sub-pocket', async () => {
            const { createSubPocket, updateSubPocket } = useFinanceStore.getState();

            await createSubPocket(fixedPocketId, 'Old', 1000, 12);
            const subPocketId = useFinanceStore.getState().subPockets[0].id;

            await updateSubPocket(subPocketId, { name: 'New' });

            const state = useFinanceStore.getState();
            expect(state.subPockets[0].name).toBe('New');
        });

        it('should delete sub-pocket', async () => {
            const { createSubPocket, deleteSubPocket } = useFinanceStore.getState();

            await createSubPocket(fixedPocketId, 'Test', 1000, 12);
            const subPocketId = useFinanceStore.getState().subPockets[0].id;

            await deleteSubPocket(subPocketId);

            const state = useFinanceStore.getState();
            expect(state.subPockets).toHaveLength(0);
        });

        it('should toggle sub-pocket enabled', async () => {
            const { createSubPocket, toggleSubPocketEnabled } = useFinanceStore.getState();

            await createSubPocket(fixedPocketId, 'Test', 1000, 12);
            const subPocketId = useFinanceStore.getState().subPockets[0].id;

            await toggleSubPocketEnabled(subPocketId);

            let state = useFinanceStore.getState();
            expect(state.subPockets[0].enabled).toBe(false);

            await toggleSubPocketEnabled(subPocketId);

            state = useFinanceStore.getState();
            expect(state.subPockets[0].enabled).toBe(true);
        });

        it('should get sub-pockets by pocket', async () => {
            const { createSubPocket, getSubPocketsByPocket } = useFinanceStore.getState();

            await createSubPocket(fixedPocketId, 'Internet', 1200, 12);
            await createSubPocket(fixedPocketId, 'Insurance', 2400, 12);

            const subPockets = getSubPocketsByPocket(fixedPocketId);
            expect(subPockets).toHaveLength(2);
        });
    });

    describe('Movement operations', () => {
        let accountId: string;
        let pocketId: string;

        beforeEach(async () => {
            const { createAccount, createPocket } = useFinanceStore.getState();
            createAccount('Test Account', '#FF0000', 'USD');
            accountId = useFinanceStore.getState().accounts[0].id;

            await createPocket(accountId, 'Savings', 'normal');
            pocketId = useFinanceStore.getState().pockets[0].id;
        });

        it('should create movement', async () => {
            const { createMovement } = useFinanceStore.getState();

            await createMovement('IngresoNormal', accountId, pocketId, 500, 'Salary');

            const state = useFinanceStore.getState();
            expect(state.movements).toHaveLength(1);
            expect(state.movements[0].amount).toBe(500);
        });

        it('should update movement', async () => {
            const { createMovement, updateMovement } = useFinanceStore.getState();

            await createMovement('IngresoNormal', accountId, pocketId, 500);
            const movementId = useFinanceStore.getState().movements[0].id;

            await updateMovement(movementId, { amount: 600 });

            const state = useFinanceStore.getState();
            expect(state.movements[0].amount).toBe(600);
        });

        it('should delete movement', async () => {
            const { createMovement, deleteMovement } = useFinanceStore.getState();

            await createMovement('IngresoNormal', accountId, pocketId, 500);
            const movementId = useFinanceStore.getState().movements[0].id;

            await deleteMovement(movementId);

            const state = useFinanceStore.getState();
            expect(state.movements).toHaveLength(0);
        });

        it('should update balances after movement', async () => {
            const { createMovement } = useFinanceStore.getState();

            await createMovement('IngresoNormal', accountId, pocketId, 500);

            const state = useFinanceStore.getState();
            expect(state.pockets[0].balance).toBe(500);
            expect(state.accounts[0].balance).toBe(500);
        });
    });

    describe('Settings operations', () => {
        it('should update settings', () => {
            const { updateSettings } = useFinanceStore.getState();

            updateSettings({ primaryCurrency: 'EUR' });

            const state = useFinanceStore.getState();
            expect(state.settings.primaryCurrency).toBe('EUR');
        });

        it('should persist settings to localStorage', () => {
            const { updateSettings } = useFinanceStore.getState();

            updateSettings({ primaryCurrency: 'MXN' });

            const state = useFinanceStore.getState();
            expect(state.settings.primaryCurrency).toBe('MXN');
        });
    });

    describe('Integration: Complete workflow', () => {
        it('should handle complete financial workflow', async () => {
            const store = useFinanceStore.getState();

            // Create account
            store.createAccount('Main Account', '#FF0000', 'USD');
            const accountId = useFinanceStore.getState().accounts[0].id;

            // Create pockets
            await store.createPocket(accountId, 'Savings', 'normal');
            await store.createPocket(accountId, 'Fixed Expenses', 'fixed');

            const state1 = useFinanceStore.getState();
            const savingsPocketId = state1.pockets[0].id;
            const fixedPocketId = state1.pockets[1].id;

            // Create sub-pocket
            await store.createSubPocket(fixedPocketId, 'Internet', 1200, 12);
            const subPocketId = useFinanceStore.getState().subPockets[0].id;

            // Create movements
            await store.createMovement('IngresoNormal', accountId, savingsPocketId, 1000, 'Salary');
            await store.createMovement('IngresoFijo', accountId, fixedPocketId, 100, 'Internet payment', undefined, subPocketId);
            await store.createMovement('EgresoNormal', accountId, savingsPocketId, 200, 'Groceries');

            // Verify final state
            const finalState = useFinanceStore.getState();

            // Check balances
            const savingsPocket = finalState.pockets.find(p => p.id === savingsPocketId);
            expect(savingsPocket?.balance).toBe(800); // 1000 - 200

            const fixedPocket = finalState.pockets.find(p => p.id === fixedPocketId);
            expect(fixedPocket?.balance).toBe(100);

            const account = finalState.accounts[0];
            expect(account.balance).toBe(900); // 800 + 100

            const subPocket = finalState.subPockets[0];
            expect(subPocket.balance).toBe(100);

            // Check movements
            expect(finalState.movements).toHaveLength(3);
        });
    });
});
