import { Filter, X } from 'lucide-react';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import { useAccountsQuery, usePocketsQuery } from '../../hooks/queries';
import type { DateRangeOption, FilterTypeOption, ShowPendingOption } from '../../hooks/useMovementsFilter';

interface MovementFiltersProps {
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    filters: {
        account: string;
        pocket: string;
        type: FilterTypeOption;
        dateRange: DateRangeOption;
        dateFrom: string;
        dateTo: string;
        search: string;
        minAmount: string;
        maxAmount: string;
        showPending: ShowPendingOption;
    };
    setFilters: {
        setAccount: (value: string) => void;
        setPocket: (value: string) => void;
        setType: (value: FilterTypeOption) => void;
        setDateRange: (value: DateRangeOption) => void;
        setDateFrom: (value: string) => void;
        setDateTo: (value: string) => void;
        setSearch: (value: string) => void;
        setMinAmount: (value: string) => void;
        setMaxAmount: (value: string) => void;
        setShowPending: (value: ShowPendingOption) => void;
    };
}

const MovementFilters = ({ showFilters, setShowFilters, filters, setFilters }: MovementFiltersProps) => {
    const { data: accounts = [] } = useAccountsQuery();
    const { data: pockets = [] } = usePocketsQuery();


    const clearFilters = () => {
        setFilters.setAccount('all');
        setFilters.setPocket('all');
        setFilters.setType('all');
        setFilters.setDateRange('all');
        setFilters.setDateFrom('');
        setFilters.setDateTo('');
        setFilters.setSearch('');
        setFilters.setMinAmount('');
        setFilters.setMaxAmount('');
        setFilters.setShowPending('all');
    };

    const activeFiltersCount = [
        filters.account !== 'all',
        filters.pocket !== 'all',
        filters.type !== 'all',
        filters.dateRange !== 'all',
        filters.search !== '',
        filters.minAmount !== '',
        filters.maxAmount !== '',
        filters.showPending !== 'all',
    ].filter(Boolean).length;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search movements..."
                        value={filters.search}
                        onChange={(e) => setFilters.setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setShowFilters(!showFilters)}
                        className={showFilters || activeFiltersCount > 0 ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' : ''}
                    >
                        <Filter className="w-5 h-5" />
                        Filters
                        {activeFiltersCount > 0 && (
                            <span className="ml-2 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs px-2 py-0.5 rounded-full">
                                {activeFiltersCount}
                            </span>
                        )}
                    </Button>
                    {activeFiltersCount > 0 && (
                        <Button
                            variant="ghost"
                            onClick={clearFilters}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    )}
                </div>
            </div>

            {showFilters && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Select
                        label="Status"
                        value={filters.showPending}
                        onChange={(e) => setFilters.setShowPending(e.target.value as ShowPendingOption)}
                        options={[
                            { value: 'all', label: 'All Statuses' },
                            { value: 'applied', label: 'Applied Only' },
                            { value: 'pending', label: 'Pending Only' },
                        ]}
                    />

                    <Select
                        label="Account"
                        value={filters.account}
                        onChange={(e) => setFilters.setAccount(e.target.value)}
                        options={[
                            { value: 'all', label: 'All Accounts' },
                            ...accounts.map(acc => ({ value: acc.id, label: acc.name }))
                        ]}
                    />

                    <Select
                        label="Pocket"
                        value={filters.pocket}
                        onChange={(e) => setFilters.setPocket(e.target.value)}
                        options={[
                            { value: 'all', label: 'All Pockets' },
                            ...pockets
                                .filter(p => filters.account === 'all' || p.accountId === filters.account)
                                .map(p => ({ value: p.id, label: p.name }))
                        ]}
                    />

                    <Select
                        label="Type"
                        value={filters.type}
                        onChange={(e) => setFilters.setType(e.target.value as FilterTypeOption)}
                        options={[
                            { value: 'all', label: 'All Types' },
                            { value: 'income', label: 'Income' },
                            { value: 'expense', label: 'Expense' },
                        ]}
                    />

                    <Select
                        label="Date Range"
                        value={filters.dateRange}
                        onChange={(e) => setFilters.setDateRange(e.target.value as DateRangeOption)}
                        options={[
                            { value: 'all', label: 'All Time' },
                            { value: '7days', label: 'Last 7 Days' },
                            { value: '30days', label: 'Last 30 Days' },
                            { value: '3months', label: 'Last 3 Months' },
                            { value: '6months', label: 'Last 6 Months' },
                            { value: 'year', label: 'Last Year' },
                            { value: 'custom', label: 'Custom Range' },
                        ]}
                    />

                    {filters.dateRange === 'custom' && (
                        <>
                            <Input
                                type="date"
                                label="From"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters.setDateFrom(e.target.value)}
                            />
                            <Input
                                type="date"
                                label="To"
                                value={filters.dateTo}
                                onChange={(e) => setFilters.setDateTo(e.target.value)}
                            />
                        </>
                    )}

                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Input
                                type="number"
                                label="Min Amount"
                                placeholder="0.00"
                                value={filters.minAmount}
                                onChange={(e) => setFilters.setMinAmount(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <Input
                                type="number"
                                label="Max Amount"
                                placeholder="∞"
                                value={filters.maxAmount}
                                onChange={(e) => setFilters.setMaxAmount(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovementFilters;
