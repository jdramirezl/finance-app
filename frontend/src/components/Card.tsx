import type { ReactNode, HTMLAttributes } from 'react';

export type CardVariant = 'default' | 'interactive' | 'highlighted' | 'danger';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: CardPadding;
  variant?: CardVariant;
  hover?: boolean;
}

const Card = ({
  children,
  padding = 'md',
  variant = 'default',
  hover = false,
  className = '',
  ...props
}: CardProps) => {
  const baseStyles = 'bg-white dark:bg-gray-800 rounded-lg shadow-sm';

  const variantStyles: Record<CardVariant, string> = {
    default: 'border border-gray-200 dark:border-gray-700',
    interactive: 'border border-gray-200 dark:border-gray-700 cursor-pointer transition-all hover:border-gray-300 dark:hover:border-gray-600',
    highlighted: 'border-2 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20',
    danger: 'border-2 border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20',
  };

  const hoverStyles = hover ? 'transition-shadow hover:shadow-md' : '';

  const paddings: Record<CardPadding, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
