import { useState, type FormEvent } from 'react';
import { Calendar, DollarSign, Percent, AlertTriangle } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import Input from '../Input';
import Select from '../Select';
import Button from '../Button';
import ColorSelector from '../ColorSelector';
import { currencyService } from '../../services/currencyService';
import { cdCalculationService } from '../../services/cdCalculationService';
import type { CDInvestmentAccount, Currency, CompoundingFrequency } from '../../types';

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
    currency: account?.currency || 'USD',
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

  // Calculate preview values
  const previewMaturityDate = formData.useCustomMaturityDate && formData.customMaturityDate 
    ? new Date(formData.customMaturityDate)
    : addMonths(new Date(), formData.termMonths);
  
  const previewCalculation = formData.principal > 0 && formData.interestRate > 0 && formData.termMonths > 0
    ? cdCalculationService.calculateCompoundInterest(
        formData.principal,
        formData.interestRate / 100,
        formData.termMonths * 30, // Approximate days
        formData.compoundingFrequency
      )
    : null;

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
      const selectedDate = new Date(formData.customMaturityDate);
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
    } catch (error) {
      console.error('Failed to save CD:', error);
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
            options={[
              { value: 'USD', label: 'USD - US Dollar' },
              { value: 'MXN', label: 'MXN - Mexican Peso' },
              { value: 'COP', label: 'COP - Colombian Peso' },
              { value: 'EUR', label: 'EUR - Euro' },
              { value: 'GBP', label: 'GBP - British Pound' },
            ]}
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
                  const selectedDate = new Date(e.target.value);
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

      {/* Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Preview
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Hide' : 'Show'} Preview
          </Button>
        </div>

        {showPreview && previewCalculation && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 dark:text-blue-300">Maturity Date:</span>
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  {format(previewMaturityDate, 'MMM dd, yyyy')}
                </div>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Total at Maturity:</span>
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  {currencyService.formatCurrency(previewCalculation.finalAmount, formData.currency)}
                </div>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Gross Interest:</span>
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  {currencyService.formatCurrency(previewCalculation.interestEarned, formData.currency)}
                </div>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">Effective Yield:</span>
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  {((previewCalculation.interestEarned / formData.principal) * 100).toFixed(2)}%
                </div>
              </div>
              {!!(formData.withholdingTaxRate && formData.withholdingTaxRate > 0) && (
                <>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">Withholding Tax:</span>
                    <div className="font-medium text-red-600 dark:text-red-400">
                      -{currencyService.formatCurrency(
                        previewCalculation.interestEarned * (formData.withholdingTaxRate / 100), 
                        formData.currency
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300">Net Interest:</span>
                    <div className="font-medium text-green-600 dark:text-green-400">
                      {currencyService.formatCurrency(
                        previewCalculation.interestEarned * (1 - (formData.withholdingTaxRate / 100)), 
                        formData.currency
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-blue-700 dark:text-blue-300">Net Amount at Maturity:</span>
                    <div className="font-bold text-green-600 dark:text-green-400 text-lg">
                      {currencyService.formatCurrency(
                        formData.principal + previewCalculation.interestEarned * (1 - (formData.withholdingTaxRate / 100)), 
                        formData.currency
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Warnings Section */}
      {/* Warning */}
      {!!(formData.earlyWithdrawalPenalty && formData.earlyWithdrawalPenalty > 0) && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Early Withdrawal Penalty:</strong> Withdrawing funds before maturity will result in a {formData.earlyWithdrawalPenalty}% penalty on interest earned.
          </div>
        </div>
      )}

      {/* Withholding Tax Warning */}
      {!!(formData.withholdingTaxRate && formData.withholdingTaxRate > 0) && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800 dark:text-red-200">
            <strong>Withholding Tax (Retención en la Fuente):</strong> The bank will withhold {formData.withholdingTaxRate}% of your interest earnings as tax. This amount will be deducted from your final payout.
          </div>
        </div>
      )}

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