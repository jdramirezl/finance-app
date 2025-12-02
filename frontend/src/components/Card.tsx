import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const Card = ({
  children,
  padding = 'md',
  hover = false,
  className = '',
  ...props
}: CardProps) => {
  const baseStyles = 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm';
  const hoverStyles = hover ? 'transition-shadow hover:shadow-md' : '';
  
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`${baseStyles} ${hoverStyles} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
