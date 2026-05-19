import { cn } from '@/utils/cn';
import { STATUS_LABELS, STATUS_COLORS } from '@/utils/formatters';

interface BadgeProps {
  children?: React.ReactNode;
  status?: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'gold' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

const VARIANT_STYLES = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/30',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  gold: 'bg-gold-700/20 text-gold-400 border-gold-700/30',
  neutral: 'bg-charcoal-500/50 text-charcoal-100 border-charcoal-400/30',
};

export default function Badge({ children, status, variant, size = 'sm', className, dot }: BadgeProps) {
  const style = status
    ? STATUS_COLORS[status] || VARIANT_STYLES.neutral
    : variant
    ? VARIANT_STYLES[variant]
    : VARIANT_STYLES.neutral;

  const label = status ? (STATUS_LABELS[status] || status) : children;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span className={cn('badge-status border', style, sizeClass, className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}
