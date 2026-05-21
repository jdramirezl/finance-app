import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, type, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const isNumeric = type === 'number';

    const baseStyles = 'w-full px-4 py-3 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant';
    const normalStyles = 'border-outline-variant focus:border-primary';
    const errorStyles = 'border-error focus:border-error focus:ring-error/20';
    const disabledStyles = 'disabled:opacity-50 disabled:cursor-not-allowed';

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
          >
            {label}
            {props.required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            className={`${baseStyles} ${error ? errorStyles : normalStyles} ${disabledStyles} ${isNumeric ? 'font-mono' : ''} ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';

export default Input;
