import { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import Spinner from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  className,
  children,
  disabled,
  ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-gold-gradient text-charcoal-900 hover:shadow-gold hover:scale-[1.02] active:scale-[0.98] font-semibold',
    secondary: 'bg-charcoal-600 text-charcoal-50 border border-charcoal-400 hover:bg-charcoal-500 hover:border-charcoal-300',
    ghost: 'text-charcoal-100 hover:bg-charcoal-600 hover:text-charcoal-50',
    danger: 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25',
    outline: 'border border-gold-700 text-gold-400 hover:bg-gold-700/15',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
      {children}
      {iconRight && !loading && iconRight}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
