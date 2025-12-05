import { useState, useEffect } from 'react';
import { useFixedExpenseGroupsQuery, useMovementTemplatesQuery, useSubPocketsQuery } from '../../hooks/queries';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import type { CreateReminderDTO, UpdateReminderDTO, Reminder, RecurrenceType, RecurrenceEndType } from '../../services/reminderService';

interface ReminderFormProps {
    initialData?: Reminder;
    onSubmit: (data: CreateReminderDTO | UpdateReminderDTO) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
];

const ReminderForm = ({
    initialData,
    onSubmit,
    onCancel,
    isSaving,
}: ReminderFormProps) => {
    const { data: subPockets = [] } = useSubPocketsQuery();
    const { data: templates = [] } = useMovementTemplatesQuery();
    const { data: fixedExpenseGroups = [] } = useFixedExpenseGroupsQuery();

    // Create a map of group names for display
    const groupMap = new Map(fixedExpenseGroups.map(g => [g.id, g.name]));

    // Filter only fixed expenses (those with a groupId)
    const allFixedExpenses = subPockets
        .filter((sp: any) => sp.groupId)
        .map((sp: any) => ({
            id: sp.id,
            name: `${groupMap.get(sp.groupId) || 'Unknown'} - ${sp.name}`,
            amount: sp.valueTotal || 0
        }));

    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        dueDate: new Date().toISOString().split('T')[0],
        recurrenceType: 'once' as RecurrenceType,
        recurrenceInterval: 1,
        recurrenceDaysOfWeek: [] as number[],
        recurrenceEndType: 'never' as RecurrenceEndType,
        recurrenceEndCount: 1,
        recurrenceEndDate: '',
        fixedExpenseId: '',
        templateId: '',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title,
                amount: initialData.amount.toString(),
                dueDate: new Date(initialData.dueDate).toISOString().split('T')[0],
                recurrenceType: initialData.recurrence.type,
                recurrenceInterval: initialData.recurrence.interval,
                recurrenceDaysOfWeek: initialData.recurrence.daysOfWeek || [],
                recurrenceEndType: initialData.recurrence.endType,
                recurrenceEndCount: initialData.recurrence.endCount || 1,
                recurrenceEndDate: initialData.recurrence.endDate ? new Date(initialData.recurrence.endDate).toISOString().split('T')[0] : '',
                fixedExpenseId: initialData.fixedExpenseId || '',
                templateId: initialData.templateId || '',
            });
        }
    }, [initialData]);

    // Handle fixed expense selection - auto-fill amount
    const handleFixedExpenseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setFormData(prev => ({ ...prev, fixedExpenseId: id }));

        if (id) {
            const expense = allFixedExpenses.find(exp => exp.id === id);
            if (expense && !formData.amount) {
                setFormData(prev => ({ ...prev, amount: expense.amount.toString() }));
            }
        }
    };

    // Handle template selection - auto-fill amount and title
    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setFormData(prev => ({ ...prev, templateId: id }));

        if (id) {
            const template = templates.find((t: any) => t.id === id);
            if (template) {
                setFormData(prev => ({
                    ...prev,
                    amount: template.defaultAmount?.toString() || prev.amount,
                    title: template.name || prev.title,
                }));
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleDayOfWeek = (day: number) => {
        setFormData(prev => ({
            ...prev,
            recurrenceDaysOfWeek: prev.recurrenceDaysOfWeek.includes(day)
                ? prev.recurrenceDaysOfWeek.filter(d => d !== day)
                : [...prev.recurrenceDaysOfWeek, day].sort()
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({
            title: formData.title,
            amount: parseFloat(formData.amount),
            dueDate: new Date(formData.dueDate).toISOString(),
            recurrence: {
                type: formData.recurrenceType,
                interval: formData.recurrenceInterval,
                daysOfWeek: formData.recurrenceType === 'weekly' ? formData.recurrenceDaysOfWeek : undefined,
                endType: formData.recurrenceEndType,
                endCount: formData.recurrenceEndType === 'after' ? formData.recurrenceEndCount : undefined,
                endDate: formData.recurrenceEndType === 'on_date' ? new Date(formData.recurrenceEndDate).toISOString() : undefined,
            },
            fixedExpenseId: formData.fixedExpenseId || undefined,
            templateId: formData.templateId || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
                    Basic Information
                </h3>

                <Input
                    type="text"
                    label="Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Rent payment"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        type="number"
                        label="Amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        step="0.01"
                        placeholder="0.00"
                    />

                    <Input
                        type="date"
                        label="Due Date"
                        name="dueDate"
                        value={formData.dueDate}
                        onChange={handleChange}
                        required
                    />
                </div>
            </div>

            {/* Recurrence Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
                    Recurrence
                </h3>

                <Select
                    label="Repeat"
                    name="recurrenceType"
                    value={formData.recurrenceType}
                    onChange={handleChange}
                    options={[
                        { value: 'once', label: 'Does not repeat' },
                        { value: 'daily', label: 'Daily' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'yearly', label: 'Yearly' },
                        { value: 'custom', label: 'Custom' },
                    ]}
                />

                {/* Custom Interval */}
                {formData.recurrenceType === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="number"
                            label="Every"
                            name="recurrenceInterval"
                            value={formData.recurrenceInterval}
                            onChange={handleChange}
                            min="1"
                            required
                        />
                        <Select
                            label="Period"
                            name="recurrenceType"
                            value={formData.recurrenceType}
                            onChange={handleChange}
                            options={[
                                { value: 'daily', label: 'Days' },
                                { value: 'weekly', label: 'Weeks' },
                                { value: 'monthly', label: 'Months' },
                                { value: 'yearly', label: 'Years' },
                            ]}
                        />
                    </div>
                )}

                {/* Weekly Day Selection */}
                {formData.recurrenceType === 'weekly' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Repeat on
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {DAYS_OF_WEEK.map(day => (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleDayOfWeek(day.value)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${formData.recurrenceDaysOfWeek.includes(day.value)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* End Condition */}
                {formData.recurrenceType !== 'once' && (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Ends
                        </label>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="recurrenceEndType"
                                    value="never"
                                    checked={formData.recurrenceEndType === 'never'}
                                    onChange={handleChange}
                                    className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Never</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="recurrenceEndType"
                                    value="after"
                                    checked={formData.recurrenceEndType === 'after'}
                                    onChange={handleChange}
                                    className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">After</span>
                                {formData.recurrenceEndType === 'after' && (
                                    <Input
                                        type="number"
                                        name="recurrenceEndCount"
                                        value={formData.recurrenceEndCount}
                                        onChange={handleChange}
                                        min="1"
                                        required
                                        className="w-20"
                                    />
                                )}
                                <span className="text-sm text-gray-700 dark:text-gray-300">occurrences</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="recurrenceEndType"
                                    value="on_date"
                                    checked={formData.recurrenceEndType === 'on_date'}
                                    onChange={handleChange}
                                    className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">On</span>
                                {formData.recurrenceEndType === 'on_date' && (
                                    <Input
                                        type="date"
                                        name="recurrenceEndDate"
                                        value={formData.recurrenceEndDate}
                                        onChange={handleChange}
                                        required
                                        className="flex-1"
                                    />
                                )}
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* Link Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
                    Link to Existing (Optional)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Fixed Expense"
                        name="fixedExpenseId"
                        value={formData.fixedExpenseId}
                        onChange={handleFixedExpenseChange}
                        options={[
                            { value: '', label: 'None' },
                            ...allFixedExpenses.map(e => ({ value: e.id, label: e.name }))
                        ]}
                    />

                    <Select
                        label="Template"
                        name="templateId"
                        value={formData.templateId}
                        onChange={handleTemplateChange}
                        options={[
                            { value: '', label: 'None' },
                            ...templates.map((t: any) => ({ value: t.id, label: t.name }))
                        ]}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onCancel}
                    disabled={isSaving}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : initialData ? 'Update Reminder' : 'Create Reminder'}
                </Button>
            </div>
        </form>
    );
};

export default ReminderForm;
