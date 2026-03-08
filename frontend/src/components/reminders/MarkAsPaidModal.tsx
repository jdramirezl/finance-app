import { useState } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import { useMovementsQuery, useAccountsQuery } from '../../hooks/queries';
import { format, parseISO, isWithinInterval, addDays, subDays } from 'date-fns';
import { Check, Search, Link as LinkIcon, Wallet } from 'lucide-react';
import type { ReminderWithProjection } from '../../utils/reminderProjections';
import { currencyService } from '../../services/currencyService';

interface MarkAsPaidModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (movementId?: string) => void;
    reminder: ReminderWithProjection | null;
}

const MarkAsPaidModal = ({ isOpen, onClose, onConfirm, reminder }: MarkAsPaidModalProps) => {
    const { data: movements = [], isLoading: movementsLoading } = useMovementsQuery();
    const { data: accounts = [] } = useAccountsQuery();
    const [searchTerm, setSearchTerm] = useState('');

    if (!reminder) return null;

    const dueDateStr = reminder.dueDate.split('T')[0];
    const dueDate = parseISO(dueDateStr);
    const dateRange = {
        start: subDays(dueDate, 15),
        end: addDays(dueDate, 15)
    };

    const filteredMovements = movements
        .filter(m => {
            const mDateStr = m.displayedDate.split('T')[0];
            const mDate = parseISO(mDateStr);
            try {
                return isWithinInterval(mDate, dateRange);
            } catch (e) {
                return false;
            }
        })
        .filter(m => 
            m.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.amount.toString().includes(searchTerm)
        )
        .sort((a, b) => new Date(b.displayedDate).getTime() - new Date(a.displayedDate).getTime());

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Mark as Paid"
            size="md"
        >
            <div className="space-y-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                    <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase tracking-wider mb-1">
                        Reminder Details
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {reminder.title}
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            ${reminder.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Due: {format(dueDate, 'MMM dd, yyyy')}
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Option 1: Complete without linking
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        This will mark the reminder as paid but won't associate it with any transaction.
                    </p>
                    <Button
                        variant="primary"
                        onClick={() => onConfirm()}
                        className="w-full flex items-center justify-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        Just Mark as Paid
                    </Button>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        Option 2: Link to existing movement
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Associate this reminder with a transaction you already recorded manually.
                    </p>
                    
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search recent movements..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
                        {movementsLoading ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                <p className="text-sm text-gray-500">Loading your movements...</p>
                            </div>
                        ) : filteredMovements.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-500">
                                No movements found within ±15 days of the due date.
                            </div>
                        ) : (
                            filteredMovements.map(m => {
                                const account = accounts.find(a => a.id === m.accountId);
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => onConfirm(m.id)}
                                        className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center group"
                                    >
                                        <div className="min-w-0 flex-1 pr-2">
                                            <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 truncate">
                                                {m.notes || 'No description'}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                                                <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <Wallet className="w-2.5 h-2.5" />
                                                    {account?.name || 'Unknown Account'}
                                                </span>
                                                <span>•</span>
                                                <span>{format(parseISO(m.displayedDate.split('T')[0]), 'MMM dd, yyyy')}</span>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className={`font-bold ${m.type.includes('Ingreso') ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                {currencyService.formatCurrency(m.amount, account?.currency || 'USD')}
                                            </div>
                                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                                                Link this
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button variant="ghost" onClick={onClose} size="sm">
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default MarkAsPaidModal;
