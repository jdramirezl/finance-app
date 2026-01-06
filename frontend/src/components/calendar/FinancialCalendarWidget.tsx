import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useMovementsQuery, useAccountsQuery } from '../../hooks/queries';
import { currencyService } from '../../services/currencyService';
import type { Movement, Currency } from '../../types';
import Card from '../Card';
import Button from '../Button';

interface DayData {
  date: Date;
  income: number;
  expenses: number;
  movementCount: number;
}

interface FinancialCalendarWidgetProps {
  primaryCurrency?: Currency;
  className?: string;
}

const FinancialCalendarWidget = ({ 
  primaryCurrency = 'USD',
  className = '' 
}: FinancialCalendarWidgetProps) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get movements and accounts data
  const { data: movements = [] } = useMovementsQuery();
  const { data: accounts = [] } = useAccountsQuery();

  // Calculate date range for last 3 months
  const monthsToShow = useMemo(() => {
    const current = new Date();
    return [
      subMonths(current, 2),
      subMonths(current, 1),
      current
    ];
  }, []);

  // Create accounts map for quick lookup
  const accountsMap = useMemo(() => {
    const map = new Map();
    accounts.forEach(account => {
      map.set(account.id, account);
    });
    return map;
  }, [accounts]);

  // Process movements data by day
  const dailyData = useMemo(() => {
    const dataMap = new Map<string, DayData>();
    
    // Initialize all days in the 3-month range
    monthsToShow.forEach(month => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const days = eachDayOfInterval({ start, end });
      
      days.forEach(day => {
        const key = format(day, 'yyyy-MM-dd');
        dataMap.set(key, {
          date: day,
          income: 0,
          expenses: 0,
          movementCount: 0
        });
      });
    });

    // Process movements and aggregate by day (with currency conversion)
    movements.forEach((movement: Movement) => {
      if (movement.isPending || movement.isOrphaned) return;
      
      const dayKey = format(new Date(movement.displayedDate), 'yyyy-MM-dd');
      const existing = dataMap.get(dayKey);
      
      if (existing) {
        const isIncome = movement.type === 'IngresoNormal' || movement.type === 'IngresoFijo';
        
        // Get account to access currency
        const account = accountsMap.get(movement.accountId);
        const movementCurrency = account?.currency || primaryCurrency;
        
        // Convert amount to primary currency
        const convertedAmount = currencyService.convertAmount(
          movement.amount, 
          movementCurrency, 
          primaryCurrency
        );
        
        if (isIncome) {
          existing.income += convertedAmount;
        } else {
          existing.expenses += convertedAmount;
        }
        existing.movementCount += 1;
      }
    });

    return dataMap;
  }, [movements, monthsToShow, primaryCurrency, accountsMap]);

  // Get data for current month view
  const currentMonthData = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const key = format(day, 'yyyy-MM-dd');
      return dailyData.get(key) || {
        date: day,
        income: 0,
        expenses: 0,
        movementCount: 0
      };
    });
  }, [currentDate, dailyData]);

  // Calculate max values for scaling the visual indicators
  const maxValues = useMemo(() => {
    let maxIncome = 0;
    let maxExpenses = 0;
    
    dailyData.forEach(data => {
      maxIncome = Math.max(maxIncome, data.income);
      maxExpenses = Math.max(maxExpenses, data.expenses);
    });
    
    return { maxIncome, maxExpenses };
  }, [dailyData]);

  // Handle day click - navigate to movements page with date filter
  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    navigate(`/movements?date=${dateStr}`);
  };

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get intensity for visual indicators (0-1 scale)
  const getIntensity = (value: number, maxValue: number): number => {
    if (maxValue === 0) return 0;
    return Math.min(value / maxValue, 1);
  };

  // Get weekday names
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get first day of month and calculate grid start
  const firstDayOfMonth = startOfMonth(currentDate);
  const startingDayOfWeek = firstDayOfMonth.getDay();

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Financial Calendar
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-sm"
          >
            Today
          </Button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousMonth}
            className="p-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {format(currentDate, 'MMMM yyyy')}
          </h4>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            className="p-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="h-16" />
            ))}
            
            {/* Month days */}
            {currentMonthData.map((dayData) => {
              const isCurrentMonth = isSameMonth(dayData.date, currentDate);
              const isTodayDate = isToday(dayData.date);
              const hasActivity = dayData.movementCount > 0;
              
              const incomeIntensity = getIntensity(dayData.income, maxValues.maxIncome);
              const expenseIntensity = getIntensity(dayData.expenses, maxValues.maxExpenses);

              return (
                <button
                  key={format(dayData.date, 'yyyy-MM-dd')}
                  onClick={() => handleDayClick(dayData.date)}
                  className={`
                    h-16 p-1 rounded-lg border transition-all duration-200 relative
                    ${isCurrentMonth 
                      ? 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600' 
                      : 'border-transparent'
                    }
                    ${isTodayDate 
                      ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                      : ''
                    }
                    ${hasActivity 
                      ? 'hover:shadow-md cursor-pointer' 
                      : 'cursor-default'
                    }
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                  `}
                  disabled={!hasActivity}
                >
                  {/* Day number */}
                  <div className={`
                    text-sm font-medium mb-1
                    ${isTodayDate 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-900 dark:text-gray-100'
                    }
                  `}>
                    {format(dayData.date, 'd')}
                  </div>

                  {/* Financial indicators */}
                  {hasActivity && (
                    <div className="space-y-0.5">
                      {/* Income bar */}
                      {dayData.income > 0 && (
                        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all duration-300"
                            style={{ width: `${incomeIntensity * 100}%` }}
                          />
                        </div>
                      )}
                      
                      {/* Expense bar */}
                      {dayData.expenses > 0 && (
                        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 dark:bg-red-400 rounded-full transition-all duration-300"
                            style={{ width: `${expenseIntensity * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tooltip content (will be enhanced with actual tooltip library if needed) */}
                  {hasActivity && (
                    <div className="sr-only">
                      {dayData.income > 0 && `Income: ${currencyService.formatCurrency(dayData.income, primaryCurrency)}`}
                      {dayData.expenses > 0 && `Expenses: ${currencyService.formatCurrency(dayData.expenses, primaryCurrency)}`}
                      {`${dayData.movementCount} transaction${dayData.movementCount !== 1 ? 's' : ''}`}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-green-500 dark:bg-green-400 rounded-full" />
            <span>Income</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1 bg-red-500 dark:bg-red-400 rounded-full" />
            <span>Expenses</span>
          </div>
        </div>

        {/* Summary for current month */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            {format(currentDate, 'MMMM yyyy')} Summary
          </div>
          <div className="flex justify-center gap-4 mt-1">
            <div className="text-sm">
              <span className="text-green-600 dark:text-green-400 font-medium">
                +{currencyService.formatCurrency(
                  currentMonthData.reduce((sum, day) => sum + day.income, 0),
                  primaryCurrency
                )}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-red-600 dark:text-red-400 font-medium">
                -{currencyService.formatCurrency(
                  currentMonthData.reduce((sum, day) => sum + day.expenses, 0),
                  primaryCurrency
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default FinancialCalendarWidget;