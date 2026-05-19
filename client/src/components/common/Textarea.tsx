import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label, error, className, rows = 3, ...props
}, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sm font-medium text-charcoal-100">{label}</label>}
    <textarea
      ref={ref}
      rows={rows}
      className={cn('input-dark w-full resize-none', error && 'border-red-500/50', className)}
      {...props}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
));

Textarea.displayName = 'Textarea';
export default Textarea;
