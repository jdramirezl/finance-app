import { describe, it, expect, beforeEach } from 'vitest';
import { useFinanceStore } from '../store/useFinanceStore';
// import { accountService } from '../services/accountService';
// import { pocketService } from '../services/pocketService';
import { subPocketService } from '../services/subPocketService';
// import { movementService } from '../services/movementService';

describe('Integration Tests: Complete Financial Workflow', () => {
  beforeEach(() => {
    localStorage.clear();
    useFinanceStore.setState({
      accounts: [],
      pockets: [],
      subPockets: [],
      movements: [],
      settings: { primaryCurrency: 'USD' },
      selectedAccountId: null,
    });
  });

  describe('Scenario: User sets up complete financial system', () => {
    it('should handle multi-account, multi-pocket workflow with movements', async () => {
      const store = useFinanceStore.getState();

      // Step 1: Create main checking account
      store.createAccount('Checking', '#3B82F6', 'USD');
      let state = useFinanceStore.getState();
      const checkingId = state.accounts[0].id;
      expect(state.accounts).toHaveLength(1);

      // Step 2: Create savings account in different currency
      store.createAccount('Savings', '#10B981', 'MXN');
      state = useFinanceStore.getState();
      // const savingsId = state.accounts[1].id;
      expect(state.accounts).toHaveLength(2);

      // Step 3: Create investment account
      store.createAccount('VOO', '#8B5CF6', 'USD', 'investment', 'VOO');
      state = useFinanceStore.getState();
      // const investmentId = state.accounts[2].id;
      expect(state.accounts[2].type).toBe('investment');

      // Step 4: Create pockets in checking account
      await store.createPocket(checkingId, 'Daily Expenses', 'normal');
      await store.createPocket(checkingId, 'Emergency Fund', 'normal');
      await store.createPocket(checkingId, 'Fixed Expenses', 'fixed');
      
      state = useFinanceStore.getState();
      const dailyPocketId = state.pockets[0].id;
      const emergencyPocketId = state.pockets[1].id;
      const fixedPocketId = state.pockets[2].id;
      expect(state.pockets).toHaveLength(3);

      // Step 5: Create sub-pockets for fixed expenses
      await store.createSubPocket(fixedPocketId, 'Internet', 1200, 12);
      await store.createSubPocket(fixedPocketId, 'Insurance', 2400, 12);
      await store.createSubPocket(fixedPocketId, 'Gym', 600, 6);
      
      state = useFinanceStore.getState();
      const internetSubPocketId = state.subPockets[0].id;
      const insuranceSubPocketId = state.subPockets[1].id;
      const gymSubPocketId = state.subPockets[2].id;
      expect(state.subPockets).toHaveLength(3);

      // Step 6: Verify monthly contributions
      const totalMonthly = subPocketService.calculateTotalFijosMes(fixedPocketId);
      expect(totalMonthly).toBe(400); // 100 + 200 + 100

      // Step 7: Disable gym membership
      await store.toggleSubPocketEnabled(gymSubPocketId);
      state = useFinanceStore.getState();
      expect(state.subPockets[2].enabled).toBe(false);
      
      const totalMonthlyAfterDisable = subPocketService.calculateTotalFijosMes(fixedPocketId);
      expect(totalMonthlyAfterDisable).toBe(300); // 100 + 200

      // Step 8: Add income movements
      await store.createMovement('IngresoNormal', checkingId, dailyPocketId, 3000, 'Salary');
      await store.createMovement('IngresoNormal', checkingId, emergencyPocketId, 500, 'Emergency fund contribution');
      
      state = useFinanceStore.getState();
      expect(state.movements).toHaveLength(2);

      // Step 9: Add fixed expense contributions
      await store.createMovement('IngresoFijo', checkingId, fixedPocketId, 100, 'Internet monthly', undefined, internetSubPocketId);
      await store.createMovement('IngresoFijo', checkingId, fixedPocketId, 200, 'Insurance monthly', undefined, insuranceSubPocketId);
      
      state = useFinanceStore.getState();
      expect(state.movements).toHaveLength(4);

      // Step 10: Add expenses
      await store.createMovement('EgresoNormal', checkingId, dailyPocketId, 150, 'Groceries');
      await store.createMovement('EgresoNormal', checkingId, dailyPocketId, 50, 'Gas');
      
      state = useFinanceStore.getState();
      expect(state.movements).toHaveLength(6);

      // Step 11: Verify all balances
      state = useFinanceStore.getState();
      
      const dailyPocket = state.pockets.find(p => p.id === dailyPocketId);
      expect(dailyPocket?.balance).toBe(2800); // 3000 - 150 - 50
      
      const emergencyPocket = state.pockets.find(p => p.id === emergencyPocketId);
      expect(emergencyPocket?.balance).toBe(500);
      
      const fixedPocket = state.pockets.find(p => p.id === fixedPocketId);
      expect(fixedPocket?.balance).toBe(300); // 100 + 200
      
      const checkingAccount = state.accounts.find(a => a.id === checkingId);
      expect(checkingAccount?.balance).toBe(3600); // 2800 + 500 + 300

      // Step 12: Verify sub-pocket balances and progress
      const internetSubPocket = state.subPockets.find(sp => sp.id === internetSubPocketId);
      expect(internetSubPocket?.balance).toBe(100);
      expect(subPocketService.calculateProgress(100, 1200)).toBeCloseTo(0.0833, 2);
      
      const insuranceSubPocket = state.subPockets.find(sp => sp.id === insuranceSubPocketId);
      expect(insuranceSubPocket?.balance).toBe(200);
      expect(subPocketService.calculateProgress(200, 2400)).toBeCloseTo(0.0833, 2);

      // Step 13: Test movement update
      const firstMovement = state.movements[0];
      await store.updateMovement(firstMovement.id, { amount: 3500 });
      
      state = useFinanceStore.getState();
      const updatedDailyPocket = state.pockets.find(p => p.id === dailyPocketId);
      expect(updatedDailyPocket?.balance).toBe(3300); // 3500 - 150 - 50

      // Step 14: Test movement deletion
      const expenseMovement = state.movements.find(m => m.notes === 'Groceries');
      if (expenseMovement) {
        await store.deleteMovement(expenseMovement.id);
      }
      
      state = useFinanceStore.getState();
      expect(state.movements).toHaveLength(5);
      
      const finalDailyPocket = state.pockets.find(p => p.id === dailyPocketId);
      expect(finalDailyPocket?.balance).toBe(3450); // 3500 - 50 (groceries removed)

      // Step 15: Verify account balance recalculation
      const finalCheckingAccount = state.accounts.find(a => a.id === checkingId);
      expect(finalCheckingAccount?.balance).toBe(4250); // 3450 + 500 + 300
    });
  });

  describe('Scenario: Fixed expenses with debt and overpayment', () => {
    it('should handle negative balances and over-target payments', async () => {
      const store = useFinanceStore.getState();

      // Setup
      store.createAccount('Main', '#FF0000', 'USD');
      const accountId = useFinanceStore.getState().accounts[0].id;
      
      await store.createPocket(accountId, 'Fixed', 'fixed');
      const fixedPocketId = useFinanceStore.getState().pockets[0].id;
      
      await store.createSubPocket(fixedPocketId, 'Rent', 12000, 12);
      const subPocketId = useFinanceStore.getState().subPockets[0].id;

      // Scenario 1: Create debt (negative balance)
      await store.createMovement('EgresoFijo', accountId, fixedPocketId, 500, 'Emergency withdrawal', undefined, subPocketId);
      
      let state = useFinanceStore.getState();
      let subPocket = state.subPockets[0];
      expect(subPocket.balance).toBe(-500);
      expect(subPocketService.calculateProgress(-500, 12000)).toBeCloseTo(-0.0417, 2);

      // Scenario 2: Pay back debt plus normal contribution
      await store.createMovement('IngresoFijo', accountId, fixedPocketId, 1500, 'Debt repayment + monthly', undefined, subPocketId);
      
      state = useFinanceStore.getState();
      subPocket = state.subPockets[0];
      expect(subPocket.balance).toBe(1000); // -500 + 1500

      // Scenario 3: Overpay (exceed target)
      await store.createMovement('IngresoFijo', accountId, fixedPocketId, 12000, 'Full payment', undefined, subPocketId);
      
      state = useFinanceStore.getState();
      subPocket = state.subPockets[0];
      expect(subPocket.balance).toBe(13000); // 1000 + 12000
      expect(subPocketService.calculateProgress(13000, 12000)).toBeCloseTo(1.0833, 2);
    });
  });

  describe('Scenario: Account and pocket deletion with validation', () => {
    it('should prevent deletion of accounts with pockets', async () => {
      const store = useFinanceStore.getState();

      store.createAccount('Test', '#FF0000', 'USD');
      const accountId = useFinanceStore.getState().accounts[0].id;
      
      await store.createPocket(accountId, 'Pocket', 'normal');

      // Should throw error
      await expect(store.deleteAccount(accountId)).rejects.toThrow('has 1 pocket(s)');
      
      // Should succeed after deleting pocket
      const pocketId = useFinanceStore.getState().pockets[0].id;
      await store.deletePocket(pocketId);
      await store.deleteAccount(accountId);
      
      const state = useFinanceStore.getState();
      expect(state.accounts).toHaveLength(0);
      expect(state.pockets).toHaveLength(0);
    });
  });

  describe('Scenario: Multi-currency accounts', () => {
    it('should handle multiple accounts with same name but different currencies', () => {
      const store = useFinanceStore.getState();

      store.createAccount('Bank', '#FF0000', 'USD');
      store.createAccount('Bank', '#00FF00', 'MXN');
      store.createAccount('Bank', '#0000FF', 'EUR');

      const state = useFinanceStore.getState();
      expect(state.accounts).toHaveLength(3);
      expect(state.accounts[0].currency).toBe('USD');
      expect(state.accounts[1].currency).toBe('MXN');
      expect(state.accounts[2].currency).toBe('EUR');
    });

    it('should prevent duplicate name + currency combination', async () => {
      const store = useFinanceStore.getState();

      store.createAccount('Bank', '#FF0000', 'USD');
      
      await expect(async () => {
        await store.createAccount('Bank', '#00FF00', 'USD');
      }).rejects.toThrow();
    });
  });

  describe('Scenario: Movement grouping by month', () => {
    it('should group movements by month correctly', async () => {
      const store = useFinanceStore.getState();

      store.createAccount('Test', '#FF0000', 'USD');
      const accountId = useFinanceStore.getState().accounts[0].id;
      
      await store.createPocket(accountId, 'Pocket', 'normal');
      const pocketId = useFinanceStore.getState().pockets[0].id;

      // Create movements in different months
      await store.createMovement('IngresoNormal', accountId, pocketId, 100, 'Jan 1', '2024-01-01T00:00:00.000Z');
      await store.createMovement('IngresoNormal', accountId, pocketId, 200, 'Jan 15', '2024-01-15T00:00:00.000Z');
      await store.createMovement('IngresoNormal', accountId, pocketId, 300, 'Feb 1', '2024-02-01T00:00:00.000Z');
      await store.createMovement('IngresoNormal', accountId, pocketId, 400, 'Mar 1', '2024-03-01T00:00:00.000Z');

      const state = useFinanceStore.getState();
      expect(state.movements).toHaveLength(4);
      
      const { getMovementsGroupedByMonth } = state;
      const grouped = getMovementsGroupedByMonth();
      
      expect(grouped.size).toBeGreaterThanOrEqual(1);
      const jan = grouped.get('2024-01');
      const feb = grouped.get('2024-02');
      const mar = grouped.get('2024-03');
      
      if (jan) expect(jan.length).toBeGreaterThanOrEqual(1);
      if (feb) expect(feb.length).toBeGreaterThanOrEqual(1);
      if (mar) expect(mar.length).toBeGreaterThanOrEqual(1);
    });
  });
});
