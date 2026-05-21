import { useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import MovementTypeSelect, { MOVEMENT_TYPE_FILTER_ALL } from './MovementTypeSelect';
import { useAccountsQuery, usePocketsQuery } from '../../hooks/queries';
import { PREDEFINED_CATEGORIES } from '../../constants/categories';
import type { DateRangeOption, FilterTypeOption, ShowPendingOption } from '../../hooks/useMovementsFilter';
import type { Movement } from '../../types';

interface MovementFiltersProps {
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    movements: Movement[];
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
        category: string;
        tags: string[];
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
        setCategory: (value: string) => void;
        setTags: (value: string[]) => void;
    };
}

const MovementFilters = ({ showFilters, setShowFilters, movements, filters, setFilters }: MovementFiltersProps) => {
    const { data: accounts = [] } = useAccountsQuery();
    const { data: pockets = [] } = usePocketsQuery();

    // Collect unique categories from current movements (includes custom ones not in predefined list)
    const categoryOptions = useMemo(() => {
        const custom = new Set<string>();
        for (const m of movements) {
            if (m.category && !PREDEFINED_CATEGORIES.includes(m.category as typeof PREDEFINED_CATEGORIES[number])) {
                custom.add(m.category);
            }
        }
        return [
            { value: 'all', label: 'All Categories' },
            ...PREDEFINED_CATEGORIES.map(c => ({ value: c, label: c })),
            ...[...custom].sort().map(c => ({ value: c, label: c })),
        ];
    }, [movements]);

    // Collect unique tags from current movements
    const availableTags = useMemo(() => {
        const tagSet = new Set<string>();
        for (const m of movements) {
            if (m.tags) {
                for (const t of m.tags) tagSet.add(t);
            }
        }
        return [...tagSet].sort();
    }, [movements]);

    const clearFilters = () => {
        setFilters.setAccount('all');
        setFilters.setPocket('all');
        setFilters.setType(MOVEMENT_TYPE_FILTER_ALL);
        setFilters.setDateRange('all');
        setFilters.setDateFrom('');
        setFilters.setDateTo('');
        setFilters.setSearch('');
        setFilters.setMinAmount('');
        setFilters.setMaxAmount('');
        setFilters.setShowPending('all');
        setFilters.setCategory('all');
        setFilters.setTags([]);
    };

    const activeFiltersCount = [
        filters.account !== 'all',
        filters.pocket !== 'all',
        filters.type !== MOVEMENT_TYPE_FILTER_ALL,
        filters.dateRange !== 'all',
        filters.search !== '',
        filters.minAmount !== '',
        filters.maxAmount !== '',
        filters.showPending !== 'all',
        filters.category !== 'all',
        filters.tags.length > 0,
    ].filter(Boolean).length;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search movements..."
                        value={filters.search}
                        onChange={(e) => setFilters.setSearch(e.target.value)}
                        aria-label="Search movements"
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setShowFilters(!showFilters)}
                        className={showFilters || activeFiltersCount > 0 ? 'bg-primary/10 text-primary border-primary/30' : ''}
                        aria-expanded={showFilters}
                    >
                        <Filter className="w-5 h-5" aria-hidden="true" />
                        Filters
                        {activeFiltersCount > 0 && (
                            <span className="ml-2 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                                {activeFiltersCount}
                            </span>
                        )}
                    </Button>
                    {activeFiltersCount > 0 && (
                        <Button
                            variant="ghost"
                            onClick={clearFilters}
                            className="text-on-surface-variant hover:text-on-surface"
                            aria-label="Clear all filters"
                            title="Clear all filters"
                        >
                            <X className="w-5 h-5" aria-hidden="true" />
                        </Button>
                    )}
                </div>
            </div>

            {showFilters && (
                <div className="p-4 bg-surface-container/80 backdrop-blur-xl rounded-xl border border-white/[0.08] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            ...accounts.flatMap(acc => {
                                const accountPockets = pockets.filter(p =>
                                    (filters.account === 'all' || p.accountId === filters.account) &&
                                    p.accountId === acc.id
                                );

                                if (accountPockets.length === 0) return [];

                                return [{
                                    label: acc.name,
                                    options: accountPockets.map(p => ({ value: p.id, label: p.name }))
                                }];
                            })
                        ]}
                    />

                    <MovementTypeSelect
                        label="Type"
                        includeAll
                        value={filters.type}
                        onChange={setFilters.setType}
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
                                onChange={(e) => {
                                    const newFromDate = e.target.value;
                                    if (filters.dateTo && newFromDate && newFromDate > filters.dateTo) {
                                        setFilters.setDateTo(newFromDate);
                                    }
                                    setFilters.setDateFrom(newFromDate);
                                }}
                                max={filters.dateTo || undefined}
                            />
                            <Input
                                type="date"
                                label="To"
                                value={filters.dateTo}
                                onChange={(e) => {
                                    const newToDate = e.target.value;
                                    if (filters.dateFrom && newToDate && newToDate < filters.dateFrom) {
                                        setFilters.setDateFrom(newToDate);
                                    }
                                    setFilters.setDateTo(newToDate);
                                }}
                                min={filters.dateFrom || undefined}
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

                    <Select
                        label="Category"
                        value={filters.category}
                        onChange={(e) => setFilters.setCategory(e.target.value)}
                        options={categoryOptions}
                    />

                    {availableTags.length > 0 && (
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-on-surface-variant">
                                Tags
                            </label>
                            <div className="flex flex-wrap gap-1.5 p-2 border border-outline-variant rounded-xl bg-surface-container-highest min-h-[44px]">
                                {availableTags.map(tag => {
                                    const selected = filters.tags.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => {
                                                setFilters.setTags(
                                                    selected
                                                        ? filters.tags.filter(t => t !== tag)
                                                        : [...filters.tags, tag]
                                                );
                                            }}
                                            className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                                                selected
                                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                                    : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                                            }`}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MovementFilters;
