import { cn } from '@/utils/cn';
import Button from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-charcoal-600 border border-charcoal-400 flex items-center justify-center text-charcoal-200 mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-charcoal-100 mb-2">{title}</h3>
      {description && <p className="text-sm text-charcoal-200 max-w-sm mb-5">{description}</p>}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
