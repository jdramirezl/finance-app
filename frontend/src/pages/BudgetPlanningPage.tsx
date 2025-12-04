import { useEffect, useState } from 'react';
import { useAccountsQuery, usePocketsQuery, useSubPocketsQuery, useSettingsQuery } from '../hooks/queries';
import { StorageService } from '../services/storageService';
import { currencyService } from '../services/currencyService';
import Input from '../components/Input';
import Card from '../components/Card';
import { Skeleton, SkeletonCard, SkeletonList } from '../components/Skeleton';
import type { Currency } from '../types';
import { BudgetSummaryCard, BudgetDistribution, type DistributionEntry } from '../components/budget';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { Receipt } from 'lucide-react';

const BudgetPlanningPage = () => {
  // Queries
  const { data: accounts = [] } = useAccountsQuery();
  const { data: pockets = [] } = usePocketsQuery();
  const { data: subPockets = [] } = useSubPocketsQuery();
  const { data: settings = { primaryCurrency: 'USD' }, isLoading: isSettingsLoading } = useSettingsQuery();

  // Load persisted data on mount
  const savedData = StorageService.getBudgetPlanning();
  const [initialAmount, setInitialAmount] = useState<number>(savedData.initialAmount || 0);
  const [distributionEntries, setDistributionEntries] = useState<DistributionEntry[]>(
    savedData.distributionEntries || []
  );
  const [convertedAmounts, setConvertedAmounts] = useState<Map<string, number>>(new Map());

  // Derived loading state
  const isLoading = isSettingsLoading;

  // Persist data whenever it changes
  useEffect(() => {
    StorageService.saveBudgetPlanning({
      initialAmount,
      distributionEntries,
    });
  }, [initialAmount, distributionEntries]);

  // Find fixed expenses pocket and calculate total monthly fixed expenses
  const fixedPocket = pockets.find((p) => p.type === 'fixed');
  const fixedSubPockets = fixedPocket ? subPockets.filter(sp => sp.pocketId === fixedPocket.id) : [];
  const fixedAccount = fixedPocket
    ? accounts.find((acc) => acc.id === fixedPocket.accountId)
    : null;

  const primaryCurrency = settings?.primaryCurrency || 'USD';
  const budgetCurrency = fixedAccount?.currency || 'USD';
  const showConversion = primaryCurrency !== budgetCurrency;

  // Calculate total monthly fixed expenses (using next payment logic for negative balances)
  const calculateTotalFijosMes = (): number => {
    return fixedSubPockets
      .filter((sp) => sp.enabled)
      .reduce((sum, sp) => {
        const aporteMensual = sp.valueTotal / sp.periodicityMonths;
        const remaining = sp.valueTotal - sp.balance;

        // Case 1: Negative balance - compensate + normal payment
        if (sp.balance < 0) {
          return sum + aporteMensual + Math.abs(sp.balance);
        }

        // Case 2: Near completion - min of remaining or normal payment
        if (remaining < aporteMensual) {
          return sum + remaining;
        }

        // Normal case
        return sum + aporteMensual;
      }, 0);
  };

  const totalFijosMes = calculateTotalFijosMes();
  const remaining = initialAmount - totalFijosMes;

  // Calculate amount for each distribution entry
  const calculateEntryAmount = (percentage: number): number => {
    if (remaining <= 0) return 0;
    return (remaining * percentage) / 100;
  };

  // Convert amounts to primary currency when needed
  useEffect(() => {
    const convertAmounts = async () => {
      if (!showConversion || distributionEntries.length === 0) return;

      const newConversions = new Map<string, number>();

      for (const entry of distributionEntries) {
        const amount = calculateEntryAmount(entry.percentage);
        if (amount > 0) {
          try {
            const converted = await currencyService.convert(
              amount,
              budgetCurrency as Currency,
              primaryCurrency as Currency
            );
            newConversions.set(entry.id, converted);
          } catch (err) {
            console.error('Failed to convert currency:', err);
          }
        }
      }

      setConvertedAmounts(newConversions);
    };

    convertAmounts();
  }, [distributionEntries, remaining, showConversion, budgetCurrency, primaryCurrency]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonList items={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Budget Planning" />

      {/* Initial Amount Input */}
      <Card padding="md">
        <Input
          label="Initial Amount"
          type="number"
          step="0.01"
          min="0"
          value={initialAmount || ''}
          onChange={(e) => setInitialAmount(parseFloat(e.target.value) || 0)}
          placeholder="Enter your total amount (e.g., salary)"
          helperText="Typically your monthly income or the amount you want to distribute"
          className="text-lg font-semibold"
        />
      </Card>

      {/* Calculation Summary */}
      {initialAmount > 0 && (
        <BudgetSummaryCard
          initialAmount={initialAmount}
          totalFixedExpenses={totalFijosMes}
          remaining={remaining}
          currency={budgetCurrency}
        />
      )}

      {/* Distribution Grid */}
      {remaining > 0 && (
        <BudgetDistribution
          entries={distributionEntries}
          remaining={remaining}
          currency={budgetCurrency}
          primaryCurrency={primaryCurrency}
          showConversion={showConversion}
          convertedAmounts={convertedAmounts}
          onEntriesChange={setDistributionEntries}
        />
      )}

      {/* Warning if no fixed expenses pocket */}
      {!fixedPocket && (
        <EmptyState
          icon={Receipt}
          title="No fixed expenses pocket found"
          description="Create one in the Accounts page to see fixed expenses deductions here."
        />
      )}
    </div>
  );
};

export default BudgetPlanningPage;
