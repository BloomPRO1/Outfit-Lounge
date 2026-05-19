import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, icon, iconRight, hint, className, ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-charcoal-100">
          {label}
          {props.required && <span className="text-gold-600 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-200">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'input-dark w-full',
            icon && 'pl-10',
            iconRight && 'pr-10',
            error && 'border-red-500/50 focus:ring-red-500/50',
            className
          )}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-200">
            {iconRight}
          </div>
        )}
      </div>
      {hint && !error && <p className="text-xs text-charcoal-200">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
