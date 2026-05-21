import { useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import PeriodSelector, { computeRange } from '../components/reports/PeriodSelector';
import type { DateRange } from '../components/reports/PeriodSelector';
import SpendingByCategory from '../components/reports/SpendingByCategory';
import MonthlyTrend from '../components/reports/MonthlyTrend';
import CategoryTrend from '../components/reports/CategoryTrend';
import TopExpenses from '../components/reports/TopExpenses';

type TabKey = 'category' | 'monthly' | 'category-trend' | 'top-expenses';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'category', label: 'By Category' },
  { key: 'monthly', label: 'Monthly Trend' },
  { key: 'category-trend', label: 'Category Trend' },
  { key: 'top-expenses', label: 'Top Expenses' },
];

const ReportsPage = () => {
  const [dateRange, setDateRange] = useState<DateRange>(computeRange('this-month'));
  const [activeTab, setActiveTab] = useState<TabKey>('category');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        actions={<PeriodSelector value={dateRange} onChange={setDateRange} />}
      />

      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4 -mb-px">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <Card>
        {activeTab === 'category' && (
          <SpendingByCategory startDate={dateRange.startDate} endDate={dateRange.endDate} />
        )}
        {activeTab === 'monthly' && <MonthlyTrend months={6} />}
        {activeTab === 'category-trend' && <CategoryTrend />}
        {activeTab === 'top-expenses' && (
          <TopExpenses startDate={dateRange.startDate} endDate={dateRange.endDate} />
        )}
      </Card>
    </div>
  );
};

export default ReportsPage;
