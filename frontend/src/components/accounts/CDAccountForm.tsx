import { useState, type FormEvent } from 'react';
import { DollarSign, Percent } from 'lucide-react';
import { format } from 'date-fns';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import ColorSelector from '../ui/ColorSelector';
import { parseDate } from '../../utils/dateUtils';
import {
  CURRENCY_OPTIONS_WITH_NAMES,
  DEFAULT_CURRENCY,
} from '../../constants';
import type { CDInvestmentAccount, Currency, CompoundingFrequency } from '../../types';
import CDPreviewSection from './CDPreviewSection';
import CDWarningsSection from './CDWarningsSection';

interface CDAccountFormProps {
  account?: CDInvestmentAccount;
  onSubmit: (data: CDFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface CDFormData {
  name: string;
  color: string;
  currency: Currency;
  principal: number;
  interestRate: number;
  termMonths: number;
  compoundingFrequency: CompoundingFrequency;
  earlyWithdrawalPenalty?: number;
  withholdingTaxRate?: number;
  useCustomMaturityDate?: boolean;
  customMaturityDate?: string;
}

const CDAccountForm = ({ account, onSubmit, onCancel, isLoading = false }: CDAccountFormProps) => {
  const [formData, setFormData] = useState<CDFormData>({
    name: account?.name || '',
    color: account?.color || '#F59E0B', // Amber color for CDs
    currency: account?.currency || DEFAULT_CURRENCY,
    principal: account?.principal || 0,
    interestRate: account?.interestRate || 0,
    termMonths: account?.termMonths || 12,
    compoundingFrequency: account?.compoundingFrequency || 'monthly',
    earlyWithdrawalPenalty: account?.earlyWithdrawalPenalty,
    withholdingTaxRate: account?.withholdingTaxRate,
    useCustomMaturityDate: false,
    customMaturityDate: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CDFormData, string>>>({});
  const [showPreview, setShowPreview] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CDFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'CD name is required';
    }

    if (formData.principal <= 0) {
      newErrors.principal = 'Principal must be greater than 0';
    }

    if (formData.interestRate <= 0 || formData.interestRate > 100) {
      newErrors.interestRate = 'Interest rate must be between 0 and 100';
    }

    if (formData.termMonths <= 0 || formData.termMonths > 600) {
      newErrors.termMonths = 'Term must be between 1 and 600 months';
    }

    if (formData.useCustomMaturityDate && !formData.customMaturityDate) {
      newErrors.termMonths = 'Custom maturity date is required';
    }

    if (formData.useCustomMaturityDate && formData.customMaturityDate) {
      const selectedDate = parseDate(formData.customMaturityDate);
      const today = new Date();
      if (selectedDate <= today) {
        newErrors.termMonths = 'Maturity date must be in the future';
      }
    }

    if (formData.earlyWithdrawalPenalty && (formData.earlyWithdrawalPenalty < 0 || formData.earlyWithdrawalPenalty > 100)) {
      newErrors.earlyWithdrawalPenalty = 'Penalty must be between 0 and 100';
    }

    if (formData.withholdingTaxRate && (formData.withholdingTaxRate < 0 || formData.withholdingTaxRate > 100)) {
      newErrors.withholdingTaxRate = 'Withholding tax rate must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch {
      // Toast is shown by the mutation's onError handler.
    }
  };

  const handleInputChange = (field: keyof CDFormData, value: string | number | boolean | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          CD Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="CD Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g., 12-Month CD"
            error={errors.name}
            required
          />

          <Select
            label="Currency"
            value={formData.currency}
            onChange={(e) => handleInputChange('currency', e.target.value as Currency)}
            options={CURRENCY_OPTIONS_WITH_NAMES}
          />
        </div>

        <ColorSelector
          label="Color"
          value={formData.color}
          onChange={(color) => handleInputChange('color', color)}
          accountType="cd"
        />
      </div>

      {/* CD Terms */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Percent className="w-5 h-5" />
          CD Terms
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Principal Amount"
            type="number"
            value={formData.principal || ''}
            onChange={(e) => handleInputChange('principal', parseFloat(e.target.value) || 0)}
            placeholder="10000"
            min="0"
            step="0.01"
            error={errors.principal}
            required
          />

          <Input
            label="Annual Interest Rate (%)"
            type="number"
            value={formData.interestRate || ''}
            onChange={(e) => handleInputChange('interestRate', parseFloat(e.target.value) || 0)}
            placeholder="4.5"
            min="0"
            max="100"
            step="0.01"
            error={errors.interestRate}
            required
          />
        </div>

        {/* Term Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="termType"
                checked={!formData.useCustomMaturityDate}
                onChange={() => handleInputChange('useCustomMaturityDate', false)}
                className="text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Set term in months
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="termType"
                checked={formData.useCustomMaturityDate}
                onChange={() => handleInputChange('useCustomMaturityDate', true)}
                className="text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Set custom maturity date
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!formData.useCustomMaturityDate ? (
              <Input
                label="Term (Months)"
                type="number"
                value={formData.termMonths || ''}
                onChange={(e) => handleInputChange('termMonths', parseInt(e.target.value) || 0)}
                placeholder="12"
                min="1"
                max="600"
                error={errors.termMonths}
                required
              />
            ) : (
              <Input
                label="Maturity Date"
                type="date"
                value={formData.customMaturityDate}
                onChange={(e) => {
                  const selectedDate = parseDate(e.target.value);
                  const today = new Date();
                  const monthsDiff = Math.round((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

                  handleInputChange('customMaturityDate', e.target.value);
                  handleInputChange('termMonths', Math.max(1, monthsDiff));
                }}
                min={format(new Date(), 'yyyy-MM-dd')}
                error={errors.termMonths}
                required
                helperText={formData.customMaturityDate ? `Approximately ${formData.termMonths} months` : undefined}
              />
            )}

            <Select
              label="Compounding Frequency"
              value={formData.compoundingFrequency}
              onChange={(e) => handleInputChange('compoundingFrequency', e.target.value as CompoundingFrequency)}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'annually', label: 'Annually' },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Early Withdrawal Penalty (%)"
            type="number"
            value={formData.earlyWithdrawalPenalty !== undefined ? formData.earlyWithdrawalPenalty : ''}
            onChange={(e) => {
              const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
              handleInputChange('earlyWithdrawalPenalty', value);
            }}
            placeholder="3.0"
            min="0"
            max="100"
            step="0.1"
            error={errors.earlyWithdrawalPenalty}
            helperText="Percentage of interest earned that will be forfeited for early withdrawal"
          />

          <Input
            label="Withholding Tax Rate (%) - Retención en la Fuente"
            type="number"
            value={formData.withholdingTaxRate !== undefined ? formData.withholdingTaxRate : ''}
            onChange={(e) => {
              const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
              handleInputChange('withholdingTaxRate', value);
            }}
            placeholder="4.0"
            min="0"
            max="100"
            step="0.1"
            error={errors.withholdingTaxRate}
            helperText="Percentage of interest earnings that will be withheld by the bank as tax"
          />
        </div>
      </div>

      <CDPreviewSection
        principal={formData.principal}
        interestRate={formData.interestRate}
        termMonths={formData.termMonths}
        compoundingFrequency={formData.compoundingFrequency}
        currency={formData.currency}
        withholdingTaxRate={formData.withholdingTaxRate}
        useCustomMaturityDate={formData.useCustomMaturityDate}
        customMaturityDate={formData.customMaturityDate}
        showPreview={showPreview}
        onToggleShowPreview={() => setShowPreview(prev => !prev)}
      />

      <CDWarningsSection
        earlyWithdrawalPenalty={formData.earlyWithdrawalPenalty}
        withholdingTaxRate={formData.withholdingTaxRate}
      />

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Saving...' : account ? 'Update CD' : 'Create CD'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default CDAccountForm;
