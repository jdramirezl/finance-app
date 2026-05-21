import { forwardRef, type SelectHTMLAttributes } from 'react';

interface OptionGroup {
  label: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

type SelectOption = { value: string; label: string; disabled?: boolean };

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<SelectOption | OptionGroup>;
}

function isOptionGroup(option: SelectOption | OptionGroup): option is OptionGroup {
  return 'options' in option && Array.isArray(option.options);
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    const baseStyles = 'w-full px-4 py-3 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none bg-no-repeat bg-right pr-10 bg-surface-container-highest text-on-surface';
    const normalStyles = 'border-outline-variant focus:border-primary';
    const errorStyles = 'border-error focus:border-error focus:ring-error/20';
    const disabledStyles = 'disabled:opacity-50 disabled:cursor-not-allowed';

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
          >
            {label}
            {props.required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`${baseStyles} ${error ? errorStyles : normalStyles} ${disabledStyles} ${className}`}
            {...props}
          >
            {options.map((option, index) => {
              if (isOptionGroup(option)) {
                return (
                  <optgroup key={index} label={option.label}>
                    {option.options.map((subOption) => (
                      <option
                        key={subOption.value}
                        value={subOption.value}
                        disabled={subOption.disabled}
                      >
                        {subOption.label}
                      </option>
                    ))}
                  </optgroup>
                );
              }
              return (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              );
            })}
          </select>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {error && (
          <p className="text-sm text-error">{error}</p>
        )}

        {helperText && !error && (
          <p className="text-sm text-on-surface-variant">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
