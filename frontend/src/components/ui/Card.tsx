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
  const baseStyles = 'bg-surface-container/80 backdrop-blur-[12px] border border-white/[0.08] rounded-xl transition-all duration-200';

  const variantStyles: Record<CardVariant, string> = {
    default: '',
    interactive: 'cursor-pointer hover:bg-surface-container-high/80 hover:scale-[1.01]',
    highlighted: 'border-primary/40 bg-primary/5',
    danger: 'border-error/40 bg-error/5',
  };

  const hoverStyles = hover ? 'hover:bg-surface-container-high/80 hover:scale-[1.01]' : '';

  const paddings: Record<CardPadding, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
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
