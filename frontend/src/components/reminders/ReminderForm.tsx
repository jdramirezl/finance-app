import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useFixedExpenseGroupsQuery, useMovementTemplatesQuery, useSubPocketsQuery } from '../../hooks/queries';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { parseDate, toDateOnly } from '../../utils/dateUtils';
import type { CreateReminderDTO, UpdateReminderDTO, Reminder, RecurrenceType, RecurrenceEndType, RecurrencePeriod } from '../../services/reminderService';

interface ReminderFormProps {
    initialData?: Reminder;
    onSubmit: (data: CreateReminderDTO | UpdateReminderDTO) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}

interface ReminderFormValues {
    title: string;
    amount: string;
    dueDate: string;
    recurrenceType: RecurrenceType;
    recurrenceInterval: number;
    recurrenceDaysOfWeek: number[];
    recurrenceEndType: RecurrenceEndType;
    recurrenceEndCount: number;
    recurrenceEndDate: string;
    customPeriod: RecurrencePeriod;
    fixedExpenseId: string;
    templateId: string;
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

const getDefaultValues = (data?: Reminder): ReminderFormValues => {
    if (data) {
        return {
            title: data.title,
            amount: data.amount.toString(),
            dueDate: toDateOnly(data.dueDate),
            recurrenceType: data.recurrence.type,
            recurrenceInterval: data.recurrence.interval,
            recurrenceDaysOfWeek: data.recurrence.daysOfWeek || [],
            recurrenceEndType: data.recurrence.endType,
            recurrenceEndCount: data.recurrence.endCount || 1,
            recurrenceEndDate: data.recurrence.endDate ? toDateOnly(data.recurrence.endDate) : '',
            customPeriod: data.recurrence.customPeriod || 'monthly',
            fixedExpenseId: data.fixedExpenseId || '',
            templateId: data.templateId || '',
        };
    }
    return {
        title: '',
        amount: '',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        recurrenceType: 'once',
        recurrenceInterval: 1,
        recurrenceDaysOfWeek: [],
        recurrenceEndType: 'never',
        recurrenceEndCount: 1,
        recurrenceEndDate: '',
        customPeriod: 'monthly',
        fixedExpenseId: '',
        templateId: '',
    };
};

const ReminderForm = ({
    initialData,
    onSubmit,
    onCancel,
    isSaving,
}: ReminderFormProps) => {
    const { data: subPockets = [] } = useSubPocketsQuery();
    const { data: templates = [] } = useMovementTemplatesQuery();
    const { data: fixedExpenseGroups = [] } = useFixedExpenseGroupsQuery();

    const groupMap = new Map(fixedExpenseGroups.map(g => [g.id, g.name]));

    const allFixedExpenses = subPockets
        .filter((sp) => sp.groupId)
        .map((sp) => ({
            id: sp.id,
            name: `${groupMap.get(sp.groupId ?? '') || 'Unknown'} - ${sp.name}`,
            amount: sp.valueTotal || 0
        }));

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isDirty },
    } = useForm<ReminderFormValues>({
        mode: 'onBlur',
        defaultValues: getDefaultValues(initialData),
    });

    // Reset form when initialData changes (edit vs create switch)
    useEffect(() => {
        reset(getDefaultValues(initialData));
    }, [initialData, reset]);

    useUnsavedChanges(isDirty);

    const recurrenceType = watch('recurrenceType');
    const recurrenceEndType = watch('recurrenceEndType');
    const recurrenceDaysOfWeek = watch('recurrenceDaysOfWeek');

    // Auto-fill from fixed expense selection
    const handleFixedExpenseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setValue('fixedExpenseId', id, { shouldDirty: true });
        if (id) {
            const expense = allFixedExpenses.find(exp => exp.id === id);
            if (expense && !watch('amount')) {
                setValue('amount', expense.amount.toString(), { shouldDirty: true });
            }
        }
    };

    // Auto-fill from template selection
    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setValue('templateId', id, { shouldDirty: true });
        if (id) {
            const template = templates.find((t) => t.id === id);
            if (template) {
                if (template.defaultAmount) {
                    setValue('amount', template.defaultAmount.toString(), { shouldDirty: true });
                }
                if (template.name) {
                    setValue('title', template.name, { shouldDirty: true });
                }
            }
        }
    };

    const toggleDayOfWeek = (day: number) => {
        const current = recurrenceDaysOfWeek;
        const updated = current.includes(day)
            ? current.filter(d => d !== day)
            : [...current, day].sort();
        setValue('recurrenceDaysOfWeek', updated, { shouldDirty: true, shouldValidate: true });
    };

    const onFormSubmit = (data: ReminderFormValues) => {
        return onSubmit({
            title: data.title,
            amount: parseFloat(data.amount),
            dueDate: parseDate(data.dueDate).toISOString(),
            recurrence: {
                type: data.recurrenceType,
                interval: data.recurrenceInterval,
                daysOfWeek: data.recurrenceType === 'weekly' ? data.recurrenceDaysOfWeek : undefined,
                endType: data.recurrenceEndType,
                endCount: data.recurrenceEndType === 'after' ? data.recurrenceEndCount : undefined,
                endDate: data.recurrenceEndType === 'on_date' ? parseDate(data.recurrenceEndDate).toISOString() : undefined,
                customPeriod: data.recurrenceType === 'custom' ? data.customPeriod : undefined,
            },
            fixedExpenseId: data.fixedExpenseId || undefined,
            templateId: data.templateId || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
                    Basic Information
                </h3>

                <Input
                    type="text"
                    label="Title"
                    placeholder="e.g., Rent payment"
                    required
                    error={errors.title?.message}
                    {...register('title', { required: 'Title is required' })}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        type="number"
                        label="Amount"
                        step="0.01"
                        placeholder="0.00"
                        required
                        error={errors.amount?.message}
                        {...register('amount', {
                            required: 'Amount is required',
                            validate: (v) => parseFloat(v) >= 0.01 || 'Minimum amount is 0.01',
                        })}
                    />

                    <Input
                        type="date"
                        label="Due Date"
                        required
                        error={errors.dueDate?.message}
                        {...register('dueDate', { required: 'Due date is required' })}
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
                    {...register('recurrenceType')}
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
                {recurrenceType === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            type="number"
                            label="Every"
                            min="1"
                            required
                            error={errors.recurrenceInterval?.message}
                            {...register('recurrenceInterval', {
                                required: 'Interval is required',
                                min: { value: 1, message: 'Minimum is 1' },
                                valueAsNumber: true,
                            })}
                        />
                        <Select
                            label="Period"
                            {...register('customPeriod')}
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
                {recurrenceType === 'weekly' && (
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
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${recurrenceDaysOfWeek.includes(day.value)
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
                {recurrenceType !== 'once' && (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Ends
                        </label>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value="never"
                                    {...register('recurrenceEndType')}
                                    className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Never</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value="after"
                                    {...register('recurrenceEndType')}
                                    className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">After</span>
                                {recurrenceEndType === 'after' && (
                                    <Input
                                        type="number"
                                        min="1"
                                        required
                                        className="w-20"
                                        error={errors.recurrenceEndCount?.message}
                                        {...register('recurrenceEndCount', {
                                            required: 'Required',
                                            min: { value: 1, message: 'Min 1' },
                                            valueAsNumber: true,
                                        })}
                                    />
                                )}
                                <span className="text-sm text-gray-700 dark:text-gray-300">occurrences</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value="on_date"
                                    {...register('recurrenceEndType')}
                                    className="text-blue-600"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">On</span>
                                {recurrenceEndType === 'on_date' && (
                                    <Input
                                        type="date"
                                        required
                                        className="flex-1"
                                        error={errors.recurrenceEndDate?.message}
                                        {...register('recurrenceEndDate', {
                                            required: 'End date is required',
                                        })}
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
                        value={watch('fixedExpenseId')}
                        onChange={handleFixedExpenseChange}
                        options={[
                            { value: '', label: 'None' },
                            ...allFixedExpenses.map(e => ({ value: e.id, label: e.name }))
                        ]}
                    />

                    <Select
                        label="Template"
                        value={watch('templateId')}
                        onChange={handleTemplateChange}
                        options={[
                            { value: '', label: 'None' },
                            ...templates.map((t) => ({ value: t.id, label: t.name }))
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
