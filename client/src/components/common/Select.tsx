import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label, error, options, placeholder, className, ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-charcoal-100">
          {label}
          {props.required && <span className="text-gold-600 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          'input-dark w-full appearance-none',
          error && 'border-red-500/50',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-charcoal-600">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;
