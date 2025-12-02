import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

const Select = ({
  label,
  error,
  helperText,
  options,
  className = '',
  id,
  ...props
}: SelectProps) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseStyles = 'w-full px-3 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 appearance-none bg-no-repeat bg-right pr-10';
  const normalStyles = 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400';
  const errorStyles = 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-gray-100 focus:border-red-500 dark:focus:border-red-400 focus:ring-red-500 dark:focus:ring-red-400';
  const disabledStyles = 'disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed';

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        <select
          id={selectId}
          className={`${baseStyles} ${error ? errorStyles : normalStyles} ${disabledStyles} ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

export default Select;
